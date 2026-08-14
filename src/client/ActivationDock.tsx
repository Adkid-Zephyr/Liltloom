import { useCallback, useEffect, useState } from 'react'
import type { PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import type { ActivationSet } from '../types.js'
import type { BrowserStyleMemoryClient } from './api.js'
import { DOCK_STYLES } from './styles.js'

export interface ActivationDockInjected {
  client: BrowserStyleMemoryClient
}

type ActivationDockProps = PropsRuntime<'conversation.input.dock'> & ActivationDockInjected

/** The only persistent conversation chrome: absent unless style use is active. */
export function ActivationDock({ sessionId, client }: ActivationDockProps) {
  const [activation, setActivation] = useState<ActivationSet | null>(null)
  const [pending, setPending] = useState(false)

  const refresh = useCallback(async () => {
    try {
      setActivation(await client.call('activation/read', { sessionId: String(sessionId) }))
    } catch {
      setActivation(null)
    }
  }, [client, sessionId])

  useEffect(() => {
    void refresh()
    return client.subscribe(() => { void refresh() })
  }, [client, refresh])

  useEffect(() => {
    if (activation === null) return
    const timer = globalThis.setInterval(() => { void refresh() }, 2000)
    return () => { globalThis.clearInterval(timer) }
  }, [activation, refresh])

  if (activation === null) return null
  const packet = activation.packet
  const registerLabel = ({ default: '默认', technical: '技术', professional: '专业', social: '社交', longform: '长文' } as const)[packet.register]
  const detail = `${registerLabel} · ${packet.selectedPreferenceIds.length} 条规则 · ${activation.scope === 'session' ? '本会话' : '下一次回复'}`
  return (
    <div className="sm-dock" data-liltloom-active>
      <style>{DOCK_STYLES}</style>
      <div className="sm-dock-bar">
        <span className="sm-dock-dot" aria-hidden="true" />
        <span className="sm-dock-title">Liltloom 已织入</span>
        <span className="sm-dock-detail">{detail}</span>
        <button
          className="sm-dock-btn"
          type="button"
          disabled={pending}
          aria-label="停止使用风格"
          title="停止使用风格"
          onClick={() => {
            setPending(true)
            void client.call('activation/deactivate', { sessionId: String(sessionId) })
              .then(() => { setActivation(null) })
              .finally(() => { setPending(false) })
          }}
        >×</button>
      </div>
    </div>
  )
}
