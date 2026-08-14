# Product Behavior

Status: MVP v1 implemented

## Quiet observation

`OBS-001` — The base observer MUST consume only finalized DSH `session/event` facts and MUST NOT mutate the Agent, Session, inbox, prompt assembly, tool registry, or UI.

`OBS-002` — Only `user/message` records with `source.kind === 'user'` are eligible.

`OBS-003` — Sessions whose durable header has `origin === 'subagent'` MUST be excluded.

`OBS-004` — Plugin-attributed, cron, tool, assistant, imported synthetic, and system-generated content MUST be excluded.

`OBS-005` — Code blocks, logs, quoted material, generated drafts, and likely pasted documents SHOULD be excluded or down-weighted rather than treated as the user's native style.

`OBS-006` — Collection MUST be idempotent across restart, replay, and duplicate delivery by tracking a durable per-session processing watermark or equivalent identity.

`OBS-007` — Hot-path work SHOULD be deterministic and millisecond-scale. Remote or model-assisted analysis MUST run outside the event callback.

## Learning and consolidation

`LRN-001` — Learning MUST distinguish explicit preference from inferred observations derived from eligible original writing. `user-revision` remains a reserved import/provenance value until revision-pair learning is implemented.

`LRN-002` — Evidence priority MUST be: locked user rule; user-authored self-description or explicit preference; revision feedback; repeated strong observations; isolated weak observations.

`LRN-003` — A small analysis model MAY propose observations, classifications, or merges, but deterministic code MUST validate and commit the resulting state transition.

`LRN-004` — An inferred preference MUST carry confidence, evidence count, first-seen time, last-seen time, and provenance class.

`LRN-005` — Automatic learning MUST never resolve contradictory evidence by mutating a locked user rule. Explicit contradiction signals for unlocked semantic observations are post-MVP.

`LRN-006` — The system SHOULD maintain separate registers where evidence supports them, including default, technical, professional, social, and long-form writing.

`LRN-007` — Base mode MUST NOT retain full raw messages in the sidecar store.

## Retrieval

`RET-001` — Users MUST be able to list and search preference records without a model turn.

`RET-002` — MVP retrieval MUST support text, category, register, workspace, status, and locked-state filters. Confidence/source-class filters may be added compatibly later.

`RET-003` — A compiled result MUST be bounded by a caller-supplied or configured token budget.

`RET-004` — Compilation MUST rank explicit and locked preferences above inferred tendencies.

`RET-005` — Compilation MUST return structured records and MAY additionally return a rendered context projection.

`RET-006` — The result MUST identify the profile revision and selected preference IDs so use is reproducible.

## Activation

`ACT-001` — No preference may influence a model request without an authorized activation or invocation path.

`ACT-002` — Supported activation scopes MUST include next response and current session. Workspace and persistent defaults MAY follow after MVP validation.

`ACT-003` — Next-response activation MUST expire after one completed or terminally failed turn.

`ACT-004` — Session activation MUST be reversible without starting a model turn.

`ACT-005` — Model-visible style context MUST be emitted through a replayable DSH mechanism, preferably cache-safe dynamic prompt context.

`ACT-006` — Current user instructions, requested genre, factual accuracy, safety, and quoted-text fidelity MUST outrank stored style preferences.

`ACT-007` — Runtime context MUST NOT contain raw untrusted conversation excerpts unless Deep Style is enabled and the excerpt was accepted under its retention policy.

`ACT-008` — Invocation mode MUST support `disabled`, `explicit`, and `configured-auto`; `explicit` MUST be the default.

`ACT-009` — In MVP `configured-auto`, use MUST be authorized by the persisted workspace allowlist and MUST NOT apply outside a matching workspace. Register/preset/task-class rules are post-MVP.

`ACT-010` — A current user instruction to disable or ignore personal style MUST override every stored activation and automatic rule.

`ACT-011` — Enabling a model-facing `style_context` tool is a separate setting because adding a tool schema changes model requests. Quiet observation MUST remain available without that tool.

## Advanced recording

`ADV-001` — Deep Style MUST be disabled by default.

`ADV-002` — Enabling Deep Style MUST present its additional excerpt class, retention/quota policy, inspection, locking, and deletion controls. Small-model analysis has a separate disclosure and consent switch.

`ADV-003` — Deep Style MUST be capable of automatically retaining sparse, bounded user-authored exemplars and MAY retain revision pairs, register-specific phrase features, and optional retrieval indexes.

`ADV-004` — The user MUST be able to disable Deep Style without disabling base preference memory.

`ADV-005` — Disabling Deep Style MUST ask whether previously retained advanced data should be kept or deleted.

`ADV-006` — Every automatically retained excerpt MUST have a size bound, quota accounting, review state, expiry policy, and consent version.

`ADV-007` — Deep Style MUST reject likely pasted, quoted, generated, secret-bearing, tool, assistant, and system material unless the user explicitly approves that material as an exemplar.

`ADV-008` — Reaching the excerpt quota MUST stop or evict only according to an accepted policy; it MUST NOT silently expand storage.

## Analysis models

`MOD-001` — Analysis routing MUST be configured independently from the primary Agent route.

`MOD-002` — The plugin MUST NOT silently fall back to a more expensive model.

`MOD-003` — Configuration MUST bound batch size, daily call/input/output tokens, per-call output, single concurrency, timeout, retries, and backoff. Unknown pricing MUST remain unknown rather than becoming a fabricated monetary cap.

`MOD-004` — Reaching any resource limit MUST stop affected model-assisted work without affecting conversation behavior or deterministic memory. Opportunistic raw analysis samples are not persisted across restart.

`MOD-005` — Local deterministic extraction MUST remain usable when no analysis model is configured or available.

`MOD-011` — Install default MUST be deterministic-only. After an accepted analysis disclosure and an explicitly configured route, the enabled mode is deterministic extraction plus bounded small-model consolidation.

`MOD-012` — Analysis MUST name one exact DSH provider/model pair and fallback is always `none` in MVP. A future UI may add verified `local|free|low-cost` labels without guessing them.

`MOD-013` — A free or local route MAY have a zero or absent monetary cap, but MUST still have call, token, concurrency, timeout, retry, and batching limits.

## Minimal personal context

`SELF-001` — The MVP MUST allow the user to create, edit, read, and delete one self-authored personal description.

`SELF-002` — The original user text MUST remain the authoritative source.

`SELF-003` — A model MAY compile the description into structured reference fields, which MUST remain marked `derived` and traceable to the source revision.

`SELF-004` — The plugin MUST NOT automatically infer personality from ordinary conversation in the MVP.

`SELF-005` — Self context MUST NOT be included in style compilation unless the caller explicitly requests it and the user has authorized that use.

`SELF-006` — Style and self-context deletion MUST be independent.

## User control

`UX-001` — Users MUST be able to pause observation without deleting existing data.

`UX-002` — Users MUST be able to inspect why a preference exists at the level of provenance class and evidence count without exposing raw source text by default.

`UX-003` — Users MUST be able to edit, lock, suppress, restore, and delete a preference record.

`UX-004` — Locked user rules MUST NOT be changed by automatic consolidation.

`UX-005` — Users MUST be able to preview the exact bounded context packet that would be applied.

`UX-006` — User controls MUST expose invocation mode, workspace automatic use, model-tool enablement, analysis state, Deep Style state, self-context use, and observation pause independently. Analysis route/resource ceilings are deployment configuration and must be visible in status/documentation.
