# MVP Goal

Status: Accepted and implementation-authorized on 2026-08-14

Deliver a DeepSeek Harness plugin that quietly turns eligible user-authored conversation into a portable, editable writing-style profile, and exposes only user-authorized, task-bounded style context when the user wants an Agent to write like them.

The MVP is done when all of the following are true:

1. Installing it on DSH `0.1.0-rc.5` starts local deterministic learning without changing ordinary model requests.
2. The user can inspect, add, edit, lock, suppress, delete, export, and import style rules.
3. The user can explicitly activate a bounded style packet; configured automatic use remains constrained to user-authored workspace rules.
4. An optional model-facing `style_context` tool can retrieve the same packet through the shared service.
5. Deep Style is off by default and, when enabled, retains only sparse eligible excerpts under the accepted 90-day/200-record envelope.
6. Optional small-model consolidation is separately routed, resource-bounded, failure-isolated, and never falls back to an unapproved route.
7. The user can store one authoritative self-description and explicitly include its derived reference in style compilation.
8. Keyless automated tests prove quiet observation, idempotency, precedence, retention, deletion, migration, replayable activation, and current DSH ordering compatibility.

Non-goals remain general factual memory, personality inference from conversation, remote sync, embeddings, fine-tuning, and a full personal wiki.
