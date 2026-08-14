# SDD Standard

Status: MVP v1 exercised

This project uses Specification-Driven Development. Specifications define observable behavior and durable data before implementation details are accepted.

## Normative language

- **MUST / MUST NOT**: required for conformance.
- **SHOULD / SHOULD NOT**: expected unless an ADR records a concrete exception.
- **MAY**: optional behavior that must not weaken a MUST.

## Sources of truth

Authority descends in this order:

1. Accepted decisions and ADRs.
2. Normative requirements in `spec/`.
3. Executable schemas.
4. Acceptance tests linked from requirement IDs.
5. Implementation.

Prose examples illustrate a requirement but do not override it.

## Requirement identifiers

Every externally observable requirement has a stable identifier:

| Prefix | Area |
|---|---|
| `VIS` | Product vision and invariants |
| `OBS` | Quiet observation |
| `LRN` | Learning and consolidation |
| `RET` | Retrieval |
| `ACT` | Activation and model use |
| `API` | Style Context API |
| `ADV` | Advanced recording |
| `MOD` | Analysis models and resource policy |
| `SELF` | Self-authored personal context |
| `PRV` | Privacy and data handling |
| `STO` | Storage |
| `MIG` | Export, import, and migration |
| `UX` | User experience |
| `TST` | Verification |
| `DSH` | DSH runtime integration and compatibility |

Identifiers are never reused after removal. Removed requirements remain in the traceability table with status `retired`.

## Stage gates

### Gate 0 — Vision accepted

- Product promise, default behavior, scope, and non-goals are explicit.
- Material uncertainties appear in `open-decisions.md`.
- No implementation work begins.

### Gate 1 — Behavioral specification accepted

- Every primary user journey has normative requirements.
- Default, opt-in, failure, deletion, and disabled states are defined.
- Cost-bearing behavior has a disclosure rule.

### Gate 2 — Executable contracts accepted

- Public API request, response, and error vocabulary is stable.
- Durable records have versioned schemas.
- Import/export compatibility and migration behavior are specified.

### Gate 3 — Verification accepted

- Every MUST maps to at least one automated or explicitly manual acceptance check.
- Quiet mode has request-equivalence tests.
- Privacy, deletion, budget, replay, and upgrade paths have coverage.

### Gate 4 — Implementation authorized

- The minimal package boundary and DSH compatibility target are selected.
- Tests are written from the accepted contracts.
- Code changes reference requirement IDs.

## Decision protocol

A product decision is material when it changes default behavior, collected data, model-visible content, user cost, privacy, compatibility, or an irreversible storage choice.

For each material uncertainty:

1. Record the question and constraints.
2. Present two or three mutually exclusive options.
3. Mark one recommendation and explain the tradeoff.
4. Allow a free-form answer when none fits.
5. Do not silently convert an open decision into a default.

Reversible naming, wording, and internal organization decisions may use a provisional default and remain explicitly marked provisional.

## Change protocol

Behavior changes follow this order:

1. Update the relevant requirement or decision.
2. Update schemas and migration rules when durable data changes.
3. Update acceptance cases and traceability.
4. Implement.
5. Verify the smallest complete set of affected contracts.

An implementation-only change that alters observable behavior is non-conforming.
