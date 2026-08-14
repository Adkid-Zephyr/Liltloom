# Vision v0.4

Status: Accepted on 2026-08-14 (Gate 0)

Product name and package: `Liltloom` (`语织`), `liltloom`

## Product statement

Liltloom is a quiet, portable, user-owned personal context layer for AI writing tools. Its name joins *lilt* (voice, rhythm, cadence) with *loom* (weaving over time). It continuously compiles eligible user-authored text into structured writing-style memory, stays out of the conversation by default, and exposes a callable interface that retrieves task-relevant style context when the user or an authorized Agent wants writing to resemble the user's own style. DeepSeek Harness is the first maintained host adapter, not part of Liltloom's canonical product identity.

The first product is writing-style memory. Advanced style recording is an explicit resource-bearing upgrade. A minimal self-authored personal description reserves the path toward a broader, compounding personal context system inspired by the LLM Wiki pattern.

## Primary promise

> Automatic learning, quiet storage, explicit retrieval, and user-selected application scope, with a callable interface for writing in the user's style.

`VIS-001` — Enabling the base plugin MUST start quiet learning without requiring repeated user maintenance.

`VIS-002` — Base observation MUST NOT change model requests, agent outputs, available tools, or the visible conversation.

`VIS-003` — Learned data MUST remain inspectable, editable, deletable, exportable, and owned by the user.

`VIS-004` — Model behavior MUST change only after an authorized retrieval or activation path selects context for use.

`VIS-005` — The primary integration artifact MUST be a structured Style Context API, not a prompt that users copy between chats.

`VIS-006` — Advanced recording MUST be optional and MUST disclose additional processing, retention, resource use, and any monetary cost before activation.

`VIS-007` — The product MUST distinguish user-authored facts from inferred observations.

## Product layers

### Layer 1 — Quiet Capture

The default layer observes eligible top-level human messages, extracts lightweight signals, and stores structured preference evidence. It produces no model-visible content.

### Layer 2 — Style Context API

A typed, host-neutral core validates, derives, and compiles task-relevant style context. Host adapters bind observation, persistence, authorization, model context, and UI to their runtime. The first adapter provides DSH-native services, an optional model-facing tool, UI actions, and replay-safe activation.

### Layer 3 — Deep Style

An opt-in mode automatically retains sparse, bounded, eligible excerpts. Future revisions may add revision pairs, register-specific patterns, or retrieval indexes. Excerpt retention increases storage; separately enabled semantic analysis increases model use. Each requires its own resource, privacy, expiry, and deletion disclosure.

### Layer 4 — Personal Context

The MVP accepts a user-authored self-description and may compile it into structured reference data. Automatic personality inference and a general life wiki are explicitly deferred.

## Meaning of quiet

Quiet is an observable product contract, not secrecy from the user.

- Quiet capture means no chat message, tool call, prompt contribution, toast, badge, or behavior change during observation.
- Quiet storage means sidecar persistence outside the conversation log and no duplicate full transcript archive by default.
- Quiet retrieval means users can browse or select stored information without initiating a model turn.
- Model use cannot be internally traceless: any information made model-visible must follow DSH's replayable logging contract. The ordinary chat UI MAY render that internal context unobtrusively.
- Plugin enablement and resource-bearing mode changes MUST remain visible, informed user actions.

## Product principles

1. **Compile, do not repeatedly rediscover.** Stable observations accumulate into maintained preference records.
2. **Structured memory before prompt text.** Prompt text is a bounded runtime projection, never the canonical store.
3. **User authority before inference.** Locked rules and self-authored statements outrank inferred tendencies.
4. **Context is selected, not dumped.** Retrieval chooses relevant records within a token budget.
5. **Cheap models propose; deterministic code commits.** Model output cannot directly overwrite authoritative state.
6. **Local-first and minimal by default.** Additional remote processing and source retention are opt-in or explicitly disclosed.
7. **Separate writing style from identity.** The plugin models expression preferences, not a hidden psychological diagnosis.
8. **Adapter-native and replay-safe.** Every adapter uses documented host seams rather than patching its agent loop. The DSH adapter uses DSH-native event, storage, tool, and context mechanisms.

## Primary user journeys

### Enable and forget

The user enables the plugin once. Deterministic learning runs quietly in the background; optional semantic analysis runs only after route configuration and consent under a bounded resource policy.

### Write like me

The user asks an Agent to write in their style. An authorized consumer calls the Style Context API, which compiles a task-specific packet from accumulated data. Named presets are a possible post-MVP consumer feature.

### Inspect and correct

The user uses the native Settings panel or direct command/API to search preference records, edit or lock a rule, and preview exactly what would be used. Sensitive excerpt bodies are fetched only after an explicit in-page action.

### Opt into deeper learning

The user enables Deep Style after reviewing its extra resource use, any monetary cost, source-retention, expiry, and remote-processing implications.

### Configure invocation behavior

Style use is `explicit` by default. The user may disable model use or switch to `configured-auto`. MVP automatic scope is an exact user-authored workspace allowlist; register, preset, task-class, and richer scope rules may follow later.

### Add minimal self context

The user enters a description of their own personality or communication preferences. The original description remains the source of truth; any structured compilation remains derivative and separately removable.

## Non-goals for the MVP

- General-purpose factual memory or RAG over all conversation content.
- Automatic diagnosis of personality, mental health, politics, religion, identity, or other sensitive traits.
- Hidden auto-impersonation on every response.
- A second full archive of DSH transcripts.
- Cross-user analytics, advertising profiles, or remote account sync.
- Fine-tuning a model on the user.
- A full personal LLM Wiki implementation.
- Guaranteed authorship attribution or forensic stylometry.

## Success definition

The MVP succeeds when:

1. Base mode is behaviorally indistinguishable from the plugin being absent until retrieval is authorized.
2. Users can retrieve a useful style packet without maintaining a manual master prompt.
3. Applying the packet improves preference adherence without reducing instruction fidelity or factual accuracy.
4. Users can understand, correct, export, and delete what the plugin learned.
5. Analysis stays within the configured resource policy and never silently escalates to a paid, larger, or otherwise disallowed route.

## Accepted vision decisions

- [`DEC-001`](decisions/DEC-001-style-invocation-policy.md) — explicit style use by default, configurable automatic use.
- [`DEC-002`](decisions/DEC-002-hybrid-analysis-and-resource-policy.md) — disclosed hybrid analysis with a multi-dimensional resource policy.
- [`DEC-003`](decisions/DEC-003-deep-style-excerpt-retention.md) — automatic bounded Deep Style excerpts with review and expiry.
- [`DEC-006`](decisions/DEC-006-liltloom-brand-and-interface.md) — Liltloom naming and a quiet, progressively disclosed native interface.
- [`DEC-007`](decisions/DEC-007-portable-core-first-adapter.md) — portable product core with DSH as the first maintained host adapter.
