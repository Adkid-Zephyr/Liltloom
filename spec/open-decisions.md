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

## No Gate 1 blockers

No unresolved product decision currently blocks MVP implementation. Newly discovered material uncertainty must be recorded before behavior changes.

## Provisional non-blocking choices

- Repository and package name: `dsh-liltloom`.
- MVP surface target: DSH Web profile first.
- Canonical persistence: DSH storage-domain, JSON backend initially.
- MVP package layout: one bundle with an internal service boundary; split packages later if justified.

These may be renamed or reorganized without changing product behavior.
