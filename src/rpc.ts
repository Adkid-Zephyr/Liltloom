/** Loopback-only structured RPC surface used by the native DSH client UI. */

import type { Context } from '@deepseek-ai/cordis'
import type { RpcResult } from '@deepseek-ai/dsh-host-apiproxy/api'
import type {} from '@deepseek-ai/dsh-client-connection'
import { z } from 'zod'
import { STYLE_MEMORY_RPC_CHANNEL, type StyleMemoryRpcEndpoint } from './rpc-contract.js'
import type StyleMemory from './service.js'

const registerSchema = z.enum(['default', 'technical', 'professional', 'social', 'longform'])
const statusSchema = z.enum(['active', 'suppressed', 'review'])
const idSchema = z.string().min(1).max(512)
const sessionIdSchema = z.string().min(1).max(512)
const expectedRevisionSchema = z.number().int().positive().optional()
const emptySchema = z.object({}).strict()

const querySchema = z.object({
  register: registerSchema.optional(),
  category: z.enum(['tone', 'verbosity', 'structure', 'sentence-rhythm', 'vocabulary', 'formatting', 'avoidance', 'explicit-rule']).optional(),
  workspace: z.string().max(4096).optional(),
  status: statusSchema.optional(),
  locked: z.boolean().optional(),
  text: z.string().max(1000).optional(),
  limit: z.number().int().min(1).max(1000).optional(),
}).strict()

const compileSchema = z.object({
  purpose: z.enum(['imitate', 'adapt', 'review']).optional(),
  register: registerSchema.optional(),
  workspace: z.string().max(4096).optional(),
  depth: z.enum(['basic', 'deep']).optional(),
  budgetTokens: z.number().int().min(100).max(10000).optional(),
  includeSelfContext: z.boolean().optional(),
  selectedPreferenceIds: z.array(idSchema).max(1000).optional(),
}).strict()

const settingsPatchSchema = z.object({
  observationState: z.enum(['off', 'learning', 'paused']).optional(),
  invocationMode: z.enum(['disabled', 'explicit', 'configured-auto']).optional(),
  modelToolEnabled: z.boolean().optional(),
  autoWorkspaceGlobs: z.array(z.string().min(1).max(4096)).max(100).optional(),
  deepStyleEnabled: z.boolean().optional(),
  deepStyleConsentVersion: z.number().int().positive().nullable().optional(),
  deepStyleRetentionDays: z.number().int().min(1).max(3650).optional(),
  deepStyleMaxExcerptChars: z.number().int().min(100).max(100000).optional(),
  deepStyleMaxRecords: z.number().int().min(1).max(10000).optional(),
  deepStyleMaxTotalChars: z.number().int().min(100).max(10000000).optional(),
  analysisEnabled: z.boolean().optional(),
  analysisConsentVersion: z.number().int().positive().nullable().optional(),
  allowSelfContextInCompilation: z.boolean().optional(),
}).strict()

const payloadSchemas: Record<StyleMemoryRpcEndpoint, z.ZodType> = {
  'status/read': emptySchema,
  'preferences/list': z.object({ query: querySchema.optional() }).strict(),
  'preference/add': z.object({ statement: z.string().min(1).max(1000), register: registerSchema.optional(), workspace: z.string().max(4096).optional() }).strict(),
  'preference/edit': z.object({ id: idSchema, statement: z.string().min(1).max(1000), expectedRevision: expectedRevisionSchema }).strict(),
  'preference/state': z.object({ id: idSchema, locked: z.boolean().optional(), status: statusSchema.optional(), expectedRevision: expectedRevisionSchema }).strict().refine(value => value.locked !== undefined || value.status !== undefined, 'state patch is empty'),
  'preference/delete': z.object({ id: idSchema, expectedRevision: expectedRevisionSchema }).strict(),
  'preview/compile': z.object({ request: compileSchema.optional() }).strict(),
  'activation/read': z.object({ sessionId: sessionIdSchema }).strict(),
  'activation/activate': z.object({ sessionId: sessionIdSchema, request: compileSchema.optional(), scope: z.enum(['next-response', 'session']).optional() }).strict(),
  'activation/deactivate': z.object({ sessionId: sessionIdSchema }).strict(),
  'exemplars/list': z.object({ register: registerSchema.optional() }).strict(),
  'exemplar/state': z.object({ id: idSchema, locked: z.boolean(), expectedRevision: expectedRevisionSchema }).strict(),
  'exemplar/delete': z.object({ id: idSchema, expectedRevision: expectedRevisionSchema }).strict(),
  'exemplars/delete-all': emptySchema,
  'settings/update': z.object({ patch: settingsPatchSchema, expectedUpdatedAt: z.string().datetime().optional() }).strict(),
  'self/read': emptySchema,
  'self/update': z.object({ text: z.string().min(1).max(50000), expectedRevision: expectedRevisionSchema }).strict(),
  'self/delete': z.object({ expectedRevision: expectedRevisionSchema }).strict(),
  'data/export': emptySchema,
  'data/import': z.object({ data: z.unknown(), mode: z.enum(['merge', 'replace']).optional() }).strict(),
  'data/clear': z.object({ confirmation: z.literal('DELETE') }).strict(),
}

function success(value: unknown): RpcResult<unknown> {
  return { ok: true, value }
}

function badRequest(issues: z.core.$ZodIssue[]): RpcResult<unknown> {
  return { ok: false, error: { code: 'bad-request', message: 'Invalid Liltloom request.', details: { issues } } }
}

function internal(error: unknown): RpcResult<unknown> {
  return { ok: false, error: { code: 'internal', message: error instanceof Error ? error.message : String(error), details: {} } }
}

function conflict(expected: number, actual: number): RpcResult<unknown> {
  return {
    ok: false,
    error: {
      code: 'settings-conflict',
      message: `Liltloom changed in another view (expected revision ${expected}, actual ${actual}).`,
      details: { ns: 'liltloom', expected, actual },
    },
  }
}

function assertRevision(expected: number | undefined, actual: number): RpcResult<unknown> | undefined {
  return expected === undefined || expected === actual ? undefined : conflict(expected, actual)
}

/** Create a transport-independent handler for tests and Connection registration. */
export function createStyleMemoryRpcHandler(service: StyleMemory) {
  return async (rawEndpoint: string, rawPayload: unknown): Promise<RpcResult<unknown>> => {
    if (!(rawEndpoint in payloadSchemas)) {
      return { ok: false, error: { code: 'bad-request', message: 'Unknown Liltloom endpoint.', details: { issues: [] } } }
    }
    const endpoint = rawEndpoint as StyleMemoryRpcEndpoint
    const parsed = payloadSchemas[endpoint].safeParse(rawPayload)
    if (!parsed.success) return badRequest(parsed.error.issues)
    const payload = parsed.data as Record<string, unknown>
    try {
      switch (endpoint) {
        case 'status/read': return success(service.status())
        case 'preferences/list': return success(service.query((payload.query ?? {}) as never))
        case 'preference/add': return success(await service.addPreference(payload.statement as string, (payload.register ?? 'default') as never, payload.workspace as string | undefined))
        case 'preference/edit': {
          const current = service.query({ limit: 1000 }).find(item => item.id === payload.id)
          if (current === undefined) throw new Error('PREFERENCE_NOT_FOUND')
          const stale = assertRevision(payload.expectedRevision as number | undefined, current.revision)
          return stale ?? success(await service.editPreference(current.id, payload.statement as string))
        }
        case 'preference/state': {
          const current = service.query({ limit: 1000 }).find(item => item.id === payload.id)
          if (current === undefined) throw new Error('PREFERENCE_NOT_FOUND')
          const stale = assertRevision(payload.expectedRevision as number | undefined, current.revision)
          if (stale !== undefined) return stale
          return success(await service.setPreferenceState(current.id, {
            ...(payload.locked === undefined ? {} : { locked: payload.locked as boolean }),
            ...(payload.status === undefined ? {} : { status: payload.status as never }),
          }))
        }
        case 'preference/delete': {
          const current = service.query({ limit: 1000 }).find(item => item.id === payload.id)
          if (current !== undefined) {
            const stale = assertRevision(payload.expectedRevision as number | undefined, current.revision)
            if (stale !== undefined) return stale
          }
          return success({ deleted: await service.deletePreference(payload.id as string) })
        }
        case 'preview/compile': return success(service.compile((payload.request ?? {}) as never))
        case 'activation/read': return success(service.activation(payload.sessionId as string) ?? null)
        case 'activation/activate': {
          const sessionId = payload.sessionId as string
          const session = service.sessionById(sessionId)
          if (session === undefined) {
            return { ok: false, error: { code: 'session-not-found', message: `Session ${sessionId} was not found.`, details: { sessionId: sessionId as never } } }
          }
          return success(await service.activate(session, (payload.request ?? {}) as never, (payload.scope ?? 'next-response') as never))
        }
        case 'activation/deactivate': return success({ deactivated: await service.deactivate(payload.sessionId as string) })
        case 'exemplars/list': return success(service.listExemplars(payload.register as never))
        case 'exemplar/state': {
          const current = service.listExemplars().find(item => item.id === payload.id)
          if (current === undefined) throw new Error('EXEMPLAR_NOT_FOUND')
          const stale = assertRevision(payload.expectedRevision as number | undefined, current.revision)
          return stale ?? success(await service.setExemplarState(current.id, payload.locked as boolean))
        }
        case 'exemplar/delete': {
          const current = service.listExemplars().find(item => item.id === payload.id)
          if (current !== undefined) {
            const stale = assertRevision(payload.expectedRevision as number | undefined, current.revision)
            if (stale !== undefined) return stale
          }
          return success({ deleted: await service.deleteExemplar(payload.id as string) })
        }
        case 'exemplars/delete-all': return success({ deleted: await service.deleteAllExemplars() })
        case 'settings/update': {
          const current = service.getSettings()
          const expectedUpdatedAt = payload.expectedUpdatedAt as string | undefined
          if (expectedUpdatedAt !== undefined && expectedUpdatedAt !== current.updatedAt) {
            return conflict(Date.parse(expectedUpdatedAt), Date.parse(current.updatedAt))
          }
          return success(await service.updateSettings(payload.patch as never))
        }
        case 'self/read': return success(service.getSelfDescription() ?? null)
        case 'self/update': {
          const current = service.getSelfDescription()
          const stale = current === undefined ? undefined : assertRevision(payload.expectedRevision as number | undefined, current.revision)
          return stale ?? success(await service.setSelfDescription(payload.text as string))
        }
        case 'self/delete': {
          const current = service.getSelfDescription()
          const stale = current === undefined ? undefined : assertRevision(payload.expectedRevision as number | undefined, current.revision)
          return stale ?? success({ deleted: await service.deleteSelfDescription() })
        }
        case 'data/export': return success(service.exportData())
        case 'data/import': {
          await service.importData(payload.data, (payload.mode ?? 'merge') as never)
          return success({ imported: true })
        }
        case 'data/clear': {
          await service.clearUserData()
          return success({ cleared: true })
        }
      }
    } catch (error) {
      return internal(error)
    }
  }
}

/** Register the dedicated channel under Connection's loopback trust fence. */
export function installStyleMemoryRpc(ctx: Context, service: StyleMemory): void {
  ctx.connection.rpc.handle(
    STYLE_MEMORY_RPC_CHANNEL,
    createStyleMemoryRpcHandler(service),
    { authority: 'loopback' },
  )
}
