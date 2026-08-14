# DEC-007 — Portable core, first maintained adapter

Status: Accepted
Date: 2026-08-14

## Decision

Liltloom is a host-portable personal writing-style memory layer. DeepSeek Harness is its first maintained and currently best-supported adapter, not part of the canonical product identity.

The package exposes two explicit boundaries:

- `liltloom/core` contains host-neutral types, schemas, eligibility checks, feature extraction, deterministic rule derivation, and Style Context compilation.
- `liltloom/adapters/dsh` binds the core model to DSH session events, storage-domain persistence, dynamic context, commands, model tools, RPC, and Web UI.

Portable exports use `product: "liltloom"`. Existing `dsh-liltloom` and `dsh-style-memory` exports remain importable. The DSH `style_memory` storage domain remains unchanged so an adapter rename cannot strand local profiles.

## Consequences

- Brand and data formats can survive additional host adapters.
- A working DSH integration remains shippable as one installable bundle.
- Portability is testable at an import boundary rather than being only a marketing statement.
- Non-DSH adapters are not advertised as supported until they implement the same authorization, bounded-context, privacy, and migration invariants.
