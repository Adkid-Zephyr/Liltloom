# Style Context API

Status: MVP v1 implemented

## Capability boundary

The MVP ships as one out-of-tree DSH bundle and provides one stable Cordis service at `ctx.styleMemory`. The native client UI, slash command, and optional model tool are consumers of this service; they do not own separate retrieval logic.

Representative public methods:

```ts
interface StyleMemoryService {
  status(): StyleMemoryStatus
  getSettings(): StyleMemorySettings
  updateSettings(patch: Partial<StyleMemorySettings>): Promise<StyleMemorySettings>
  query(request?: StyleQuery): PreferenceAtom[]
  compile(request?: CompileStyleRequest): StyleContextPacket
  activate(session: Session, request?: CompileStyleRequest, scope?: 'next-response' | 'session'): Promise<ActivationSet>
  deactivate(sessionId: string): Promise<boolean>
  addPreference(statement: string, register?: Register, workspace?: string): Promise<PreferenceAtom>
  editPreference(id: string, statement: string): Promise<PreferenceAtom>
  setPreferenceState(id: string, patch: { locked?: boolean; status?: PreferenceStatus }): Promise<PreferenceAtom>
  deletePreference(id: string): Promise<boolean>
  listExemplars(register?: Register): StyleExemplar[]
  setExemplarState(id: string, locked: boolean): Promise<StyleExemplar>
  deleteExemplar(id: string): Promise<boolean>
  exportData(): PortableStyleMemory
  importData(value: unknown, mode?: 'merge' | 'replace'): Promise<void>
}
```

`compile()` is synchronous and read-only. It never activates context or calls an analysis model. `activate()` enforces `disabled`, stores an immutable packet snapshot for the requested scope, and is reversible.

## Query vocabulary

```ts
interface StyleQuery {
  text?: string
  category?: PreferenceCategory
  register?: Register
  workspace?: string
  status?: PreferenceStatus
  locked?: boolean
  limit?: number
}
```

Filtering and text matching are deterministic and model-free. A workspace query includes global values plus that workspace's overlay.

## Compilation vocabulary

```ts
interface CompileStyleRequest {
  purpose?: 'imitate' | 'adapt' | 'review'       // default: imitate
  register?: Register                             // default: default
  workspace?: string
  depth?: 'basic' | 'deep'                        // default: basic
  budgetTokens?: number
  includeSelfContext?: boolean                    // default: false
  selectedPreferenceIds?: string[]
}
```

Rules:

- Explicit selected IDs constrain compilation after scope, register, and active-state checks.
- Locked/manual rules outrank inferred rules; workspace values replace a global inferred value with the same feature key.
- `depth: deep` fails with `DEEP_STYLE_DISABLED` unless the user enabled Deep Style.
- `includeSelfContext: true` fails with `SELF_CONTEXT_NOT_AUTHORIZED` unless separately authorized.
- The rendered context explicitly states that current instructions, facts, and safety outrank stored style.
- `estimatedTokens` uses the MVP's conservative estimator and never exceeds the effective configured budget.

## Activation

`activate(session, request, scope)` returns the durable `ActivationSet` defined in `02-domain-model.md`. Human command activation records `authorization: user-action`. The packet is a stable snapshot: later profile growth does not mutate an already activated session packet. `next-response` becomes `consumed` on DSH `turn/end`; `session` remains until direct deactivation.

Configured automatic use does not create a standing activation. The dynamic-context provider compiles against a persisted workspace allowlist at assembly time. A current message's explicit opt-out suppresses both stored activation and automatic use.

## Consumers

### Human command

`/liltloom preview` returns the exact bounded rendered projection. `/liltloom use` activates it without starting a model turn. Command input is not copied into the session log.

### Model-facing tool

The optional `style_context` tool is disabled by default because adding a tool schema changes ordinary requests. When enabled, it performs read-only compilation. In `explicit` mode it rejects a call unless the current human message explicitly requests the user's style. Its normal DSH tool result is replayable.

### Native browser UI

The client bundle mounts a tab under `Settings → Plugins`, a visual `/liltloom` command surface, and an activation-only input dock. It calls a dedicated DSH Connection RPC channel. Requests and responses are schema-validated, mutations support optimistic revision checks, and the Host registers the channel with `authority: loopback`. Exemplar bodies are not requested by initial status or settings loads.

### Future adapters

An MCP adapter may wrap the same service later. The JSON Schemas specify portable values; the private loopback client channel is not a public remote API.

## Stable business failures

- `STYLE_DISABLED`
- `STYLE_PROFILE_EMPTY`
- `STYLE_NOT_EXPLICITLY_REQUESTED`
- `DEEP_STYLE_DISABLED`
- `SELF_CONTEXT_NOT_AUTHORIZED`
- `PREFERENCE_NOT_FOUND`
- `EXEMPLAR_NOT_FOUND`

Operational validation, storage, corruption, and lifecycle failures remain ordinary Errors. A future remote adapter may map them into `api-error.schema.json` without changing service behavior.
