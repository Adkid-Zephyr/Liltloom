/** Browser-safe contract for Liltloom's private management channel. */

import type {
  ActivationSet,
  CompileStyleRequest,
  PortableStyleMemory,
  PreferenceAtom,
  Register,
  SelfDescription,
  StyleContextPacket,
  StyleExemplar,
  StyleMemorySettings,
  StyleMemoryStatus,
  StyleQuery,
} from './types.js'

export const STYLE_MEMORY_RPC_CHANNEL = '/liltloom-rpc'

export interface StyleMemoryRpcMethods {
  'status/read': { request: Record<string, never>; response: StyleMemoryStatus }
  'preferences/list': { request: { query?: StyleQuery }; response: PreferenceAtom[] }
  'preference/add': { request: { statement: string; register?: Register; workspace?: string }; response: PreferenceAtom }
  'preference/edit': { request: { id: string; statement: string; expectedRevision?: number }; response: PreferenceAtom }
  'preference/state': { request: { id: string; locked?: boolean; status?: PreferenceAtom['status']; expectedRevision?: number }; response: PreferenceAtom }
  'preference/delete': { request: { id: string; expectedRevision?: number }; response: { deleted: boolean } }
  'preview/compile': { request: { request?: CompileStyleRequest }; response: StyleContextPacket }
  'activation/read': { request: { sessionId: string }; response: ActivationSet | null }
  'activation/activate': { request: { sessionId: string; request?: CompileStyleRequest; scope?: ActivationSet['scope'] }; response: ActivationSet }
  'activation/deactivate': { request: { sessionId: string }; response: { deactivated: boolean } }
  'exemplars/list': { request: { register?: Register }; response: StyleExemplar[] }
  'exemplar/state': { request: { id: string; locked: boolean; expectedRevision?: number }; response: StyleExemplar }
  'exemplar/delete': { request: { id: string; expectedRevision?: number }; response: { deleted: boolean } }
  'exemplars/delete-all': { request: Record<string, never>; response: { deleted: number } }
  'settings/update': { request: { patch: Partial<Omit<StyleMemorySettings, 'schemaVersion' | 'updatedAt'>>; expectedUpdatedAt?: string }; response: StyleMemorySettings }
  'self/read': { request: Record<string, never>; response: SelfDescription | null }
  'self/update': { request: { text: string; expectedRevision?: number }; response: SelfDescription }
  'self/delete': { request: { expectedRevision?: number }; response: { deleted: boolean } }
  'data/export': { request: Record<string, never>; response: PortableStyleMemory }
  'data/import': { request: { data: unknown; mode?: 'merge' | 'replace' }; response: { imported: true } }
  'data/clear': { request: { confirmation: 'DELETE' }; response: { cleared: true } }
}

export type StyleMemoryRpcEndpoint = keyof StyleMemoryRpcMethods
export type StyleMemoryRpcRequest<K extends StyleMemoryRpcEndpoint> = StyleMemoryRpcMethods[K]['request']
export type StyleMemoryRpcResponse<K extends StyleMemoryRpcEndpoint> = StyleMemoryRpcMethods[K]['response']

export interface StyleMemoryRpcError {
  code: string
  message: string
}

export type StyleMemoryRpcResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: StyleMemoryRpcError }

export interface StyleMemoryRpcClient {
  call<K extends StyleMemoryRpcEndpoint>(
    endpoint: K,
    request: StyleMemoryRpcRequest<K>,
    signal?: AbortSignal,
  ): Promise<StyleMemoryRpcResponse<K>>
}
