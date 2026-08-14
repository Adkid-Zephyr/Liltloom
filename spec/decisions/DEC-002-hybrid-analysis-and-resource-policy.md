# DEC-002 — Hybrid Analysis and Resource Policy

Status: Accepted

Accepted choice: B — hybrid learning after one enablement disclosure

## Decision

After the user accepts the enablement disclosure, base mode performs deterministic local extraction continuously and uses a separately configured small analysis model for bounded background consolidation.

The analysis route is independent from the primary Agent route. It may be local, provider-free, or low-cost. The plugin MUST support a deterministic-only degraded state when the route is unavailable or a resource limit is reached.

## Resource policy

“Budget” means a multi-dimensional resource policy, not necessarily money. It MUST be able to bound:

- calls per period;
- input and output tokens per period;
- maximum batch size and minimum batch interval;
- concurrency, timeout, retry count, and exponential backoff;
- optional estimated monetary spend;
- whether local work may run on battery or while a user turn is active;
- fallback tier.

The monetary limit MAY be zero for a verified free-only route and MAY be absent for a local route. Unknown pricing is displayed as unknown. No unavailable or free route may silently fall back to a paid or larger model.

## Consent

The initial disclosure shows the selected route, whether text leaves the machine, batch behavior, resource limits, retention impact, and fallback policy. Changing to a materially broader remote-processing or cost tier requires renewed acceptance.

## Consequences

- “Enable and forget” produces useful semantic memory without using the primary Agent model.
- Free models remain valid defaults, but rate limits, availability, token use, local hardware, and retry pressure are still controlled.
- Model failures pause only semantic consolidation; they never delay or alter the user's conversation.
