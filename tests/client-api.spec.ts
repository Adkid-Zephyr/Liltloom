import { describe, expect, it, vi } from 'vitest'
import type { Context } from '@deepseek-ai/cordis'
import { BrowserStyleMemoryClient, StyleMemoryClientError } from '../src/client/api.js'

function contextWith(call: ReturnType<typeof vi.fn>): Context {
  return { get: () => ({ rpc: { call } }) } as unknown as Context
}

describe('browser Liltloom RPC client', () => {
  it('unwraps results and only invalidates observers after mutations', async () => {
    const call = vi.fn()
      .mockResolvedValueOnce({ ok: true, value: { marker: 'status' } })
      .mockResolvedValueOnce({ ok: true, value: { marker: 'settings' } })
    const client = new BrowserStyleMemoryClient(contextWith(call))
    const listener = vi.fn()
    client.subscribe(listener)

    await client.call('status/read', {})
    expect(listener).not.toHaveBeenCalled()
    await client.call('settings/update', { patch: { observationState: 'paused' } })
    expect(listener).toHaveBeenCalledTimes(1)
    expect(call).toHaveBeenNthCalledWith(1, '/liltloom-rpc', 'status/read', {}, undefined)
  })

  it('turns structured business failures into client errors', async () => {
    const call = vi.fn().mockResolvedValue({
      ok: false,
      error: { code: 'settings-conflict', message: 'stale view', details: {} },
    })
    const client = new BrowserStyleMemoryClient(contextWith(call))
    await expect(client.call('status/read', {})).rejects.toEqual(
      expect.objectContaining<Partial<StyleMemoryClientError>>({ code: 'settings-conflict', message: 'stale view' }),
    )
  })
})
