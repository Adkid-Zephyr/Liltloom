# Open Decisions

Status: Closed for MVP v1

These questions are material and MUST be answered before the affected behavior becomes normative.

## Accepted decisions

- [`DEC-001`](decisions/DEC-001-style-invocation-policy.md) — explicit invocation by default with a settings-controlled automatic mode.
- [`DEC-002`](decisions/DEC-002-hybrid-analysis-and-resource-policy.md) — bounded hybrid analysis after one enablement disclosure.
- [`DEC-003`](decisions/DEC-003-deep-style-excerpt-retention.md) — automatic bounded Deep Style excerpts with review and expiry.
- [`DEC-004`](decisions/DEC-004-deep-style-retention-envelope.md) — 90-day, 200-record balanced Deep Style envelope.
- [`DEC-005`](decisions/DEC-005-profile-topology.md) — global base profile plus workspace overlays.
- [`DEC-006`](decisions/DEC-006-liltloom-brand-and-interface.md) — Liltloom is the accepted product name and its native UI stays quiet and progressively disclosed.
- [`DEC-007`](decisions/DEC-007-portable-core-first-adapter.md) — Liltloom is host-portable; DSH is the first maintained adapter.

## No Gate 1 blockers

No unresolved product decision currently blocks MVP implementation. Newly discovered material uncertainty must be recorded before behavior changes.

## Provisional non-blocking choices

- Repository and package name: `liltloom`.
- Product boundary: portable core plus host adapters; DSH Web is the first maintained adapter.
- Canonical portable contract: versioned Liltloom JSON and Style Context Packet. The DSH adapter binds these to `storage-domain`, using the JSON backend initially.
- MVP package layout: one bundle with an internal service boundary; split packages later if justified.

These may be renamed or reorganized without changing product behavior.
