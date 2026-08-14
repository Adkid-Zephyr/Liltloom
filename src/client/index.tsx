/** DSH Web client entry: Settings page, slash popup, and activation-only dock. */

import type { Context } from '@deepseek-ai/cordis'
import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client'
import type {} from '@deepseek-ai/dsh-client-ui-settings/client'
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client'
import type { CommandUiContract, SelectOption } from '@deepseek-ai/dsh-client-ui-commands/client'
import type { ClientSessionContext } from '@deepseek-ai/dsh-client-ui-input-trigger/client'
import { ActivationDock, type ActivationDockInjected } from './ActivationDock.js'
import { BrowserStyleMemoryClient } from './api.js'
import { StyleMemorySettingsTab, type StyleMemorySettingsInjected } from './SettingsTab.js'

declare module '@deepseek-ai/cordis' {
  interface Context {
    styleMemoryUi: BrowserStyleMemoryClient
  }
}

/** Service dependencies; package dependencies are declared in package.json's dsh.client manifest. */
export const inject = ['connection', 'slots', 'commandUi']

function options(
  active: Awaited<ReturnType<BrowserStyleMemoryClient['call']>> | null,
  learning: 'off' | 'learning' | 'paused',
): readonly SelectOption[] {
  return [
    { id: 'use-next', label: '织入下一次回复', detail: '只使用一次，回复完成后自动撤下' },
    { id: 'use-session', label: '织入整个会话', detail: '持续对齐，直到你手动停止' },
    ...(active === null ? [] : [{ id: 'off', label: '移除当前语织', detail: '立即撤销这个会话的风格上下文', active: true }]),
    learning === 'learning'
      ? { id: 'pause', label: '暂停静默学习', detail: '保留现有记忆，暂时不再记录新特征' }
      : { id: 'resume', label: '继续静默学习', detail: '恢复记录你新的写作特征' },
  ]
}

/** Mount all three native surfaces over one shared, mutation-aware client. */
export function apply(ctx: ClientContext): void {
  const client = new BrowserStyleMemoryClient(ctx as Context)
  ctx.provide('styleMemoryUi', client)

  ctx.slots.inject('settings.plugins.tab', () => ctx.slots.register({
    name: 'settings.plugins.tab',
    id: 'liltloom',
    order: 5,
    label: 'Liltloom',
    inject: (): StyleMemorySettingsInjected => ({ client }),
  }, StyleMemorySettingsTab))

  ctx.slots.inject('conversation.input.dock', () => ctx.slots.register({
    name: 'conversation.input.dock',
    id: 'liltloom-activation',
    order: 30,
    inject: (): ActivationDockInjected => ({ client }),
  }, ActivationDock))

  const command = ctx.get('commandUi') as CommandUiContract
  ctx.effect(() => command.decorate({
    name: 'liltloom',
    available: (_session: ClientSessionContext) => true,
    ui: {
      kind: 'popupSelect',
      options: async (session, signal) => {
        const [active, status] = await Promise.all([
          client.call('activation/read', { sessionId: String(session.sessionId) }, signal),
          client.call('status/read', {}, signal),
        ])
        return options(active, status.settings.observationState)
      },
      onSelect: async (option, session) => {
        const sessionId = String(session.sessionId)
        if (option.id === 'off') {
          await client.call('activation/deactivate', { sessionId })
          return
        }
        if (option.id === 'pause' || option.id === 'resume') {
          const status = await client.call('status/read', {})
          await client.call('settings/update', {
            patch: { observationState: option.id === 'pause' ? 'paused' : 'learning' },
            expectedUpdatedAt: status.settings.updatedAt,
          })
          return
        }
        const status = await client.call('status/read', {})
        await client.call('activation/activate', {
          sessionId,
          request: {
            register: 'default',
            depth: status.settings.deepStyleEnabled ? 'deep' : 'basic',
          },
          scope: option.id === 'use-session' ? 'session' : 'next-response',
        })
      },
    },
  }), 'liltloom: slash popup decoration')
}
