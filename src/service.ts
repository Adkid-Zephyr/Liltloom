/** DSH-native style memory service and quiet observation coordinator. */

import { randomUUID } from 'node:crypto'
import type { Context } from '@deepseek-ai/cordis'
import { Service } from '@deepseek-ai/cordis'
import z from '@deepseek-ai/schemastery'
import type { Agent } from '@deepseek-ai/dsh-agent'
import { SessionId } from '@deepseek-ai/dsh-session'
import type { Session, SessionEvent, UserMessage } from '@deepseek-ai/dsh-session'
import type { Context as ToolContext } from '@deepseek-ai/cordis'
import { analyzeStyle } from './analyzer.js'
import { compileStyle } from './compiler.js'
import {
  containsLikelySecret,
  estimateTokens,
  extractFeatures,
  nativeProseEligibility,
  textFromBlocks,
} from './features.js'
import { portableStyleMemorySchema } from './schemas.js'
import { StyleMemoryStore } from './store.js'
import type {
  ActivationSet,
  CompileStyleRequest,
  InvocationMode,
  PortableStyleMemory,
  PreferenceAtom,
  ProfileScope,
  Register,
  StyleContextPacket,
  StyleMemorySettings,
  StyleMemoryStatus,
  StyleQuery,
} from './types.js'
import { installStyleContextTool } from './tool.js'
import { installStyleMemoryCommand } from './command.js'
import { installStyleMemoryRpc } from './rpc.js'

declare module '@deepseek-ai/cordis' {
  interface Context {
    styleMemory: StyleMemory
  }
}

/** Deployment configuration; user-mutated settings persist separately. */
export interface Config {
  observationEnabled: boolean
  invocationMode: InvocationMode
  modelToolEnabled: boolean
  deepStyleEnabled: boolean
  analysisEnabled: boolean
  analysisProvider: string
  analysisModel: string
  analysisMaxCallsPerDay: number
  analysisMaxInputTokensPerDay: number
  analysisMaxOutputTokensPerDay: number
  analysisMaxOutputTokensPerCall: number
  analysisBatchMessages: number
  analysisMaxBatchChars: number
  analysisFlushIntervalMs: number
  analysisTimeoutMs: number
  analysisMaxRetries: number
  analysisRetryBackoffMs: number
  contextMaxTokens: number
}

export const Config: z<Config> = z.object({
  observationEnabled: z.boolean().default(true),
  invocationMode: z.union(['disabled', 'explicit', 'configured-auto']).default('explicit'),
  modelToolEnabled: z.boolean().default(false),
  deepStyleEnabled: z.boolean().default(false),
  analysisEnabled: z.boolean().default(false),
  analysisProvider: z.string().default(''),
  analysisModel: z.string().default(''),
  analysisMaxCallsPerDay: z.number().step(1).min(0).default(20),
  analysisMaxInputTokensPerDay: z.number().step(1).min(0).default(50000),
  analysisMaxOutputTokensPerDay: z.number().step(1).min(0).default(6000),
  analysisMaxOutputTokensPerCall: z.number().step(1).min(1).max(10000).default(600),
  analysisBatchMessages: z.number().step(1).min(1).max(100).default(6),
  analysisMaxBatchChars: z.number().step(1).min(100).max(100000).default(8000),
  analysisFlushIntervalMs: z.number().step(1).min(0).max(86400000).default(30000),
  analysisTimeoutMs: z.number().step(1).min(1).max(3600000).default(60000),
  analysisMaxRetries: z.number().step(1).min(0).max(10).default(1),
  analysisRetryBackoffMs: z.number().step(1).min(0).max(86400000).default(60000),
  contextMaxTokens: z.number().step(1).min(100).max(10000).default(1200),
})

interface WorkItem {
  session: Session
  event: Extract<SessionEvent, { type: 'user/message' }>
}

const STYLE_OPT_OUT = /(?:不要|别|停止|关闭|忽略).{0,8}(?:我的)?(?:写作)?风格|(?:do not|don't|stop|disable|ignore).{0,16}(?:my )?style/iu
const STYLE_EXPLICIT = /(?:模仿|使用|按照|参考|像).{0,10}(?:我的|我).{0,6}(?:写作)?风格|(?:write|sound).{0,12}(?:like|in).{0,12}(?:me|my style)|style[_ -]?context/iu

function defaultSettings(config: Config): StyleMemorySettings {
  const now = new Date().toISOString()
  return {
    schemaVersion: 1,
    observationState: config.observationEnabled ? 'learning' : 'off',
    invocationMode: config.invocationMode,
    modelToolEnabled: config.modelToolEnabled,
    autoWorkspaceGlobs: [],
    deepStyleEnabled: config.deepStyleEnabled,
    deepStyleConsentVersion: config.deepStyleEnabled ? 1 : null,
    deepStyleRetentionDays: 90,
    deepStyleMaxExcerptChars: 1200,
    deepStyleMaxRecords: 200,
    deepStyleMaxTotalChars: 240000,
    analysisEnabled: config.analysisEnabled,
    analysisConsentVersion: config.analysisEnabled ? 1 : null,
    allowSelfContextInCompilation: false,
    updatedAt: now,
  }
}

function escapeRegex(value: string): string {
  return value.replace(/[|\\{}()[\]^$+?.]/gu, '\\$&')
}

function globMatches(glob: string, value: string): boolean {
  const expression = `^${escapeRegex(glob).replace(/\*/gu, '.*')}$`
  return new RegExp(expression, 'u').test(value)
}

function todayUtc(): string {
  return new Date().toISOString().slice(0, 10)
}

function textOfMessage(message: UserMessage): string | undefined {
  return textFromBlocks(message.content)
}

/** Quiet style-memory service registered as `ctx.styleMemory`. */
export default class StyleMemory extends Service {
  static inject = ['storageDomain', 'sessions', 'systemPrompt']
  static Config: z<Config> = Config

  private store?: StyleMemoryStore
  private accepting = true
  private readonly work: WorkItem[] = []
  private workPromise: Promise<void> | undefined
  private readonly analysisSamples: string[] = []
  private analysisPromise: Promise<void> | undefined
  private analysisTimer: ReturnType<typeof setTimeout> | undefined
  private analysisFailures = 0
  private analysisRetryAfter = 0
  private readonly shutdown = new AbortController()
  private toolContext: ToolContext | undefined
  private toolDisposer: (() => void) | undefined
  private readonly optOutBySession = new Map<string, Set<string>>()
  private readonly consumingNextResponse = new Set<string>()

  constructor(ctx: Context, public readonly config: Config) {
    super(ctx, 'styleMemory')
    if (config.analysisEnabled && (config.analysisProvider.length === 0 || config.analysisModel.length === 0)) {
      throw new Error('style-memory: analysisEnabled requires analysisProvider and analysisModel')
    }
  }

  protected async [Service.init](): Promise<void> {
    this.store = await StyleMemoryStore.open(this.ctx, defaultSettings(this.config))
    this.ctx.effect(() => () => this.requireStore().close(), 'styleMemory.domainClose')
    this.ctx.effect(() => async () => {
      this.accepting = false
      this.shutdown.abort(new Error('style-memory disposed'))
      if (this.analysisTimer !== undefined) clearTimeout(this.analysisTimer)
      await this.flush()
    }, 'styleMemory.drain')

    this.installObservation()
    this.installRuntimeContext()
    this.installOptionalConsumers()
    await this.requireStore().pruneExpiredExemplars()
    for (const session of this.ctx.sessions.list()) this.scanSession(session)
  }

  private installObservation(): void {
    this.ctx.on('session/created', (session) => { this.scanSession(session) }, { global: true })
    this.ctx.on('session/event', (session, event) => {
      if (event.type === 'user/message') this.enqueue({ session, event })
      if (event.type === 'turn/end') {
        const sessionId = String(session.id)
        this.optOutBySession.delete(sessionId)
        const activation = this.requireStore().getActivation(sessionId)
        if (activation?.status === 'active' && activation.scope === 'next-response') {
          // session/event is synchronous but storage-domain commits are queued.
          // Suppress the just-consumed snapshot immediately so a new turn cannot
          // race ahead of the durable status write.
          this.consumingNextResponse.add(sessionId)
          void this.requireStore().consumeNextResponse(sessionId).then(
            () => { this.consumingNextResponse.delete(sessionId) },
            (error: unknown) => {
              this.ctx.logger.warn(`style-memory: failed to persist consumed activation for ${sessionId}: ${String(error)}`)
            },
          )
        }
      }
    }, { global: true })
    this.ctx.on('agent/inbox/inserted', ({ agent, message }) => {
      const text = textOfMessage(message)
      if (text === undefined || !STYLE_OPT_OUT.test(text)) return
      const sessionId = String(agent.session.id)
      const ids = this.optOutBySession.get(sessionId) ?? new Set<string>()
      ids.add(String(message.id))
      this.optOutBySession.set(sessionId, ids)
    }, { global: true })
    this.ctx.on('agent/inbox/discarded', ({ agent, message }) => {
      const ids = this.optOutBySession.get(String(agent.session.id))
      ids?.delete(String(message.id))
      if (ids?.size === 0) this.optOutBySession.delete(String(agent.session.id))
    }, { global: true })
  }

  private installRuntimeContext(): void {
    this.ctx.systemPrompt.context({
      name: 'style-memory',
      order: 70,
      text: context => {
        const agent = context.agent
        if (agent === undefined) return ''
        const sessionId = String(agent.session.id)
        if ((this.optOutBySession.get(sessionId)?.size ?? 0) > 0) return ''
        const settings = this.requireStore().getSettings()
        if (settings.invocationMode === 'disabled') return ''
        const activation = this.requireStore().getActivation(sessionId)
        if (activation?.status === 'active' && !this.consumingNextResponse.has(sessionId)) return activation.packet.renderedContext
        const workspace = agent.session.header.cwd
        if (settings.invocationMode !== 'configured-auto' || workspace === undefined) return ''
        if (!settings.autoWorkspaceGlobs.some(glob => globMatches(glob, workspace))) return ''
        const packet = this.compile({ workspace, depth: settings.deepStyleEnabled ? 'deep' : 'basic' })
        return packet.selectedPreferenceIds.length === 0 && packet.exemplars === undefined ? '' : packet.renderedContext
      },
    })
  }

  private installOptionalConsumers(): void {
    this.ctx.inject(['commands'], (consumerCtx) => {
      installStyleMemoryCommand(consumerCtx, this)
    })
    this.ctx.inject(['tools'], (consumerCtx) => {
      this.toolContext = consumerCtx
      this.syncToolRegistration()
      consumerCtx.effect(() => () => {
        this.toolDisposer?.()
        this.toolDisposer = undefined
        this.toolContext = undefined
      }, 'styleMemory.toolHost')
    })
    this.ctx.inject(['connection'], (consumerCtx) => {
      installStyleMemoryRpc(consumerCtx, this)
    })
  }

  private syncToolRegistration(): void {
    const enabled = this.store?.getSettings().modelToolEnabled === true
    if (enabled && this.toolDisposer === undefined && this.toolContext !== undefined) {
      this.toolDisposer = installStyleContextTool(this.toolContext, this)
    } else if (!enabled && this.toolDisposer !== undefined) {
      this.toolDisposer()
      this.toolDisposer = undefined
    }
  }

  private scanSession(session: Session): void {
    if (session.header.origin === 'subagent') return
    const watermark = this.requireStore().getWatermark(String(session.id))?.throughSeq ?? -1
    for (const event of session.events) {
      if (event.seq > watermark && event.type === 'user/message') this.enqueue({ session, event })
    }
  }

  private enqueue(item: WorkItem): void {
    if (!this.accepting || item.session.header.origin === 'subagent') return
    const watermark = this.requireStore().getWatermark(String(item.session.id))?.throughSeq ?? -1
    if (item.event.seq <= watermark) return
    if (this.work.some(queued => queued.session.id === item.session.id && queued.event.seq === item.event.seq)) return
    this.work.push(item)
    this.workPromise ??= Promise.resolve().then(() => this.runWork())
  }

  private async runWork(): Promise<void> {
    try {
      while (this.work.length > 0) {
        const item = this.work.shift()
        if (item === undefined) break
        try {
          await this.process(item)
        } catch (error) {
          this.ctx.logger.warn(`style-memory: failed to process session ${String(item.session.id)} seq ${item.event.seq}: ${String(error)}`)
        }
      }
    } finally {
      this.workPromise = undefined
      if (this.work.length > 0) this.workPromise = Promise.resolve().then(() => this.runWork())
    }
  }

  private async process(item: WorkItem): Promise<void> {
    const store = this.requireStore()
    const sessionId = String(item.session.id)
    const watermark = store.getWatermark(sessionId)?.throughSeq ?? -1
    if (item.event.seq <= watermark) return
    const settings = store.getSettings()
    const message = item.event.data
    if (settings.observationState !== 'learning' || message.source.kind !== 'user') {
      await store.setWatermark(sessionId, item.event.seq)
      return
    }
    const text = textOfMessage(message)
    if (text === undefined) {
      await store.setWatermark(sessionId, item.event.seq)
      return
    }
    const eligibility = nativeProseEligibility(text)
    if (!eligibility.eligible) {
      await store.setWatermark(sessionId, item.event.seq)
      return
    }
    const sample = extractFeatures(text)
    const scopes: ProfileScope[] = [{ kind: 'global' }]
    if (item.session.header.cwd !== undefined) scopes.push({ kind: 'workspace', workspace: item.session.header.cwd })
    for (const scope of scopes) await store.addSample(scope, sample)

    if (settings.deepStyleEnabled && !containsLikelySecret(text) && text.length >= 100) {
      const scope: ProfileScope = item.session.header.cwd === undefined
        ? { kind: 'global' }
        : { kind: 'workspace', workspace: item.session.header.cwd }
      await store.retainExemplar(scope, sample, settings)
    }
    if (settings.analysisEnabled && !containsLikelySecret(text)) this.queueAnalysis(text)
    await store.setWatermark(sessionId, item.event.seq)
  }

  private queueAnalysis(text: string): void {
    const bounded = text.slice(0, this.config.analysisMaxBatchChars)
    this.analysisSamples.push(bounded)
    while (this.analysisSamples.reduce((sum, sample) => sum + sample.length, 0) > this.config.analysisMaxBatchChars) {
      this.analysisSamples.shift()
    }
    if (this.analysisSamples.length >= this.config.analysisBatchMessages) {
      void this.startAnalysis()
      return
    }
    if (this.analysisTimer === undefined) {
      this.analysisTimer = setTimeout(() => {
        this.analysisTimer = undefined
        void this.startAnalysis()
      }, this.config.analysisFlushIntervalMs)
    }
  }

  private async startAnalysis(): Promise<void> {
    if (this.analysisPromise !== undefined || this.analysisSamples.length === 0) return this.analysisPromise
    if (this.analysisFailures > this.config.analysisMaxRetries) return
    if (Date.now() < this.analysisRetryAfter) return
    const provider = this.config.analysisProvider
    const model = this.config.analysisModel
    if (provider.length === 0 || model.length === 0 || this.ctx.get('llm') === undefined) return
    const period = todayUtc()
    const ledger = this.requireStore().getResourceLedger(period)
    const batch = this.analysisSamples.slice(0, this.config.analysisBatchMessages)
    const inputTokens = estimateTokens(batch.join('\n\n'))
    if ((ledger?.calls ?? 0) >= this.config.analysisMaxCallsPerDay
      || (ledger?.inputTokens ?? 0) + inputTokens > this.config.analysisMaxInputTokensPerDay
      || (ledger?.outputTokens ?? 0) >= this.config.analysisMaxOutputTokensPerDay) return
    const maxOutputTokens = Math.min(
      this.config.analysisMaxOutputTokensPerCall,
      this.config.analysisMaxOutputTokensPerDay - (ledger?.outputTokens ?? 0),
    )
    if (maxOutputTokens < 1) return
    if (this.analysisTimer !== undefined) {
      clearTimeout(this.analysisTimer)
      this.analysisTimer = undefined
    }
    this.analysisPromise = (async () => {
      try {
        // Reserve the attempt before transport so provider failures still consume
        // the daily call/input envelope instead of creating a free retry loop.
        await this.requireStore().recordResource(period, inputTokens, 0)
        const signal = AbortSignal.any([this.shutdown.signal, AbortSignal.timeout(this.config.analysisTimeoutMs)])
        const result = await analyzeStyle(this.ctx, { provider, model, maxOutputTokens }, batch, signal)
        for (const observation of result.observations) {
          await this.requireStore().mergeModelObservation(
            observation.category,
            observation.register,
            observation.statement,
            observation.confidence,
          )
        }
        const usage = result.usage
        await this.requireStore().recordResourceUsage(
          period,
          usage === undefined ? 0 : Math.max(0, usage.inputTokens + (usage.cacheReadTokens ?? 0) + (usage.cacheWriteTokens ?? 0) - inputTokens),
          usage?.outputTokens ?? 0,
        )
        this.analysisSamples.splice(0, batch.length)
        this.analysisFailures = 0
        this.analysisRetryAfter = 0
      } catch (error) {
        if (!this.shutdown.signal.aborted) {
          this.analysisFailures += 1
          this.analysisRetryAfter = Date.now() + this.config.analysisRetryBackoffMs
          this.ctx.logger.warn(`style-memory: analysis paused after provider failure: ${String(error)}`)
          if (this.analysisFailures <= this.config.analysisMaxRetries && this.analysisTimer === undefined) {
            this.analysisTimer = setTimeout(() => {
              this.analysisTimer = undefined
              void this.startAnalysis()
            }, this.config.analysisRetryBackoffMs)
          }
        }
      } finally {
        this.analysisPromise = undefined
      }
    })()
    return this.analysisPromise
  }

  /** Await all accepted deterministic work and the currently running analysis call. */
  async flush(): Promise<void> {
    while (this.workPromise !== undefined) await this.workPromise
    if (!this.shutdown.signal.aborted && this.analysisSamples.length > 0 && this.getSettings().analysisEnabled) {
      await this.startAnalysis()
    }
    if (this.analysisPromise !== undefined) await this.analysisPromise
  }

  getSettings(): StyleMemorySettings {
    return this.requireStore().getSettings()
  }

  async updateSettings(patch: Partial<Omit<StyleMemorySettings, 'schemaVersion' | 'updatedAt'>>): Promise<StyleMemorySettings> {
    const current = this.getSettings()
    if (patch.analysisEnabled === true && (this.config.analysisProvider.length === 0 || this.config.analysisModel.length === 0)) {
      throw new Error('No analysis route is configured; set analysisProvider and analysisModel in the plugin config first.')
    }
    const next: StyleMemorySettings = {
      ...current,
      ...patch,
      ...(patch.deepStyleEnabled === true && current.deepStyleConsentVersion === null
        ? { deepStyleConsentVersion: 1 } : {}),
      ...(patch.analysisEnabled === true && current.analysisConsentVersion === null
        ? { analysisConsentVersion: 1 } : {}),
      updatedAt: new Date().toISOString(),
    }
    await this.requireStore().setSettings(next)
    if (patch.modelToolEnabled !== undefined) this.syncToolRegistration()
    if (patch.analysisEnabled === true) this.analysisFailures = 0
    return next
  }

  status(): StyleMemoryStatus {
    const store = this.requireStore()
    const periodStart = todayUtc()
    const resource = store.getResourceLedger(periodStart)
    return {
      settings: store.getSettings(),
      profileRevision: store.profileRevision(),
      preferences: store.listPreferences().length,
      exemplars: store.listExemplars().length,
      learnedMessages: store.learnedMessageCount(),
      ...(this.config.analysisProvider.length === 0 || this.config.analysisModel.length === 0
        ? {} : { analysisRoute: { provider: this.config.analysisProvider, model: this.config.analysisModel } }),
      analysisResource: {
        periodStart,
        calls: resource?.calls ?? 0,
        inputTokens: resource?.inputTokens ?? 0,
        outputTokens: resource?.outputTokens ?? 0,
        priceStatus: resource?.priceStatus ?? 'not-applicable',
        limits: {
          calls: this.config.analysisMaxCallsPerDay,
          inputTokens: this.config.analysisMaxInputTokensPerDay,
          outputTokens: this.config.analysisMaxOutputTokensPerDay,
          outputTokensPerCall: this.config.analysisMaxOutputTokensPerCall,
        },
      },
    }
  }

  query(request: StyleQuery = {}): PreferenceAtom[] {
    const limit = Math.max(1, Math.min(1000, request.limit ?? 100))
    return this.requireStore().listPreferences()
      .filter(atom => request.register === undefined || atom.register === request.register)
      .filter(atom => request.category === undefined || atom.category === request.category)
      .filter(atom => request.status === undefined || atom.status === request.status)
      .filter(atom => request.locked === undefined || atom.locked === request.locked)
      .filter(atom => request.workspace === undefined
        || atom.profileScope.kind === 'global'
        || atom.profileScope.workspace === request.workspace)
      .filter(atom => request.text === undefined || atom.statement.toLocaleLowerCase().includes(request.text.toLocaleLowerCase()))
      .sort((a, b) => Number(b.locked) - Number(a.locked) || b.confidence - a.confidence || a.id.localeCompare(b.id))
      .slice(0, limit)
  }

  compile(request: CompileStyleRequest = {}): StyleContextPacket {
    const store = this.requireStore()
    const settings = store.getSettings()
    const depth = request.depth ?? 'basic'
    if (depth === 'deep' && !settings.deepStyleEnabled) throw new Error('DEEP_STYLE_DISABLED')
    if (request.includeSelfContext === true && !settings.allowSelfContextInCompilation) {
      throw new Error('SELF_CONTEXT_NOT_AUTHORIZED')
    }
    const selfDescription = store.getSelfDescription()
    return compileStyle({
      profileRevision: store.profileRevision(),
      preferences: store.listPreferences(),
      exemplars: store.listExemplars(),
      ...(selfDescription === undefined ? {} : { selfDescription }),
      register: request.register ?? 'default',
      ...(request.workspace === undefined ? {} : { workspace: request.workspace }),
      purpose: request.purpose ?? 'imitate',
      depth,
      budgetTokens: Math.min(request.budgetTokens ?? this.config.contextMaxTokens, this.config.contextMaxTokens),
      includeSelfContext: request.includeSelfContext ?? false,
      ...(request.selectedPreferenceIds === undefined ? {} : { selectedPreferenceIds: request.selectedPreferenceIds }),
    })
  }

  async activate(
    session: Session,
    request: CompileStyleRequest,
    scope: ActivationSet['scope'] = 'next-response',
  ): Promise<ActivationSet> {
    const settings = this.getSettings()
    if (settings.invocationMode === 'disabled') throw new Error('STYLE_DISABLED')
    const workspace = request.workspace ?? session.header.cwd
    const packet = this.compile({ ...request, ...(workspace === undefined ? {} : { workspace }) })
    if (packet.selectedPreferenceIds.length === 0 && packet.exemplars === undefined) throw new Error('STYLE_PROFILE_EMPTY')
    const activation: ActivationSet = {
      id: randomUUID(),
      sessionId: String(session.id),
      packet,
      scope,
      authorization: 'user-action',
      createdAt: new Date().toISOString(),
      status: 'active',
    }
    await this.requireStore().setActivation(activation)
    this.consumingNextResponse.delete(String(session.id))
    return activation
  }

  async deactivate(sessionId: string): Promise<boolean> {
    const deleted = await this.requireStore().deactivate(sessionId)
    if (deleted) this.consumingNextResponse.delete(sessionId)
    return deleted
  }

  /** Read one session activation for direct human-facing surfaces. */
  activation(sessionId: string): ActivationSet | undefined {
    const activation = this.requireStore().getActivation(sessionId)
    return activation?.status === 'active' && !this.consumingNextResponse.has(sessionId)
      ? activation
      : undefined
  }

  hasExplicitRequest(agent: Agent): boolean {
    for (const event of [...agent.session.events].reverse()) {
      if (event.type !== 'user/message' || event.data.source.kind !== 'user') continue
      const text = textOfMessage(event.data)
      return text !== undefined && STYLE_EXPLICIT.test(text) && !STYLE_OPT_OUT.test(text)
    }
    return false
  }

  async addPreference(statement: string, register: Register = 'default', workspace?: string): Promise<PreferenceAtom> {
    const trimmed = statement.trim()
    if (trimmed.length === 0 || trimmed.length > 1000) throw new Error('Preference text must contain 1–1000 characters.')
    const scope: ProfileScope = workspace === undefined ? { kind: 'global' } : { kind: 'workspace', workspace }
    return this.requireStore().addManualPreference(trimmed, register, scope)
  }

  async editPreference(id: string, statement: string): Promise<PreferenceAtom> {
    const current = this.requireStore().getPreference(id)
    if (current === undefined) throw new Error('PREFERENCE_NOT_FOUND')
    const trimmed = statement.trim()
    if (trimmed.length === 0 || trimmed.length > 1000) throw new Error('Preference text must contain 1–1000 characters.')
    const next: PreferenceAtom = {
      ...current,
      revision: current.revision + 1,
      statement: trimmed,
      sourceClass: 'user-explicit',
      confidence: 1,
      locked: true,
      status: 'active',
      lastSeenAt: new Date().toISOString(),
    }
    await this.requireStore().putPreference(next)
    return next
  }

  async setPreferenceState(id: string, patch: Pick<Partial<PreferenceAtom>, 'locked' | 'status'>): Promise<PreferenceAtom> {
    const current = this.requireStore().getPreference(id)
    if (current === undefined) throw new Error('PREFERENCE_NOT_FOUND')
    const next = { ...current, ...patch, revision: current.revision + 1, lastSeenAt: new Date().toISOString() }
    await this.requireStore().putPreference(next)
    return next
  }

  deletePreference(id: string): Promise<boolean> {
    return this.requireStore().deletePreference(id)
  }

  listExemplars(register?: Register) {
    return this.requireStore().listExemplars()
      .filter(exemplar => register === undefined || exemplar.register === register)
      .sort((a, b) => Number(b.locked) - Number(a.locked) || b.quality - a.quality || b.createdAt.localeCompare(a.createdAt))
  }

  setExemplarState(id: string, locked: boolean) {
    return this.requireStore().setExemplarState(id, locked)
  }

  deleteExemplar(id: string): Promise<boolean> {
    return this.requireStore().deleteExemplar(id)
  }

  deleteAllExemplars(): Promise<number> {
    return this.requireStore().deleteAllExemplars()
  }

  setSelfDescription(text: string) {
    const trimmed = text.trim()
    if (trimmed.length === 0 || trimmed.length > 50000) throw new Error('Self description must contain 1–50,000 characters.')
    return this.requireStore().setSelfDescription(trimmed)
  }

  deleteSelfDescription(): Promise<boolean> {
    return this.requireStore().deleteSelfDescription()
  }

  getSelfDescription() {
    return this.requireStore().getSelfDescription()
  }

  exportData(): PortableStyleMemory {
    return this.requireStore().exportData()
  }

  async importData(value: unknown, mode: 'merge' | 'replace' = 'merge'): Promise<void> {
    const parsed = portableStyleMemorySchema.parse(value)
    await this.requireStore().importData(parsed, mode)
  }

  clearUserData(): Promise<void> {
    return this.requireStore().clearUserData()
  }

  sessionById(id: string): Session | undefined {
    return this.ctx.sessions.get(SessionId(id))
  }

  private requireStore(): StyleMemoryStore {
    if (this.store === undefined) throw new Error('style-memory service is not initialized')
    return this.store
  }
}
