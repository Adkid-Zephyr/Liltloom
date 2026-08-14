# DEC-004 — Deep Style Retention Envelope

Status: Accepted

Accepted choice: B — balanced

## Decision

The default Deep Style envelope is:

- 90-day expiry;
- at most 1,200 Unicode characters per excerpt;
- at most 200 excerpt records;
- at most 240,000 total excerpt characters;
- deterministic lowest-value eviction at quota, ranking redundancy, quality, and age;
- locked exemplars never expire or participate in automatic eviction until unlocked.

Users may choose stricter limits. Keep-forever requires an explicit setting and is never inferred from enabling Deep Style.
