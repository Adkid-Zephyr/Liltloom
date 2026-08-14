# DEC-001 — Style Invocation Policy

Status: Accepted

Accepted choice: C — explicit by default, configurable automatic use

## Decision

Style memory has three invocation modes:

1. `disabled` — no style packet may be made model-visible. Quiet learning and human inspection may remain enabled.
2. `explicit` — the default. Style may be used only after an explicit user request, preset selection, UI/command activation, or direct API call by an authorized non-model consumer.
3. `configured-auto` — style may be applied automatically only when a user-authored activation rule matches. Rules may constrain workspace, register, preset, task class, and activation scope.

The Agent MUST NOT expand an automatic rule's scope or create a new automatic rule on its own. Switching modes or changing an automatic rule is an inspectable user action.

## Consequences

- The default remains predictable and preserves the quiet-mode promise.
- Users who want seamless personalization can configure it once in settings.
- The implementation needs durable invocation policy, rule evaluation, precedence, and an audit-safe activation receipt.
- `configured-auto` is not unrestricted Agent discretion.

## Precedence

For one request, the effective policy is resolved in this order:

1. Current explicit user instruction.
2. Session or next-response activation selected by the user.
3. Matching configured-auto rule.
4. Default invocation mode.

An explicit request to disable or ignore personal style wins over every stored activation or rule.
