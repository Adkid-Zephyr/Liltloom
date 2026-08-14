/** Small browser client over DSH Connection's private loopback RPC channel. */

import type { Context } from '@deepseek-ai/cordis'
import type { ConnectionHandle } from '@deepseek-ai/dsh-client-connection/client'
import {
  STYLE_MEMORY_RPC_CHANNEL,
  type StyleMemoryRpcClient,
  type StyleMemoryRpcEndpoint,
  type StyleMemoryRpcRequest,
  type StyleMemoryRpcResponse,
  type StyleMemoryRpcResult,
} from '../rpc-contract.js'

const READ_ENDPOINTS = new Set<StyleMemoryRpcEndpoint>([
  'status/read',
  'preferences/list',
  'preview/compile',
  'activation/read',
  'exemplars/list',
  'self/read',
  'data/export',
])

export class StyleMemoryClientError extends Error {
  constructor(public readonly code: string, message: string) {
    super(message)
    this.name = 'StyleMemoryClientError'
  }
}

/** Shared client face so every native surface observes mutations from its peers. */
export class BrowserStyleMemoryClient implements StyleMemoryRpcClient {
  private readonly listeners = new Set<() => void>()
  private readonly connection: ConnectionHandle

  constructor(ctx: Context) {
    // Host and Client packages augment the same Cordis key with different
    // process-local faces; this file is browser-only, so select that face.
    this.connection = ctx.get('connection') as unknown as ConnectionHandle
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener)
    return () => { this.listeners.delete(listener) }
  }

  async call<K extends StyleMemoryRpcEndpoint>(
    endpoint: K,
    request: StyleMemoryRpcRequest<K>,
    signal?: AbortSignal,
  ): Promise<StyleMemoryRpcResponse<K>> {
    const result = await this.connection.rpc.call(
      STYLE_MEMORY_RPC_CHANNEL,
      endpoint,
      request,
      signal,
    ) as StyleMemoryRpcResult<StyleMemoryRpcResponse<K>>
    if (!result.ok) throw new StyleMemoryClientError(result.error.code, result.error.message)
    if (!READ_ENDPOINTS.has(endpoint)) {
      for (const listener of [...this.listeners]) listener()
    }
    return result.value
  }
}
