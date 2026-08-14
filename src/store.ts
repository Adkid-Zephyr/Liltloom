/** Typed persistence adapter over DSH storage-domain. */

import { randomUUID } from 'node:crypto'
import type { Context } from '@deepseek-ai/cordis'
import type { Domain, KvTable } from '@deepseek-ai/dsh-storage-domain'
import { fingerprint } from './features.js'
import { deriveRules, inferredPreferenceId, materializeRule } from './compiler.js'
import { styleMemoryDomainSpec } from './schemas.js'
import type {
  ActivationSet,
  EvidenceAggregate,
  FeatureSample,
  PortableStyleMemory,
  PreferenceAtom,
  ProcessingWatermark,
  ProfileMeta,
  ProfileScope,
  Register,
  ResourceLedger,
  SelfDescription,
  StyleExemplar,
  StyleMemorySettings,
} from './types.js'

type StyleDomain = Domain<typeof styleMemoryDomainSpec>

function nowIso(): string {
  return new Date().toISOString()
}

function aggregateId(scope: ProfileScope, register: Register): string {
  return scope.kind === 'global'
    ? `global:${register}`
    : `workspace:${fingerprint(scope.workspace).slice(0, 16)}:${register}`
}

function sameAtom(left: PreferenceAtom, right: PreferenceAtom): boolean {
  return left.statement === right.statement
    && left.sourceClass === right.sourceClass
    && left.confidence === right.confidence
    && left.evidenceCount === right.evidenceCount
    && left.status === right.status
    && left.locked === right.locked
}

/** All durable style-memory operations. */
export class StyleMemoryStore {
  private readonly preferences: KvTable<string, PreferenceAtom>
  private readonly aggregates: KvTable<string, EvidenceAggregate>
  private readonly exemplars: KvTable<string, StyleExemplar>
  private readonly settingsTable: KvTable<string, StyleMemorySettings>
  private readonly activations: KvTable<string, ActivationSet>
  private readonly selfDescriptions: KvTable<string, SelfDescription>
  private readonly watermarks: KvTable<string, ProcessingWatermark>
  private readonly profiles: KvTable<string, ProfileMeta>
  private readonly resources: KvTable<string, ResourceLedger>

  private constructor(private readonly domain: StyleDomain) {
    this.preferences = domain.table('preferences')
    this.aggregates = domain.table('aggregates')
    this.exemplars = domain.table('exemplars')
    this.settingsTable = domain.table('settings')
    this.activations = domain.table('activations')
    this.selfDescriptions = domain.table('self_description')
    this.watermarks = domain.table('watermarks')
    this.profiles = domain.table('profile')
    this.resources = domain.table('resources')
  }

  /** Open and initialize the versioned domain. */
  static async open(ctx: Context, defaults: StyleMemorySettings): Promise<StyleMemoryStore> {
    const domain = await ctx.storageDomain.open(styleMemoryDomainSpec)
    const store = new StyleMemoryStore(domain)
    if (store.settingsTable.get('settings') === undefined) await store.settingsTable.put('settings', defaults)
    if (store.profiles.get('profile') === undefined) {
      await store.profiles.put('profile', { id: 'profile', revision: 0, updatedAt: nowIso() })
    }
    return store
  }

  /** Close after queued domain writes drain. */
  close(): Promise<void> {
    return this.domain.close()
  }

  getSettings(): StyleMemorySettings {
    const settings = this.settingsTable.get('settings')
    if (settings === undefined) throw new Error('style-memory settings were not initialized')
    return settings
  }

  async setSettings(settings: StyleMemorySettings): Promise<void> {
    await this.settingsTable.put('settings', settings)
  }

  profileRevision(): number {
    return this.profiles.get('profile')?.revision ?? 0
  }

  private async bumpProfile(): Promise<number> {
    const current = this.profiles.get('profile') ?? { id: 'profile' as const, revision: 0, updatedAt: nowIso() }
    const next = { ...current, revision: current.revision + 1, updatedAt: nowIso() }
    await this.profiles.put('profile', next)
    return next.revision
  }

  listPreferences(): PreferenceAtom[] {
    return [...this.preferences.entries()].map(([, value]) => value)
  }

  getPreference(id: string): PreferenceAtom | undefined {
    return this.preferences.get(id)
  }

  async putPreference(atom: PreferenceAtom): Promise<void> {
    await this.preferences.put(atom.id, atom)
    await this.bumpProfile()
  }

  async deletePreference(id: string): Promise<boolean> {
    const deleted = await this.preferences.delete(id)
    if (deleted) await this.bumpProfile()
    return deleted
  }

  async addManualPreference(statement: string, register: Register, scope: ProfileScope): Promise<PreferenceAtom> {
    const now = nowIso()
    const id = `manual:${randomUUID()}`
    const atom: PreferenceAtom = {
      id,
      revision: 1,
      profileScope: scope,
      featureKey: id,
      category: 'explicit-rule',
      register,
      statement,
      sourceClass: 'user-explicit',
      confidence: 1,
      evidenceCount: 1,
      status: 'active',
      locked: true,
      firstSeenAt: now,
      lastSeenAt: now,
    }
    await this.putPreference(atom)
    return atom
  }

  /** Update one aggregate and synchronize its deterministic inferred rules. */
  async addSample(scope: ProfileScope, sample: FeatureSample): Promise<void> {
    const id = aggregateId(scope, sample.register)
    const now = nowIso()
    const current = this.aggregates.get(id)
    const next: EvidenceAggregate = current === undefined ? {
      id,
      profileScope: scope,
      register: sample.register,
      sampleCount: 1,
      totalChars: sample.chars,
      totalSentences: sample.sentences,
      totalParagraphs: sample.paragraphs,
      totalLines: sample.lines,
      bulletLines: sample.bulletLines,
      headingLines: sample.headingLines,
      emojiCount: sample.emojiCount,
      exclamationCount: sample.exclamationCount,
      questionCount: sample.questionCount,
      cjkPunctuationCount: sample.cjkPunctuationCount,
      asciiPunctuationCount: sample.asciiPunctuationCount,
      firstObservedAt: now,
      lastObservedAt: now,
    } : {
      ...current,
      sampleCount: current.sampleCount + 1,
      totalChars: current.totalChars + sample.chars,
      totalSentences: current.totalSentences + sample.sentences,
      totalParagraphs: current.totalParagraphs + sample.paragraphs,
      totalLines: current.totalLines + sample.lines,
      bulletLines: current.bulletLines + sample.bulletLines,
      headingLines: current.headingLines + sample.headingLines,
      emojiCount: current.emojiCount + sample.emojiCount,
      exclamationCount: current.exclamationCount + sample.exclamationCount,
      questionCount: current.questionCount + sample.questionCount,
      cjkPunctuationCount: current.cjkPunctuationCount + sample.cjkPunctuationCount,
      asciiPunctuationCount: current.asciiPunctuationCount + sample.asciiPunctuationCount,
      lastObservedAt: now,
    }
    await this.aggregates.put(id, next)

    let changed = false
    for (const rule of deriveRules(next)) {
      const preferenceId = inferredPreferenceId(scope, sample.register, rule.featureKey)
      const previous = this.preferences.get(preferenceId)
      if (previous?.locked === true) continue
      const atom = materializeRule(scope, sample.register, next, rule, previous)
      if (previous !== undefined && sameAtom(previous, atom)) continue
      await this.preferences.put(atom.id, atom)
      changed = true
    }
    if (changed) await this.bumpProfile()
  }

  /** Merge a validated model proposal without permitting locked-state mutation. */
  async mergeModelObservation(category: PreferenceAtom['category'], register: Register, statement: string, confidence: number): Promise<void> {
    const normalized = statement.trim().replace(/\s+/gu, ' ')
    const featureKey = `semantic:${fingerprint(`${category}\0${normalized.toLocaleLowerCase()}`).slice(0, 24)}`
    const id = `model:global:${register}:${featureKey}`
    const previous = this.preferences.get(id)
    if (previous?.locked === true) return
    const now = nowIso()
    const evidenceCount = (previous?.evidenceCount ?? 0) + 1
    const atom: PreferenceAtom = {
      id,
      revision: (previous?.revision ?? 0) + 1,
      profileScope: { kind: 'global' },
      featureKey,
      category,
      register,
      statement: normalized,
      sourceClass: evidenceCount >= 3 ? 'strong-observation' : 'weak-observation',
      confidence: Math.min(0.9, previous === undefined ? confidence : (previous.confidence + confidence) / 2),
      evidenceCount,
      status: previous?.status ?? 'active',
      locked: false,
      firstSeenAt: previous?.firstSeenAt ?? now,
      lastSeenAt: now,
    }
    await this.preferences.put(id, atom)
    await this.bumpProfile()
  }

  listExemplars(): StyleExemplar[] {
    return [...this.exemplars.entries()].map(([, value]) => value)
  }

  getExemplar(id: string): StyleExemplar | undefined {
    return this.exemplars.get(id)
  }

  async setExemplarState(id: string, locked: boolean): Promise<StyleExemplar> {
    const current = this.exemplars.get(id)
    if (current === undefined) throw new Error('EXEMPLAR_NOT_FOUND')
    const next: StyleExemplar = {
      ...current,
      revision: current.revision + 1,
      locked,
      // A locked exemplar is intentionally retained until the user unlocks it.
      expiresAt: locked ? null : new Date(Date.now() + this.getSettings().deepStyleRetentionDays * 86_400_000).toISOString(),
    }
    await this.exemplars.put(id, next)
    await this.bumpProfile()
    return next
  }

  async deleteExemplar(id: string): Promise<boolean> {
    const deleted = await this.exemplars.delete(id)
    if (deleted) await this.bumpProfile()
    return deleted
  }

  async deleteAllExemplars(): Promise<number> {
    let removed = 0
    for (const id of [...this.exemplars.keys()]) {
      if (await this.exemplars.delete(id)) removed += 1
    }
    if (removed > 0) await this.bumpProfile()
    return removed
  }

  async retainExemplar(scope: ProfileScope, sample: FeatureSample, settings: StyleMemorySettings): Promise<StyleExemplar | undefined> {
    const text = sample.text.slice(0, settings.deepStyleMaxExcerptChars)
    const sourceFingerprint = fingerprint(text)
    if (this.exemplars.get(sourceFingerprint) !== undefined) return undefined
    const now = new Date()
    const candidate: StyleExemplar = {
      id: sourceFingerprint,
      revision: 1,
      profileScope: scope,
      register: sample.register,
      text,
      sourceKind: 'user-authored-message',
      sourceFingerprint,
      classificationConfidence: 0.85,
      redactionCount: 0,
      quality: sample.exemplarQuality,
      status: 'active',
      locked: false,
      consentVersion: settings.deepStyleConsentVersion ?? 1,
      createdAt: now.toISOString(),
      expiresAt: new Date(now.getTime() + settings.deepStyleRetentionDays * 86_400_000).toISOString(),
    }
    const active = this.listExemplars().filter(item => item.locked || item.expiresAt === null || Date.parse(item.expiresAt) > now.getTime())
    const ranked = [...active, candidate].sort((a, b) => Number(b.locked) - Number(a.locked) || b.quality - a.quality || b.createdAt.localeCompare(a.createdAt))
    const keep = new Set<string>()
    let chars = 0
    for (const item of ranked) {
      if (keep.size >= settings.deepStyleMaxRecords) continue
      if (chars + item.text.length > settings.deepStyleMaxTotalChars && !item.locked) continue
      keep.add(item.id)
      chars += item.text.length
    }
    if (!keep.has(candidate.id)) return undefined
    for (const item of active) {
      if (!keep.has(item.id) && !item.locked) await this.exemplars.delete(item.id)
    }
    await this.exemplars.put(candidate.id, candidate)
    await this.bumpProfile()
    return candidate
  }

  async pruneExpiredExemplars(): Promise<number> {
    const now = Date.now()
    let removed = 0
    for (const [id, exemplar] of this.exemplars.entries()) {
      if (!exemplar.locked && exemplar.expiresAt !== null && Date.parse(exemplar.expiresAt) <= now) {
        if (await this.exemplars.delete(id)) removed += 1
      }
    }
    if (removed > 0) await this.bumpProfile()
    return removed
  }

  getWatermark(sessionId: string): ProcessingWatermark | undefined {
    return this.watermarks.get(sessionId)
  }

  async setWatermark(sessionId: string, throughSeq: number): Promise<void> {
    await this.watermarks.put(sessionId, { sessionId, throughSeq, updatedAt: nowIso() })
  }

  getActivation(sessionId: string): ActivationSet | undefined {
    return this.activations.get(sessionId)
  }

  async setActivation(activation: ActivationSet): Promise<void> {
    await this.activations.put(activation.sessionId, activation)
  }

  async deactivate(sessionId: string): Promise<boolean> {
    return this.activations.delete(sessionId)
  }

  async consumeNextResponse(sessionId: string): Promise<void> {
    const activation = this.activations.get(sessionId)
    if (activation?.status !== 'active' || activation.scope !== 'next-response') return
    await this.activations.put(sessionId, { ...activation, status: 'consumed' })
  }

  getSelfDescription(): SelfDescription | undefined {
    return this.selfDescriptions.get('self')
  }

  async setSelfDescription(text: string): Promise<SelfDescription> {
    const previous = this.selfDescriptions.get('self')
    const now = nowIso()
    const description: SelfDescription = {
      revision: (previous?.revision ?? 0) + 1,
      text,
      source: 'user-authored',
      createdAt: previous?.createdAt ?? now,
      updatedAt: now,
    }
    await this.selfDescriptions.put('self', description)
    await this.bumpProfile()
    return description
  }

  async deleteSelfDescription(): Promise<boolean> {
    const deleted = await this.selfDescriptions.delete('self')
    if (deleted) await this.bumpProfile()
    return deleted
  }

  getResourceLedger(periodStart: string): ResourceLedger | undefined {
    return this.resources.get(periodStart)
  }

  async recordResource(periodStart: string, inputTokens: number, outputTokens: number): Promise<void> {
    const previous = this.resources.get(periodStart)
    await this.resources.put(periodStart, {
      periodStart,
      calls: (previous?.calls ?? 0) + 1,
      inputTokens: (previous?.inputTokens ?? 0) + inputTokens,
      outputTokens: (previous?.outputTokens ?? 0) + outputTokens,
      priceStatus: 'unknown',
    })
  }

  async recordResourceUsage(periodStart: string, inputTokens: number, outputTokens: number): Promise<void> {
    const previous = this.resources.get(periodStart) ?? {
      periodStart,
      calls: 0,
      inputTokens: 0,
      outputTokens: 0,
      priceStatus: 'unknown' as const,
    }
    await this.resources.put(periodStart, {
      ...previous,
      inputTokens: previous.inputTokens + inputTokens,
      outputTokens: previous.outputTokens + outputTokens,
    })
  }

  exportData(): PortableStyleMemory {
    const selfDescription = this.getSelfDescription()
    return {
      schemaVersion: 1,
      product: 'dsh-liltloom',
      exportedAt: nowIso(),
      preferences: this.listPreferences(),
      exemplars: this.listExemplars(),
      ...(selfDescription === undefined ? {} : { selfDescription }),
    }
  }

  async importData(data: PortableStyleMemory, mode: 'merge' | 'replace'): Promise<void> {
    if (mode === 'replace') {
      for (const key of this.preferences.keys()) await this.preferences.delete(key)
      for (const key of this.exemplars.keys()) await this.exemplars.delete(key)
      await this.selfDescriptions.delete('self')
    }
    for (const atom of data.preferences) await this.preferences.put(atom.id, atom)
    for (const exemplar of data.exemplars) await this.exemplars.put(exemplar.id, exemplar)
    if (data.selfDescription !== undefined) await this.selfDescriptions.put('self', data.selfDescription)
    await this.bumpProfile()
  }

  async clearUserData(): Promise<void> {
    for (const key of this.preferences.keys()) await this.preferences.delete(key)
    for (const key of this.aggregates.keys()) await this.aggregates.delete(key)
    for (const key of this.exemplars.keys()) await this.exemplars.delete(key)
    for (const key of this.activations.keys()) await this.activations.delete(key)
    for (const key of this.selfDescriptions.keys()) await this.selfDescriptions.delete(key)
    for (const key of this.watermarks.keys()) await this.watermarks.delete(key)
    await this.bumpProfile()
  }

  learnedMessageCount(): number {
    return [...this.aggregates.entries()]
      .filter(([, aggregate]) => aggregate.profileScope.kind === 'global')
      .reduce((total, [, aggregate]) => total + aggregate.sampleCount, 0)
  }
}
