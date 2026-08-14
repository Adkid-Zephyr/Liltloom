# Storage and Migration

Status: MVP v1 implemented

## DSH adapter storage

The DSH adapter uses DSH `storage-domain` as its persistence seam. The domain name/version is `style_memory` v1. JSON is the first Web-profile backend; physical backend layout is not a public contract. Other host adapters may use different physical storage while preserving the portable contract below.

Implemented logical tables:

```text
preferences       PreferenceAtom by ID
aggregates        EvidenceAggregate by scope/register ID
exemplars         StyleExemplar by fingerprint ID
settings          singleton persisted user controls
activations       current ActivationSet by session ID
self_description  singleton authoritative user text
watermarks        processing watermark by session ID
profile           singleton profile revision metadata
resources         operational daily ResourceLedger
```

Durable records are Zod-validated at the storage-domain boundary. Profile revision increases after material preference, exemplar, or self-description mutations. The single background worker serializes deterministic consolidation. Disposal stops admission, drains accepted deterministic work, cancels provider work, and closes the domain.

## Portable export

Portable export is the validated JSON shape in `spec/schemas/liltloom-export.schema.json`:

```ts
interface PortableStyleMemory {
  schemaVersion: 1
  product: 'liltloom' | 'dsh-liltloom' | 'dsh-style-memory'
  exportedAt: string
  preferences: PreferenceAtom[]
  exemplars: StyleExemplar[]
  selfDescription?: SelfDescription
}
```

It excludes aggregates, session IDs, activations, watermarks, profile internals, resource ledger, and backend-specific fields. Expired excerpts are not useful to compilation; startup prunes them and future migrations must preserve that retention invariant.

New exports use `product: 'liltloom'`. Import also accepts the legacy `dsh-liltloom` and `dsh-style-memory` values so adapter-specific naming cannot strand a user's backup. The DSH durable domain deliberately remains `style_memory` v1; upgrading the package therefore reuses existing local data instead of copying it.

Import validates the complete document before any mutation. `merge` upserts by stable ID. `replace` deletes existing portable classes and then imports the validated document. An unsupported schema version fails before mutation.

The MVP intentionally does not promise transactional rollback after an operational storage failure in the middle of replace. Users who need recoverability MUST keep the prior `export` as a backup; a future SQLite transaction or automatic pre-import snapshot can strengthen this without changing the portable format.

## Prompt projection

Rendered context is ephemeral derived data. It is never imported as canonical preference state. Once activated, DSH may log it as the authoritative runtime-context snapshot required for model replay.
