# DEC-003 — Deep Style Excerpt Retention

Status: Accepted

Accepted choice: B — automatic bounded excerpts with review and expiry

## Decision

When Deep Style is enabled under accepted consent, the plugin may automatically retain bounded excerpts classified as user-authored original writing. Retention is subject to all of the following:

- per-excerpt and total-store size caps;
- a finite default expiry, with an explicit keep-forever override;
- exclusion or redaction of likely secrets and high-risk identifiers;
- exclusion of quoted, pasted, generated, tool, assistant, and system material unless explicitly approved as an exemplar;
- visible review, suppression, deletion, export, and source-retention controls;
- no reuse after consent is withdrawn or the record expires.

Deep Style MUST NOT duplicate a complete conversation or silently retain every eligible message. Selection is sparse and justified by exemplar quality or register coverage.

## Consequences

- The plugin can improve imitation with real examples while remaining low-maintenance.
- Source classification, redaction, expiry, storage quotas, and deletion tests are release requirements.
- Exact default retention days and size caps remain a separate product decision because they directly affect privacy and fidelity.
