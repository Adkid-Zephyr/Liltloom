# DEC-006 — Liltloom brand and quiet interface

Status: Accepted on 2026-08-14

## Decision

The product name is **Liltloom**, with the optional Chinese name **语织** and package name `liltloom`. *Lilt* represents an individual's cadence and expression; *loom* represents gradual compilation from many small signals.

The native interface follows the same product idea without decorative texture or permanent chrome:

- one small two-thread mark is the only brand illustration;
- information hierarchy relies on spacing, thin dividers, and compact summaries rather than nested cards;
- base learning remains visually quiet;
- advanced retention, model cost, exemplar bodies, and destructive actions use progressive disclosure;
- the conversation dock exists only while style context is active;
- `/liltloom` is the primary command and `/style-memory` remains a compatibility alias.

## Compatibility

The package and canonical product ID are `liltloom`. The DSH adapter also registers with plugin ID `liltloom`. The durable `style_memory` v1 domain, the public DSH `ctx.styleMemory` service, and existing TypeScript domain names stay stable. New portable exports identify `liltloom`; imports continue accepting `dsh-liltloom` and `dsh-style-memory` exports.

## Consequences

The brand is distinctive without making the background learner visually intrusive. Existing data does not require an in-place migration. A profile must not enable the old and new packages simultaneously because both intentionally use the same durable domain.
