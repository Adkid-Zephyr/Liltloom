# MVP Goal

Status: Accepted and implementation-authorized on 2026-08-14

Deliver a host-portable personal writing-style memory layer that quietly turns eligible user-authored text into an editable profile and exposes only user-authorized, task-bounded style context. Ship DeepSeek Harness as the first maintained host adapter, without making DSH part of the product's canonical data or protocol identity.

The MVP is done when all of the following are true:

1. The host-neutral core exports types, schemas, deterministic learning primitives, and Style Context compilation without importing a DSH runtime package.
2. Installing the DSH adapter on DSH `0.1.0-rc.5` starts local deterministic learning without changing ordinary model requests.
3. The user can inspect, add, edit, lock, suppress, delete, export, and import style rules.
4. The user can explicitly activate a bounded style packet; configured automatic use remains constrained to user-authored workspace rules.
5. An optional model-facing `style_context` tool can retrieve the same packet through the shared service.
6. Deep Style is off by default and, when enabled, retains only sparse eligible excerpts under the accepted 90-day/200-record envelope.
7. Optional small-model consolidation is separately routed, resource-bounded, failure-isolated, and never falls back to an unapproved route.
8. The user can store one authoritative self-description and explicitly include its derived reference in style compilation.
9. Keyless automated tests prove portable-core loading, quiet observation, idempotency, precedence, retention, deletion, migration, replayable activation, and current DSH ordering compatibility.

Non-goals remain general factual memory, personality inference from conversation, remote sync, embeddings, fine-tuning, and a full personal wiki.
