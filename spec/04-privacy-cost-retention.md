# Privacy, Resources, and Retention

Status: MVP v1 implemented

## Data classes

| Class | Example | Base mode | Deep Style |
|---|---|---:|---:|
| Aggregate metrics | sentence length distribution | retained | retained |
| Preference atoms | avoid template conclusions | retained | retained |
| Provenance metadata | evidence count, source class | retained | retained |
| Raw full messages | complete user turn | prohibited duplicate | prohibited by default |
| Bounded excerpts | representative paragraph | prohibited | automatic sparse selection with disclosure, quota, review, and expiry |
| Revision pairs | before/after edit | prohibited | optional with disclosure |
| Embeddings/indexes | semantic style retrieval | prohibited | optional with disclosure |
| Self description | user-authored text | explicit only | explicit only |

## Privacy requirements

`PRV-001` — Base mode MUST NOT create a second full transcript archive.

`PRV-002` — Remote analysis MUST send only the smallest eligible batch needed for the declared task.

`PRV-003` — Text containing obvious credential or secret patterns MUST be rejected from remote analysis and Deep Style retention. The MVP does not claim complete PII detection.

`PRV-004` — Raw text MUST NOT be rendered into model context without normalization, length bounds, and explicit eligibility.

`PRV-005` — Preferences, Deep Style excerpts, self description, and activation MUST have independent deletion paths. Full user-data deletion preserves only the operational resource ledger.

`PRV-006` — Disabling observation MUST stop new collection immediately and MUST NOT imply deletion.

`PRV-007` — Export MUST exclude operational identifiers, cost ledger, session IDs, and raw evidence unless the user explicitly selects them.

## Resource requirements

`MOD-006` — Status and documentation MUST show the configured analysis route and current resource policy. Price/tier MUST remain unknown unless independently verified.

`MOD-007` — The plugin MUST reserve attempted call and estimated input accounting before transport; it MUST add reported usage deltas when the adapter reports usage.

`MOD-008` — Unknown provider price MUST be reported as unknown; a verified free route MAY be reported as zero monetary cost; the plugin MUST NOT present a fabricated estimate.

`MOD-009` — Analysis work MUST use a single bounded queue by default and MUST NOT compete unboundedly with user turns.

`MOD-010` — Failed or cancelled analysis MUST not commit observations and MAY retry the in-memory batch within the configured retry/backoff envelope. Raw analysis samples MUST NOT be persisted merely to survive restart.

## Deep Style enablement disclosure

Before activation, the user sees:

1. Additional data that may be retained.
2. Whether source excerpts leave the machine.
3. Configured analysis provider and model.
4. Call, token, single-concurrency, timeout, retry/backoff, and any known monetary limits.
5. Default retention duration.
6. Controls for pause, export, and deletion.

Consent is versioned. A material expansion of collected data or remote processing invalidates the prior consent and requires a new acceptance.

## Retention

- Preference atoms remain until deleted or superseded under an accepted policy.
- Base aggregates MAY be compacted after their committed preference effects and watermark remain reproducible.
- Deep Style excerpts and revision pairs MUST have a finite default retention duration or explicit keep-forever setting.
- Deep Style enforces the accepted `DEC-004` defaults: 90 days, 1,200 characters per record, 200 records, and 240,000 total characters.
- Quota eviction is deterministic by lock state, quality, and recency. Locked records neither expire nor auto-evict.
- Expiry removes the retained source but MAY keep aggregate statistics that cannot reconstruct the source.
- Self-authored descriptions remain until explicitly replaced or deleted.

Deep Style alone never sends excerpts off-machine. Separately enabled model analysis may send a bounded eligible batch to its configured DSH route; this is disclosed and consented independently.
