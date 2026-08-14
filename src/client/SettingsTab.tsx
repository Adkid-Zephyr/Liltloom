import { useCallback, useEffect, useMemo, useState, type ChangeEvent, type ReactNode } from 'react'
import type { PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import type {
  PreferenceAtom,
  Register,
  SelfDescription,
  StyleContextPacket,
  StyleExemplar,
  StyleMemorySettings,
  StyleMemoryStatus,
} from '../types.js'
import type { BrowserStyleMemoryClient } from './api.js'
import { SETTINGS_STYLES } from './styles.js'

export interface StyleMemorySettingsInjected {
  client: BrowserStyleMemoryClient
}

type SettingsTabProps = PropsRuntime<'settings.plugins.tab'> & StyleMemorySettingsInjected
type Page = 'overview' | 'rules' | 'preview' | 'advanced' | 'data'

const REGISTERS: readonly Register[] = ['default', 'technical', 'professional', 'social', 'longform']
const REGISTER_LABELS: Record<Register, string> = {
  default: '默认',
  technical: '技术',
  professional: '专业',
  social: '社交',
  longform: '长文',
}

function Toggle({ value, disabled = false, label, onChange }: {
  value: boolean
  disabled?: boolean
  label: string
  onChange: (value: boolean) => void
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-label={label}
      aria-checked={value}
      className="sm-switch"
      data-on={value}
      disabled={disabled}
      onClick={() => { onChange(!value) }}
    />
  )
}

function ActionButton({ children, primary, danger, ...props }: {
  children: ReactNode
  primary?: boolean
  danger?: boolean
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button type="button" className="sm-btn" data-primary={primary} data-danger={danger} {...props}>{children}</button>
}

function Metric({ value, label }: { value: number | string; label: string }) {
  return <div className="sm-metric"><strong>{value}</strong><span>{label}</span></div>
}

function LiltloomMark() {
  return (
    <span className="ll-mark" aria-hidden="true">
      <svg viewBox="0 0 36 36" focusable="false">
        <path d="M5 10c7 0 7 16 13 16s6-16 13-16" />
        <path d="M5 26c7 0 7-16 13-16s6 16 13 16" />
      </svg>
    </span>
  )
}

function formatError(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

/** Native Plugins settings tab: user-owned inspection and direct editing plane. */
export function StyleMemorySettingsTab({ client }: SettingsTabProps) {
  const [page, setPage] = useState<Page>('overview')
  const [status, setStatus] = useState<StyleMemoryStatus>()
  const [preferences, setPreferences] = useState<PreferenceAtom[]>([])
  const [self, setSelf] = useState<SelfDescription | null>(null)
  const [selfDraft, setSelfDraft] = useState('')
  const [query, setQuery] = useState('')
  const [draft, setDraft] = useState('')
  const [draftRegister, setDraftRegister] = useState<Register>('default')
  const [editingId, setEditingId] = useState<string>()
  const [editingDraft, setEditingDraft] = useState('')
  const [previewRegister, setPreviewRegister] = useState<Register>('default')
  const [previewDepth, setPreviewDepth] = useState<'basic' | 'deep'>('basic')
  const [previewSelf, setPreviewSelf] = useState(false)
  const [preview, setPreview] = useState<StyleContextPacket>()
  const [exemplars, setExemplars] = useState<StyleExemplar[]>()
  const [retentionDays, setRetentionDays] = useState(90)
  const [maxRecords, setMaxRecords] = useState(200)
  const [maxTotalChars, setMaxTotalChars] = useState(240000)
  const [replaceImport, setReplaceImport] = useState(false)
  const [clearConfirmation, setClearConfirmation] = useState('')
  const [confirmKey, setConfirmKey] = useState<string>()
  const [consentKind, setConsentKind] = useState<'deep' | 'analysis'>()
  const [busy, setBusy] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string>()
  const [notice, setNotice] = useState<string>()

  const refresh = useCallback(async (signal?: AbortSignal) => {
    const [nextStatus, nextPreferences, nextSelf] = await Promise.all([
      client.call('status/read', {}, signal),
      client.call('preferences/list', { query: { limit: 1000 } }, signal),
      client.call('self/read', {}, signal),
    ])
    setStatus(nextStatus)
    setPreferences(nextPreferences)
    setSelf(nextSelf)
    setSelfDraft(nextSelf?.text ?? '')
    setRetentionDays(nextStatus.settings.deepStyleRetentionDays)
    setMaxRecords(nextStatus.settings.deepStyleMaxRecords)
    setMaxTotalChars(nextStatus.settings.deepStyleMaxTotalChars)
  }, [client])

  useEffect(() => {
    const controller = new AbortController()
    void refresh(controller.signal).catch((cause: unknown) => {
      if (!controller.signal.aborted) setError(formatError(cause))
    }).finally(() => {
      if (!controller.signal.aborted) setLoading(false)
    })
    return () => { controller.abort() }
  }, [refresh])

  const run = useCallback(async (action: () => Promise<void>, success?: string) => {
    setBusy(true)
    setError(undefined)
    setNotice(undefined)
    try {
      await action()
      if (success !== undefined) setNotice(success)
    } catch (cause) {
      setError(formatError(cause))
    } finally {
      setBusy(false)
    }
  }, [])

  const updateSettings = useCallback(async (
    patch: Partial<Omit<StyleMemorySettings, 'schemaVersion' | 'updatedAt'>>,
  ) => {
    const expectedUpdatedAt = status?.settings.updatedAt
    await client.call('settings/update', {
      patch,
      ...(expectedUpdatedAt === undefined ? {} : { expectedUpdatedAt }),
    })
    await refresh()
  }, [client, refresh, status])

  const filtered = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase()
    return normalized.length === 0
      ? preferences
      : preferences.filter(item => [item.statement, item.category, item.register]
        .some(value => value.toLocaleLowerCase().includes(normalized)))
  }, [preferences, query])

  if (loading) return <div className="sm-loading"><style>{SETTINGS_STYLES}</style>正在读取你的语织…</div>
  if (status === undefined) {
    return (
      <div className="sm-page">
        <style>{SETTINGS_STYLES}</style>
        <div className="sm-banner sm-error">无法读取 Liltloom。管理界面仅允许从 DSH 本机页面访问。{error === undefined ? '' : ` ${error}`}</div>
      </div>
    )
  }

  const settings = status.settings
  const analysis = status.analysisResource

  const renderOverview = () => (
    <div className="sm-section">
      <h3>学习与取用</h3>
      <div className="sm-card">
        <div className="sm-row">
          <div className="sm-copy"><strong>静默学习</strong><p className="sm-muted">只在后台提取统计特征，不在对话中显示徽标，不自动使用。</p></div>
          <div className="sm-control">
            <select value={settings.observationState} disabled={busy} aria-label="学习状态" onChange={(event) => {
              void run(() => updateSettings({ observationState: event.currentTarget.value as StyleMemorySettings['observationState'] }))
            }}>
              <option value="learning">学习中</option><option value="paused">暂停</option><option value="off">关闭</option>
            </select>
          </div>
        </div>
        <div className="sm-row">
          <div className="sm-copy"><strong>何时织入回答</strong><p className="sm-muted">默认由你主动取用；学习本身不会改变回答。</p></div>
          <div className="sm-control">
            <select value={settings.invocationMode} disabled={busy} aria-label="取用方式" onChange={(event) => {
              void run(() => updateSettings({ invocationMode: event.currentTarget.value as StyleMemorySettings['invocationMode'] }))
            }}>
              <option value="explicit">显式取用</option><option value="configured-auto">指定工作区自动</option><option value="disabled">禁止取用</option>
            </select>
          </div>
        </div>
        <div className="sm-row">
          <div className="sm-copy"><strong>允许 AI 读取语织</strong><p className="sm-muted">开启后，AI 可在你要求模仿时调用风格接口；仍受取用规则约束。</p></div>
          <Toggle label="AI 读取语织" value={settings.modelToolEnabled} disabled={busy} onChange={(value) => { void run(() => updateSettings({ modelToolEnabled: value })) }} />
        </div>
      </div>

      <h3>更细的学习</h3>
      <div className="sm-card">
        <div className="sm-row">
          <div className="sm-copy"><strong>细织模式 <span className="sm-inline-tag">高阶</span></strong><p className="sm-muted">保留少量筛选、脱敏后的本人原文，让节奏和措辞更接近你。正文只在主动读取时加载。</p></div>
          <Toggle label="细织模式" value={settings.deepStyleEnabled} disabled={busy} onChange={(value) => {
            if (value) { setConsentKind('deep'); return }
            void run(() => updateSettings({ deepStyleEnabled: false }))
          }} />
        </div>
        {consentKind === 'deep' ? <div className="sm-banner"><strong>开启细织模式？</strong><p>插件将在本地保留少量筛选、脱敏后的本人原文，默认 90 天过期。你可随时查看、锁定或删除。</p><div className="sm-actions"><ActionButton primary onClick={() => { setConsentKind(undefined); void run(() => updateSettings({ deepStyleEnabled: true })) }}>我理解并开启</ActionButton><ActionButton onClick={() => { setConsentKind(undefined) }}>取消</ActionButton></div></div> : null}
        <div className="sm-row">
          <div className="sm-copy"><strong>小模型精炼 <span className="sm-inline-tag">可选成本</span></strong><p className="sm-muted">补充本地统计不擅长的语义偏好。会使用已配置模型，并受每日限额保护。</p></div>
          <Toggle label="小模型分析" value={settings.analysisEnabled} disabled={busy || status.analysisRoute === undefined} onChange={(value) => {
            if (value) { setConsentKind('analysis'); return }
            void run(() => updateSettings({ analysisEnabled: false }))
          }} />
        </div>
        {consentKind === 'analysis' ? <div className="sm-banner"><strong>开启小模型分析？</strong><p>筛选后的文本会批量发给已配置的分析模型，并产生额外模型成本。</p><div className="sm-actions"><ActionButton primary onClick={() => { setConsentKind(undefined); void run(() => updateSettings({ analysisEnabled: true })) }}>我理解并开启</ActionButton><ActionButton onClick={() => { setConsentKind(undefined) }}>取消</ActionButton></div></div> : null}
        <div className="sm-banner">
          {status.analysisRoute === undefined
            ? '尚未在插件 Host 配置中设定分析模型，因此无法开启。'
            : `路由：${status.analysisRoute.provider}/${status.analysisRoute.model}；今日 ${analysis.calls}/${analysis.limits.calls} 次，输入 ${analysis.inputTokens}/${analysis.limits.inputTokens} tokens，输出 ${analysis.outputTokens}/${analysis.limits.outputTokens} tokens。价格状态：${analysis.priceStatus}。`}
        </div>
      </div>
    </div>
  )

  const renderRules = () => (
    <div className="sm-section">
      <h3>你的表达规则</h3>
      <div className="sm-card">
        <div className="sm-grid2">
          <textarea className="sm-textarea" value={draft} maxLength={1000} placeholder="例如：先给结论，再解释原因。" onChange={(event) => { setDraft(event.currentTarget.value) }} />
          <div className="sm-section">
            <label>适用文体<br />
              <select className="sm-search" value={draftRegister} onChange={(event) => { setDraftRegister(event.currentTarget.value as Register) }}>
                {REGISTERS.map(item => <option key={item} value={item}>{REGISTER_LABELS[item]}</option>)}
              </select>
            </label>
            <div className="sm-actions">
              <ActionButton primary disabled={busy || draft.trim().length === 0} onClick={() => {
                void run(async () => {
                  await client.call('preference/add', { statement: draft.trim(), register: draftRegister })
                  setDraft('')
                  await refresh()
                }, '已添加并锁定这条规则。')
              }}>添加手动规则</ActionButton>
            </div>
            <p className="sm-muted">手动添加或修改的规则会自动锁定，后台学习不会覆盖它。</p>
          </div>
        </div>
      </div>
      <input className="sm-search" type="search" value={query} placeholder="搜索规则、类别或文体" onChange={(event) => { setQuery(event.currentTarget.value) }} />
      <div className="sm-list">
        {filtered.length === 0 ? <div className="sm-banner">还没有匹配的规则。安静学习会随着你的文字逐步累积。</div> : null}
        {filtered.map(item => (
          <div className="sm-rule" key={item.id}>
            <div className="sm-rule-head"><div className="sm-tags"><span className="sm-tag">{REGISTER_LABELS[item.register]}</span><span className="sm-tag">{item.category}</span><span className="sm-tag">{item.locked ? '已锁定' : item.status}</span></div><span className="sm-muted">{Math.round(item.confidence * 100)}% · {item.evidenceCount} 次证据</span></div>
            {editingId === item.id ? (
              <textarea className="sm-textarea" value={editingDraft} maxLength={1000} aria-label="编辑风格规则" onChange={(event) => { setEditingDraft(event.currentTarget.value) }} />
            ) : <p>{item.statement}</p>}
            <div className="sm-rule-actions">
              {editingId === item.id ? <>
                <button type="button" disabled={busy || editingDraft.trim().length === 0} onClick={() => { void run(async () => {
                  await client.call('preference/edit', { id: item.id, statement: editingDraft.trim(), expectedRevision: item.revision })
                  setEditingId(undefined)
                  await refresh()
                }, '规则已更新并锁定。') }}>保存</button>
                <button type="button" disabled={busy} onClick={() => { setEditingId(undefined) }}>取消</button>
              </> : <button type="button" disabled={busy} onClick={() => { setEditingId(item.id); setEditingDraft(item.statement); setConfirmKey(undefined) }}>编辑</button>}
              <button type="button" disabled={busy} onClick={() => { void run(async () => {
                await client.call('preference/state', { id: item.id, locked: !item.locked, expectedRevision: item.revision })
                await refresh()
              }) }}>{item.locked ? '解锁' : '锁定'}</button>
              <button type="button" disabled={busy} onClick={() => { void run(async () => {
                await client.call('preference/state', { id: item.id, status: item.status === 'suppressed' ? 'active' : 'suppressed', expectedRevision: item.revision })
                await refresh()
              }) }}>{item.status === 'suppressed' ? '恢复' : '忽略'}</button>
              <button type="button" disabled={busy} onClick={() => {
                const key = `preference:${item.id}`
                if (confirmKey !== key) { setConfirmKey(key); return }
                setConfirmKey(undefined)
                void run(async () => {
                  await client.call('preference/delete', { id: item.id, expectedRevision: item.revision })
                  await refresh()
                })
              }}>{confirmKey === `preference:${item.id}` ? '确认删除' : '删除'}</button>
              {confirmKey === `preference:${item.id}` ? <button type="button" onClick={() => { setConfirmKey(undefined) }}>取消</button> : null}
            </div>
          </div>
        ))}
      </div>
    </div>
  )

  const renderPreview = () => (
    <div className="sm-section">
      <h3>织入回答前，先看一眼</h3>
      <div className="sm-banner">这里展示即将交给 AI 的短上下文，不是存储本体。在对话中输入 <code>/liltloom</code>，可选择使用一次或整个会话。</div>
      <div className="sm-card">
        <div className="sm-actions">
          <select className="sm-search" value={previewRegister} onChange={(event) => { setPreviewRegister(event.currentTarget.value as Register) }}>{REGISTERS.map(item => <option key={item} value={item}>{REGISTER_LABELS[item]}</option>)}</select>
          <select className="sm-search" value={previewDepth} disabled={!settings.deepStyleEnabled} onChange={(event) => { setPreviewDepth(event.currentTarget.value as 'basic' | 'deep') }}><option value="basic">基础规则</option><option value="deep">Deep Style 样本</option></select>
          <label><input type="checkbox" checked={previewSelf} disabled={!settings.allowSelfContextInCompilation} onChange={(event) => { setPreviewSelf(event.currentTarget.checked) }} /> 包含自我描述</label>
          <ActionButton primary disabled={busy} onClick={() => { void run(async () => {
            setPreview(await client.call('preview/compile', { request: { register: previewRegister, depth: previewDepth, includeSelfContext: previewSelf } }))
          }) }}>生成预览</ActionButton>
        </div>
      </div>
      {preview === undefined ? null : (
        <div className="sm-card sm-section">
          <div className="sm-row"><span className="sm-muted">版本 {preview.profileRevision} · {preview.selectedPreferenceIds.length} 条规则 · 约 {preview.estimatedTokens}/{preview.tokenBudget} tokens</span><ActionButton onClick={() => { void globalThis.navigator.clipboard.writeText(preview.renderedContext).then(() => { setNotice('已复制预览上下文。') }) }}>复制</ActionButton></div>
          <pre className="sm-code">{preview.renderedContext}</pre>
        </div>
      )}
    </div>
  )

  const loadExemplars = async () => {
    setExemplars(await client.call('exemplars/list', {}))
  }

  const renderAdvanced = () => (
    <div className="sm-section">
      <h3>关于你</h3>
      <div className="sm-card sm-section">
        <p className="sm-muted">这部分始终保存为你手动输入的原始资料，与写作风格规则分开。只有下方授权开启时才能进入风格上下文。</p>
        <textarea className="sm-textarea" value={selfDraft} maxLength={50000} placeholder="你如何描述自己的性格、价值观和沟通习惯…" onChange={(event) => { setSelfDraft(event.currentTarget.value) }} />
        <div className="sm-actions">
          <ActionButton primary disabled={busy || selfDraft.trim().length === 0} onClick={() => { void run(async () => {
            setSelf(await client.call('self/update', { text: selfDraft.trim(), ...(self === null ? {} : { expectedRevision: self.revision }) }))
            await refresh()
          }, '自我描述已保存。') }}>保存</ActionButton>
          <ActionButton danger disabled={busy || self === null} onClick={() => {
            if (confirmKey !== 'self') { setConfirmKey('self'); return }
            setConfirmKey(undefined)
            void run(async () => { await client.call('self/delete', { ...(self === null ? {} : { expectedRevision: self.revision }) }); await refresh() })
          }}>{confirmKey === 'self' ? '确认删除' : '删除'}</ActionButton>
          {confirmKey === 'self' ? <ActionButton onClick={() => { setConfirmKey(undefined) }}>取消</ActionButton> : null}
          <label><input type="checkbox" checked={settings.allowSelfContextInCompilation} disabled={busy} onChange={(event) => { void run(() => updateSettings({ allowSelfContextInCompilation: event.currentTarget.checked })) }} /> 允许在风格编译时使用</label>
        </div>
      </div>

      <h3>细织模式保留策略</h3>
      <div className="sm-card">
        <div className="sm-row"><div className="sm-copy"><strong>自动过期天数</strong><p className="sm-muted">锁定的样本不自动过期。</p></div><div className="sm-control"><input type="number" min={1} max={3650} value={retentionDays} onChange={(event) => { setRetentionDays(Number(event.currentTarget.value)) }} /></div></div>
        <div className="sm-row"><div className="sm-copy"><strong>最多样本数</strong></div><div className="sm-control"><input type="number" min={1} max={10000} value={maxRecords} onChange={(event) => { setMaxRecords(Number(event.currentTarget.value)) }} /></div></div>
        <div className="sm-row"><div className="sm-copy"><strong>样本总字符上限</strong></div><div className="sm-control"><input type="number" min={100} max={10000000} value={maxTotalChars} onChange={(event) => { setMaxTotalChars(Number(event.currentTarget.value)) }} /></div></div>
        <div className="sm-actions" style={{ marginTop: 14 }}><ActionButton disabled={busy} onClick={() => { void run(() => updateSettings({ deepStyleRetentionDays: retentionDays, deepStyleMaxRecords: maxRecords, deepStyleMaxTotalChars: maxTotalChars }), '保留策略已更新。') }}>保存策略</ActionButton></div>
      </div>

      <h3>原文样本</h3>
      {exemplars === undefined ? (
        <div className="sm-card sm-section"><p className="sm-muted">为避免隐私正文被界面预加载，这些内容默认不读取。</p><div><ActionButton onClick={() => { void run(loadExemplars) }}>主动读取样本</ActionButton></div></div>
      ) : (
        <div className="sm-list">
          <div className="sm-actions"><ActionButton onClick={() => { void run(loadExemplars) }}>刷新</ActionButton><ActionButton danger disabled={exemplars.length === 0} onClick={() => {
            if (confirmKey !== 'exemplars:all') { setConfirmKey('exemplars:all'); return }
            setConfirmKey(undefined)
            void run(async () => { await client.call('exemplars/delete-all', {}); await loadExemplars(); await refresh() }, '全部原文样本已删除。')
          }}>{confirmKey === 'exemplars:all' ? '确认删除全部' : '删除全部'}</ActionButton>{confirmKey === 'exemplars:all' ? <ActionButton onClick={() => { setConfirmKey(undefined) }}>取消</ActionButton> : null}</div>
          {exemplars.length === 0 ? <div className="sm-banner">没有保留的原文样本。</div> : null}
          {exemplars.map(item => <div className="sm-rule" key={item.id}><div className="sm-rule-head"><div className="sm-tags"><span className="sm-tag">{REGISTER_LABELS[item.register]}</span><span className="sm-tag">{item.locked ? '已锁定' : `过期 ${item.expiresAt ?? '不过期'}`}</span></div><span className="sm-muted">质量 {Math.round(item.quality * 100)}%</span></div><div className="sm-excerpt">{item.text}</div><div className="sm-rule-actions"><button type="button" onClick={() => { void run(async () => { await client.call('exemplar/state', { id: item.id, locked: !item.locked, expectedRevision: item.revision }); await loadExemplars() }) }}>{item.locked ? '解锁' : '锁定'}</button><button type="button" onClick={() => { const key = `exemplar:${item.id}`; if (confirmKey !== key) { setConfirmKey(key); return }; setConfirmKey(undefined); void run(async () => { await client.call('exemplar/delete', { id: item.id, expectedRevision: item.revision }); await loadExemplars(); await refresh() }) }}>{confirmKey === `exemplar:${item.id}` ? '确认删除' : '删除'}</button>{confirmKey === `exemplar:${item.id}` ? <button type="button" onClick={() => { setConfirmKey(undefined) }}>取消</button> : null}</div></div>)}
        </div>
      )}
    </div>
  )

  const exportData = async () => {
    const data = await client.call('data/export', {})
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `liltloom-${new Date().toISOString().slice(0, 10)}.json`
    anchor.click()
    URL.revokeObjectURL(url)
  }

  const importFile = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.currentTarget.files?.[0]
    event.currentTarget.value = ''
    if (file === undefined) return
    void run(async () => {
      const data: unknown = JSON.parse(await file.text())
      await client.call('data/import', { data, mode: replaceImport ? 'replace' : 'merge' })
      setExemplars(undefined)
      await refresh()
    }, replaceImport ? '数据已替换导入。' : '数据已合并导入。')
  }

  const renderData = () => (
    <div className="sm-section">
      <h3>带走你的语织</h3>
      <div className="sm-card">
        <div className="sm-row"><div className="sm-copy"><strong>导出为可读 JSON</strong><p className="sm-muted">包含规则、Deep Style 样本和自我描述；可人工检查、编辑和迁移。</p></div><ActionButton disabled={busy} onClick={() => { void run(exportData) }}>导出 JSON</ActionButton></div>
        <div className="sm-row"><div className="sm-copy"><strong>导入 JSON</strong><p className="sm-muted">合并模式保留当前数据；替换模式会先删除当前的可迁移记忆。</p></div><div className="sm-control"><label><input type="checkbox" checked={replaceImport} onChange={(event) => { setReplaceImport(event.currentTarget.checked) }} /> 替换导入</label><label className="sm-btn">选择文件<input type="file" accept="application/json,.json" hidden onChange={importFile} /></label></div></div>
      </div>
      <h3>永久删除</h3>
      <div className="sm-card sm-row"><div className="sm-copy"><strong>清空个人风格记忆</strong><p className="sm-muted">删除规则、统计聚合、样本、激活、自我描述和学习水位。这个操作无法撤销。</p></div><div className="sm-control"><input className="sm-search" value={clearConfirmation} placeholder="输入 DELETE" aria-label="清空确认" onChange={(event) => { setClearConfirmation(event.currentTarget.value) }} /><ActionButton danger disabled={busy || clearConfirmation !== 'DELETE'} onClick={() => {
        void run(async () => { await client.call('data/clear', { confirmation: 'DELETE' }); setClearConfirmation(''); setExemplars(undefined); setPreview(undefined); await refresh() }, '个人风格记忆已清空。')
      }}>清空全部</ActionButton></div></div>
    </div>
  )

  return (
    <div className="sm-page" aria-busy={busy}>
      <style>{SETTINGS_STYLES}</style>
      <div className="sm-hero">
        <div className="sm-brand"><LiltloomMark /><div><div className="sm-title"><h2>Liltloom</h2><span>语织</span></div><p className="sm-muted">悄悄学会你的表达，需要时再织进回答。</p></div></div>
        <span className="sm-status" data-state={settings.observationState}><i />{settings.observationState === 'learning' ? '正在学习' : settings.observationState === 'paused' ? '已暂停' : '已关闭'}</span>
      </div>
      <div className="sm-metrics"><Metric value={status.learnedMessages} label="段表达" /><Metric value={status.preferences} label="条规则" /><Metric value={status.exemplars} label="份原文" /><Metric value={status.profileRevision} label="次演进" /></div>
      <nav className="sm-nav" aria-label="Liltloom 设置分区">
        {([['overview', '概览'], ['rules', '规则'], ['preview', '取用预览'], ['advanced', '高级'], ['data', '数据']] as const).map(([id, label]) => <button key={id} type="button" data-active={page === id} onClick={() => { setPage(id) }}>{label}</button>)}
      </nav>
      {error === undefined ? null : <div className="sm-banner sm-error" role="alert">{error}</div>}
      {notice === undefined ? null : <div className="sm-banner sm-success" role="status">{notice}</div>}
      {page === 'overview' ? renderOverview() : page === 'rules' ? renderRules() : page === 'preview' ? renderPreview() : page === 'advanced' ? renderAdvanced() : renderData()}
    </div>
  )
}
