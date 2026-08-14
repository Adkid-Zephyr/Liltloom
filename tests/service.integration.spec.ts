import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { afterEach, describe, expect, it } from 'vitest'
import { Context, Service } from '@deepseek-ai/cordis'
import Storage from '@deepseek-ai/dsh-storage'
import * as StorageDomain from '@deepseek-ai/dsh-storage-domain'
import * as StorageJson from '@deepseek-ai/dsh-storage-json'
import SessionStore, { SessionId } from '@deepseek-ai/dsh-session'
import type { Session } from '@deepseek-ai/dsh-session'
import { createUserMessage } from '@deepseek-ai/dsh-llm'
import SystemPrompt, { renderContextSnapshot } from '@deepseek-ai/dsh-system-prompt'
import ToolRuntime from '@deepseek-ai/dsh-tools'
import CommandRuntime from '@deepseek-ai/dsh-commands'
import StyleMemory from '../src/service.js'
import type { Config } from '../src/service.js'
import { createStyleMemoryRpcHandler } from '../src/rpc.js'

const contexts: Context[] = []
const roots: string[] = []

const config: Config = {
  observationEnabled: true,
  invocationMode: 'explicit',
  modelToolEnabled: false,
  deepStyleEnabled: false,
  analysisEnabled: false,
  analysisProvider: '',
  analysisModel: '',
  analysisMaxCallsPerDay: 20,
  analysisMaxInputTokensPerDay: 50000,
  analysisMaxOutputTokensPerDay: 6000,
  analysisMaxOutputTokensPerCall: 600,
  analysisBatchMessages: 6,
  analysisMaxBatchChars: 8000,
  analysisFlushIntervalMs: 30000,
  analysisTimeoutMs: 60000,
  analysisMaxRetries: 1,
  analysisRetryBackoffMs: 60000,
  contextMaxTokens: 1200,
}

class FailingLlm extends Service {
  calls = 0

  constructor(ctx: Context) {
    super(ctx, 'llm')
  }

  async *stream(): AsyncGenerator<never> {
    this.calls += 1
    throw new Error('fixture route unavailable')
  }
}

async function harness(overrides: Partial<Config> = {}) {
  const root = await mkdtemp(join(tmpdir(), 'liltloom-'))
  roots.push(root)
  const ctx = new Context()
  contexts.push(ctx)
  await ctx.plugin(Storage)
  await ctx.plugin(StorageJson, { root })
  await ctx.plugin(StorageDomain, { backend: 'json', routes: {} })
  await ctx.plugin(SessionStore)
  await ctx.plugin(SystemPrompt)
  await ctx.plugin(ToolRuntime)
  await ctx.plugin(CommandRuntime)
  if (overrides.analysisProvider === 'failing') await ctx.plugin(FailingLlm)
  const fiber = await ctx.plugin(StyleMemory, { ...config, ...overrides })
  return { ctx, root, fiber, service: ctx.styleMemory }
}

function user(session: Session, text: string): void {
  session.append('user/message', createUserMessage({
    content: [{ type: 'text', text }],
    source: { kind: 'user' },
  }), { surfaceOp: 'append' })
}

afterEach(async () => {
  await Promise.all(contexts.splice(0).map(ctx => ctx.fiber.dispose()))
  await Promise.all(roots.splice(0).map(root => rm(root, { recursive: true, force: true })))
})

describe('DSH service integration', () => {
  it('learns quietly without contributing tools or runtime context', async () => {
    const { ctx, root, service } = await harness()
    const session = ctx.sessions.create(SessionId('quiet'), { meta: { cwd: '/workspace' } })
    const raw = '我倾向先给结论，然后用很短的段落补充必要的信息。'
    user(session, raw)
    await service.flush()

    const fakeAgent = { session } as never
    const assembly = await ctx.systemPrompt.assemble({ agent: fakeAgent, scope: fakeAgent })
    expect(renderContextSnapshot(assembly)).toBe('')
    expect(assembly.tools.some(tool => tool.name === 'style_context')).toBe(false)
    expect(service.status().learnedMessages).toBe(1)

    const stored = await readFile(join(root, 'style_memory.json'), 'utf8')
    expect(stored).not.toContain(raw)
  })

  it('excludes plugin-authored and subagent-origin messages from learning', async () => {
    const { ctx, service } = await harness()
    const main = ctx.sessions.create(SessionId('sources-main'), { meta: { cwd: '/workspace' } })
    main.append('user/message', createUserMessage({
      content: [{ type: 'text', text: '这段看起来像用户文字，但它实际上来自插件。' }],
      source: { kind: 'plugin', plugin: 'fixture' },
    }), { surfaceOp: 'append' })
    const child = ctx.sessions.create(SessionId('sources-child'), { meta: { cwd: '/workspace', origin: 'subagent' } })
    user(child, '这段来自子 Agent 会话，也不能成为用户风格证据。')
    await service.flush()
    expect(service.status().learnedMessages).toBe(0)

    user(main, '只有这段顶层用户自己写的话可以成为风格证据。')
    await service.flush()
    expect(service.status().learnedMessages).toBe(1)
  })

  it('registers the human command and changes the tool schema only after user opt-in', async () => {
    const { ctx, service } = await harness()
    const session = ctx.sessions.create(SessionId('interfaces'), { meta: { cwd: '/workspace' } })
    const fakeAgent = { session } as never
    expect(ctx.commands.find(fakeAgent, 'liltloom')?.recordInput).toBe(false)
    expect(ctx.commands.find(fakeAgent, 'style-memory')?.recordInput).toBe(false)
    await service.addPreference('先给结论。')
    const command = await ctx.commands.execute(fakeAgent, '/liltloom preview', new AbortController().signal)
    expect(command?.result.text).toContain('先给结论')
    const runEvent = session.events.find(event => event.type === 'command/run')
    expect(runEvent?.type === 'command/run' && 'args' in runEvent.data).toBe(false)

    let assembly = await ctx.systemPrompt.assemble({ agent: fakeAgent, scope: fakeAgent })
    expect(assembly.tools.some(tool => tool.name === 'style_context')).toBe(false)
    await service.updateSettings({ modelToolEnabled: true })
    assembly = await ctx.systemPrompt.assemble({ agent: fakeAgent, scope: fakeAgent })
    expect(assembly.tools.some(tool => tool.name === 'style_context')).toBe(true)
    await service.updateSettings({ modelToolEnabled: false })
    assembly = await ctx.systemPrompt.assemble({ agent: fakeAgent, scope: fakeAgent })
    expect(assembly.tools.some(tool => tool.name === 'style_context')).toBe(false)
  })

  it('supports direct preference edit, lock, suppress, restore, and delete', async () => {
    const { service } = await harness()
    const added = await service.addPreference('旧规则。')
    const edited = await service.editPreference(added.id, '新规则。')
    expect(edited.statement).toBe('新规则。')
    expect(edited.locked).toBe(true)
    expect((await service.setPreferenceState(added.id, { locked: false })).locked).toBe(false)
    expect((await service.setPreferenceState(added.id, { status: 'suppressed' })).status).toBe('suppressed')
    expect((await service.setPreferenceState(added.id, { status: 'active' })).status).toBe('active')
    expect(await service.deletePreference(added.id)).toBe(true)
    expect(service.query()).toEqual([])
  })

  it('serves typed loopback UI operations without exposing exemplar text in status', async () => {
    const { ctx, service } = await harness()
    const session = ctx.sessions.create(SessionId('rpc-ui'), { meta: { cwd: '/workspace' } })
    const rpc = createStyleMemoryRpcHandler(service)
    const added = await rpc('preference/add', { statement: '先给结论。', register: 'default' })
    expect(added).toMatchObject({ ok: true, value: { statement: '先给结论。', locked: true } })

    const status = await rpc('status/read', {})
    expect(status).toMatchObject({ ok: true, value: { preferences: 1, exemplars: 0 } })
    expect(JSON.stringify(status)).not.toContain('先给结论。')

    const activated = await rpc('activation/activate', {
      sessionId: String(session.id),
      scope: 'next-response',
      request: { register: 'default', depth: 'basic' },
    })
    expect(activated).toMatchObject({ ok: true, value: { sessionId: 'rpc-ui', status: 'active' } })
    expect(await rpc('activation/read', { sessionId: 'rpc-ui' })).toMatchObject({ ok: true, value: { status: 'active' } })
  })

  it('validates UI payloads and rejects stale direct edits', async () => {
    const { service } = await harness()
    const rpc = createStyleMemoryRpcHandler(service)
    const atom = await service.addPreference('保持简洁。')

    const stale = await rpc('preference/edit', {
      id: atom.id,
      statement: '保持简洁且自然。',
      expectedRevision: atom.revision + 1,
    })
    expect(stale).toMatchObject({ ok: false, error: { code: 'settings-conflict' } })
    expect(service.query()[0]?.statement).toBe('保持简洁。')

    const invalid = await rpc('settings/update', { patch: { updatedAt: new Date().toISOString() } })
    expect(invalid).toMatchObject({ ok: false, error: { code: 'bad-request' } })
    const missing = await rpc('activation/activate', { sessionId: 'missing' })
    expect(missing).toMatchObject({ ok: false, error: { code: 'session-not-found' } })
  })

  it('derives preferences after repeated evidence and activates replayable dynamic context', async () => {
    const { ctx, service } = await harness()
    const session = ctx.sessions.create(SessionId('activation'), { meta: { cwd: '/workspace' } })
    for (let index = 0; index < 4; index += 1) user(session, `第${index + 1}次都先说结论。句子保持很短。内容不要绕。`)
    await service.flush()
    expect(service.query().length).toBeGreaterThan(0)

    await service.activate(session, { register: 'default' })
    const fakeAgent = { session } as never
    const assembly = await ctx.systemPrompt.assemble({ agent: fakeAgent, scope: fakeAgent })
    const context = assembly.contexts.find(item => item.name === 'style-memory')
    expect(context?.text).toContain('当前任务指令')
    expect(context?.text).toContain('结论')
  })

  it('honors configured workspace scope, disabled mode, and current-message opt-out', async () => {
    const { ctx, service } = await harness()
    await service.addPreference('保持简洁。')
    await service.updateSettings({ invocationMode: 'configured-auto', autoWorkspaceGlobs: ['/allowed/*'] })
    const allowed = ctx.sessions.create(SessionId('auto-allowed'), { meta: { cwd: '/allowed/project' } })
    const denied = ctx.sessions.create(SessionId('auto-denied'), { meta: { cwd: '/other' } })
    const allowedAgent = { session: allowed } as never
    const deniedAgent = { session: denied } as never
    expect(renderContextSnapshot(await ctx.systemPrompt.assemble({ agent: allowedAgent, scope: allowedAgent }))).toContain('保持简洁')
    expect(renderContextSnapshot(await ctx.systemPrompt.assemble({ agent: deniedAgent, scope: deniedAgent }))).toBe('')

    const optOut = createUserMessage({
      content: [{ type: 'text', text: '这次不要使用我的写作风格。' }],
      source: { kind: 'user' },
    })
    ctx.emit('agent/inbox/inserted', { agent: allowedAgent, message: optOut })
    expect(renderContextSnapshot(await ctx.systemPrompt.assemble({ agent: allowedAgent, scope: allowedAgent }))).toBe('')
    ctx.emit('agent/inbox/discarded', { agent: allowedAgent, message: optOut })
    expect(renderContextSnapshot(await ctx.systemPrompt.assemble({ agent: allowedAgent, scope: allowedAgent }))).toContain('保持简洁')

    await service.updateSettings({ invocationMode: 'disabled' })
    await expect(service.activate(allowed, {})).rejects.toThrow('STYLE_DISABLED')
  })

  it('consumes a next-response activation at the DSH turn boundary', async () => {
    const { ctx, service } = await harness()
    const session = ctx.sessions.create(SessionId('next-response'), { meta: { cwd: '/workspace' } })
    await service.addPreference('保持自然、直接。')
    await service.activate(session, {}, 'next-response')
    const fakeAgent = { session } as never
    let assembly = await ctx.systemPrompt.assemble({ agent: fakeAgent, scope: fakeAgent })
    expect(renderContextSnapshot(assembly)).toContain('保持自然、直接')

    session.append('turn/end', { turn: 1, reason: { kind: 'completed' } })
    assembly = await ctx.systemPrompt.assemble({ agent: fakeAgent, scope: fakeAgent })
    expect(renderContextSnapshot(assembly)).toBe('')
  })

  it('uses the durable watermark to avoid double learning after plugin reload', async () => {
    const { ctx, fiber, service } = await harness()
    const session = ctx.sessions.create(SessionId('replay'), { meta: { cwd: '/workspace' } })
    user(session, '这是一次足够长的原生写作样本，用于验证重放不会重复增加证据。')
    await service.flush()
    expect(service.status().learnedMessages).toBe(1)

    await fiber.dispose()
    await ctx.plugin(StyleMemory, config)
    await ctx.styleMemory.flush()
    expect(ctx.styleMemory.status().learnedMessages).toBe(1)
  })

  it('retains only bounded Deep Style excerpts and excludes secrets', async () => {
    const { ctx, service } = await harness()
    await service.updateSettings({
      deepStyleEnabled: true,
      deepStyleMaxRecords: 2,
      deepStyleMaxTotalChars: 2400,
    })
    const session = ctx.sessions.create(SessionId('deep'), { meta: { cwd: '/workspace' } })
    for (let index = 0; index < 3; index += 1) {
      user(session, `这是第${index + 1}段原创文字。它包含完整的表达和自然的句子，用来展示一个稳定的写作方式。我们先说明核心判断，再补充理由，最后用一句简短的话结束。为了让论述更完整，我会继续解释判断依据，同时保持段落清晰，不加入无关信息，也不使用模板化口号。`)
    }
    user(session, '这段文字包含 api_key = sk-this-is-a-secret-value，所以绝对不能进入示例存储，即使它的长度已经足够。')
    await service.flush()
    expect(service.status().exemplars).toBe(2)
    expect(JSON.stringify(service.exportData())).not.toContain('sk-this-is-a-secret-value')

    const first = service.listExemplars()[0]
    expect(first).toBeDefined()
    const locked = await service.setExemplarState(first!.id, true)
    expect(locked.locked).toBe(true)
    expect(locked.expiresAt).toBeNull()
    const unlocked = await service.setExemplarState(first!.id, false)
    expect(unlocked.locked).toBe(false)
    expect(unlocked.expiresAt).not.toBeNull()
    expect(await service.deleteExemplar(first!.id)).toBe(true)
    expect(service.status().exemplars).toBe(1)
  })

  it('round-trips portable data and keeps self description separate', async () => {
    const { service } = await harness()
    await service.addPreference('避免模板化结尾。', 'default')
    await service.setSelfDescription('我重视直接、诚实和清晰的沟通。')
    const exported = service.exportData()
    expect(exported.product).toBe('liltloom')
    await service.clearUserData()
    expect(service.query()).toEqual([])
    expect(service.getSelfDescription()).toBeUndefined()
    await service.importData(exported)
    expect(service.query()[0]?.statement).toBe('避免模板化结尾。')
    expect(service.getSelfDescription()?.text).toContain('直接')

    await service.clearUserData()
    await service.importData({ ...exported, product: 'dsh-style-memory' })
    expect(service.query()[0]?.statement).toBe('避免模板化结尾。')

    const before = service.exportData()
    await expect(service.importData({ ...before, schemaVersion: 2 })).rejects.toBeDefined()
    expect(service.exportData().preferences).toEqual(before.preferences)
  })

  it('requires a separate authorization before self description can enter compilation', async () => {
    const { service } = await harness()
    await service.addPreference('表达清楚直接。', 'default')
    await service.setSelfDescription('我重视清晰。我的沟通偏好是直接。')
    expect(() => service.compile({ includeSelfContext: true })).toThrow('SELF_CONTEXT_NOT_AUTHORIZED')
    await service.updateSettings({ allowSelfContextInCompilation: true })
    const packet = service.compile({ includeSelfContext: true })
    expect(packet.selfContext?.sourceRevision).toBe(1)
    expect(packet.renderedContext).toContain('用户自述参考')
  })

  it('isolates analysis failure and counts the failed attempt against its resource envelope', async () => {
    const { ctx, root, service } = await harness({
      analysisEnabled: true,
      analysisProvider: 'failing',
      analysisModel: 'small-fixture',
      analysisBatchMessages: 1,
      analysisMaxRetries: 0,
      analysisRetryBackoffMs: 0,
    })
    const session = ctx.sessions.create(SessionId('analysis-failure'), { meta: { cwd: '/workspace' } })
    user(session, '这是一段会触发机会性语义分析的原生文本，但是测试中的模型服务会立即失败。')
    await service.flush()
    expect(service.status().learnedMessages).toBe(1)
    expect(service.query()).toEqual([])

    const persisted = JSON.parse(await readFile(join(root, 'style_memory.json'), 'utf8')) as {
      tables: { resources: Record<string, { calls: number; inputTokens: number }> }
    }
    const ledger = Object.values(persisted.tables.resources)[0]
    expect(ledger?.calls).toBe(1)
    expect(ledger?.inputTokens).toBeGreaterThan(0)
  })
})
