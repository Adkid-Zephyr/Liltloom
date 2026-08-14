# Domain Model

Status: MVP v1 implemented

```text
EvidenceAggregate ──deterministic derivation──> PreferenceAtom[]
                                                 │
                                                 └──compile──> StyleContextPacket
                                                                  │
                                                                  └──activate──> ActivationSet

Deep Style eligibility ──> StyleExemplar[] ─────┘
SelfDescription ──explicit authorization──> DerivedSelfContext ───┘
```

The executable TypeScript definitions live in `src/types.ts`; portable shapes live in `spec/schemas`.

## PreferenceAtom

An independently inspectable, selectable, editable, lockable, suppressible, and deletable style rule. In addition to category/register/text/provenance/confidence/evidence/timestamps, every atom has:

- `profileScope`: `{ kind: 'global' }` or `{ kind: 'workspace'; workspace: string }`;
- `featureKey`: stable collision key used for global/workspace overlay;
- `revision`: monotonic record revision;
- `locked`: user-owned protection against automatic replacement.

Only a user action creates a locked atom in the MVP. Automatic derivation skips any locked atom with the same stable ID.

## EvidenceAggregate

A compact accumulator, never a transcript copy. It stores scope, register, sample count, total character/sentence/paragraph/line counts, list/heading/emoji/punctuation counts, and first/last observation timestamps. Per-session processing identity is stored separately as a `ProcessingWatermark`.

## StyleExemplar

A sparse Deep Style record containing a bounded source excerpt plus profile scope, register, source fingerprint, classification confidence, quality, consent version, status, lock state, creation time and expiry. Locked exemplars have `expiresAt: null`; otherwise expiry is finite. The fingerprint is a local SHA-256 deduplication value, not a session identifier.

## StyleContextPacket

A disposable compilation result:

```ts
interface StyleContextPacket {
  schemaVersion: 1
  profileRevision: number
  register: Register
  purpose: 'imitate' | 'adapt' | 'review'
  selectedPreferenceIds: string[]
  rules: string[]
  avoid: string[]
  exemplars?: StyleExemplar[]
  selfContext?: DerivedSelfContext
  confidence: number
  tokenBudget: number
  estimatedTokens: number
  renderedContext: string
}
```

It is not canonical profile storage. Only an activated rendered projection becomes model-visible.

## ActivationSet

An activation stores `id`, `sessionId`, the exact packet snapshot, scope, authorization provenance, creation time, and `active|consumed|revoked` status. The MVP keys the live activation table by session ID, so a new activation replaces the previous one for that session.

## StyleMemorySettings

Persisted user controls include observation state, invocation mode, model-tool state, automatic workspace globs, Deep Style consent/envelope, analysis consent/state, self-context authorization, and update time. Provider/model routing and hard resource ceilings remain deployment configuration so the user command cannot widen them.

## SelfDescription and DerivedSelfContext

`SelfDescription` is one user-authored source record with revision and timestamps. `DerivedSelfContext` is a deterministic convenience projection tied to that source revision. The MVP does not infer personality from conversation.

## ResourceLedger

Operational daily state records attempted calls and input/output tokens with `priceStatus`. It is intentionally excluded from portable style export. A failed remote attempt counts toward call/input limits before transport completes.

Presets, embeddings, revision-pair memory, general factual memory, and automatic personality inference are future-domain concepts and are not MVP records.
