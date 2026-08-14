# Acceptance Specification

Status: MVP v1 executable

Every release candidate runs `pnpm run check`, `pnpm run pack:check`, composition dump, and a real keyless Web-profile boot. The MVP accepts the following externally observable behavior:

| ID | Acceptance condition | Evidence |
|---|---|---|
| `ACC-OBS-001` | Base observation contributes no rendered runtime context or `style_context` schema and stores no complete raw message. | `tests/service.integration.spec.ts` quiet test |
| `ACC-OBS-002` | Only top-level human user messages learn; plugin and subagent sources do not. Code, logs, quotes, oversized text, and secret patterns are rejected. | service integration source test; `tests/features.spec.ts` |
| `ACC-OBS-003` | Reload/rescan does not double-count an already-watermarked event. | durable watermark reload test |
| `ACC-PREF-001` | User can add, edit, lock/unlock, suppress/restore, delete, query, and preview without a model turn. | preference CRUD and command preview tests |
| `ACC-CMP-001` | Compilation is deterministic, token-bounded, places locked/manual rules first, applies workspace overlay by feature key, and states current-instruction precedence. | `tests/compiler.spec.ts` |
| `ACC-ACT-001` | Activation appears in dynamic context; next-response activation is consumed at DSH `turn/end`; session activation is directly reversible. | activation integration tests plus service API |
| `ACC-ACT-002` | Configured automatic use applies only to matching workspace globs; disabled mode rejects activation; a current-message opt-out suppresses automatic context. | workspace/disabled/opt-out integration test |
| `ACC-API-001` | Human command is registered with `recordInput: false`. Model tool is absent by default, appears only after opt-in, and disappears after opt-out. | interface integration test |
| `ACC-DEEP-001` | Deep Style is off by default. When enabled, secrets are excluded, quotas apply, and the user can list, lock/unlock, delete, keep, or delete all excerpts. | Deep Style integration test and command behavior |
| `ACC-SELF-001` | Self description is separately stored, separately deletable, never inferred from conversation, and cannot enter compilation without separate authorization. | self-context integration tests |
| `ACC-MOD-001` | A failing analysis route does not fail learning, commits no model proposal, counts the attempt against resource limits, and does not fall back. | failing-LLM integration test; fixed single route in `src/service.ts` |
| `ACC-MOD-002` | Malformed/overconfident model output fails strict validation before state mutation. | `tests/schemas.spec.ts` proposal validation |
| `ACC-MIG-001` | Export/clear/import round-trip preserves portable user-visible data. Future schema versions reject before mutation. | migration integration test |
| `ACC-SCH-001` | All 11 public JSON Schemas compile together in strict JSON Schema 2020-12 mode. | `tests/schemas.spec.ts` |
| `ACC-DSH-001` | Bundle layer installs into a real Web profile, appears in `--dump-config`, initializes storage, and boots keylessly on a free port. | `spec/verification.md` |
| `ACC-UI-001` | A native Liltloom tab appears under Settings/Plugins and provides overview, rules, preview, advanced, and data views without a model turn. Its compact interface follows `DEC-006`. | real Web browser verification; `tests/package.spec.ts` |
| `ACC-UI-002` | Rules can be added, edited inline, and deleted with an in-page second confirmation; no browser `prompt` or `confirm` API is required. | real Web browser interaction in `spec/verification.md` |
| `ACC-UI-003` | Deep Style consent is explicit, exemplar bodies are lazy-read, and destructive clear requires typed `DELETE`. | real Web browser interaction; `src/client/SettingsTab.tsx` |
| `ACC-UI-004` | The private management RPC is schema-validated and loopback-only, and stale mutations can be rejected by revision. | `tests/rpc.spec.ts`; `src/rpc.ts` |

## Product evaluation after MVP

Before calling style quality “good,” a representative evaluation set should measure preference violation rate, deterministic style-feature distance, human resemblance rating, instruction/factual fidelity, false learning from pasted text, retrieval precision by register, token overhead, and user success correcting/deleting memory. Resemblance that harms task fidelity is a failed result.

## Explicit post-MVP gaps

The acceptance set does not claim a standalone dashboard, transactional replace rollback, persistent raw retry queue, embeddings, exact provider tokenization/pricing, revision-pair learning, semantic contradiction review, presets, remote sync, factual memory, or automatic personality inference.
