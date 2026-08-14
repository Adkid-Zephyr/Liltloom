# DSH Runtime Integration

Status: MVP v1 verified

## Compatibility baseline

This design was checked against DeepSeek Harness `0.1.0-rc.5`, repository commit `47f943859bef60e4160492346772ded9b24f765a` dated 2026-08-13.

DSH is in developer preview. Every supported DSH release or commit MUST pass the compatibility contract before the plugin advertises support.

## DSH seams

| Product responsibility | DSH seam | Constraint |
|---|---|---|
| Observe committed user facts | `session/event` | Callback is synchronous; copy/enqueue only and do no remote or storage I/O on the hot path. |
| Persist sidecar memory | `storage-domain` | JSON first; physical backend is not part of the public export format. |
| Expose internal API | Cordis context service `ctx.styleMemory` | Definition/provider/consumer boundary remains stable even if packages later split. |
| Make an activated packet model-visible | `ctx.systemPrompt.context()` dynamic context | Use a bounded packet snapshot; DSH records the resulting user-role runtime context for replay. |
| Optional Agent call | DSH tool consumer over `ctx.styleMemory` | Tool result follows normal durable tool-call/result behavior. Registration is a separate setting. |
| Native settings UI | `dsh.client` + `settings.plugins.tab` | Five views reuse the Host service through a private loopback RPC channel. |
| Human command surface | `/liltloom` + `commandUi.decorate` | Argument commands remain available; the bare command opens a visual action panel without forcing a model turn. |
| Active-state feedback | input dock slot | Mounts and polls only while an activation exists; deactivation removes the surface. |
| Client/Host transport | `connection.rpc.handle('/liltloom-rpc')` | Structured schema-validated RPC registered with `authority: loopback`; not a public remote API. |

## Critical ordering constraint

At the compatibility baseline, `packages/core/agent-loop/src/agent.ts` calls `systemPrompt.assemble()` before it invokes the `agent/pre-step` waterfall. The generated lifecycle document currently depicts the opposite order.

Therefore:

`DSH-001` — The implementation MUST NOT depend on `agent/pre-step` to decide dynamic context for the same already-assembling step.

`DSH-002` — UI/command activation MUST be persisted before the user message is submitted.

`DSH-003` — Persisted workspace allowlists are assembly-ready before a turn. A current-message style opt-out MUST be captured no later than `agent/inbox/inserted`, keyed by message ID, and cleared on discard or turn completion.

`DSH-004` — An optional model tool MAY compile style during the current turn; its result is ordinary model-visible tool output and MUST NOT be mistaken for preassembled dynamic context.

`DSH-005` — A compatibility test MUST assert actual assembly/hook ordering against every supported DSH target instead of trusting generated documentation alone.

## Observation pipeline

```text
session/event(user/message)
  -> synchronous source/session guard and queue admission
  -> enqueue a live { session, event } reference without copying text
  -> background source classification and deterministic features
  -> optional bounded small-model proposal
  -> schema validation + deterministic merge
  -> serialized storage-domain writes
  -> advance processing watermark
```

`DSH-006` — The `session/event` listener MUST NOT await analysis, provider calls, or durable sidecar writes.

`DSH-007` — Durable recovery MUST store only per-session watermark state, not queued raw message text. Startup rescans already loaded live sessions above that watermark.

`DSH-008` — The watermark advances only after the corresponding mutation is durably committed or the event is durably classified as ineligible.

`DSH-009` — Session resume, replay, and duplicate live delivery MUST converge to one evidence transition.

## Activation flow

### Preselected or configured activation

```text
user action / matching auto rule
  -> compile packet
  -> persist ActivationSet + authorization receipt
  -> systemPrompt.context provider reads active snapshot during assembly
  -> DSH projects the snapshot into replayable user-role context
  -> consume or retain activation according to scope
```

### Model tool activation

```text
user explicitly requests imitation
  -> Agent calls style_context
  -> tool enforces invocation policy and compiles packet
  -> durable tool result exposes the bounded packet
  -> Agent uses it in the continuation
```

The first path is cache-safe dynamic context. The second path is an explicit, replayable tool interaction. They share one compilation service; each consumer enforces its own authorization boundary before calling it.

## Quietness boundary

Observation, classification, consolidation, and sidecar persistence remain model-invisible. Registering a model tool or applying a dynamic packet changes the model request and therefore is outside observation-only equivalence. This difference is allowed only after the corresponding user setting or activation.

## Lifecycle and failure

`DSH-010` — Plugin disposal stops new admission, drains accepted deterministic writes, aborts running provider calls, clears timers, and closes owned storage resources.

`DSH-011` — Provider failure or resource exhaustion MUST NOT fail the Agent turn.

`DSH-012` — Missing storage MUST fail plugin startup with an actionable configuration error; the plugin MUST NOT create a private persistence path that bypasses `storage-domain`.

`DSH-013` — Subagent-origin sessions and non-human source kinds remain excluded even if their message text resembles the user's writing.

`DSH-014` — The package MUST export `./package.json`; DSH client-module discovery resolves that subpath before reading `dsh.client` and serving the browser bundle.

`DSH-015` — `/liltloom` is the primary human command. `/style-memory` remains a non-recording compatibility alias, while only the primary command receives the visual popup decoration.
