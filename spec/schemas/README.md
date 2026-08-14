# Executable Schemas

Status: Implemented v1

These JSON Schema 2020-12 documents mirror the MVP's public service values and portable export. They constrain shape and primitive bounds. Runtime authorization, consent, quota, revision, and lifecycle invariants are enforced by the service and remain normative business rules in the surrounding specifications and acceptance cases.

Current schemas:

- `settings.schema.json`
- `preference-atom.schema.json`
- `style-exemplar.schema.json`
- `style-context-packet.schema.json`
- `self-description.schema.json`
- `style-query.schema.json`
- `compile-style-request.schema.json`
- `activate-style-request.schema.json`
- `activation-receipt.schema.json`
- `api-error.schema.json`
- `liltloom-export.schema.json`

The schemas compile in strict Ajv 2020-12 mode as part of release verification. The ceilings in `settings.schema.json` prevent invalid or dangerous persisted settings. Product defaults are defined by the implementation and `DEC-004`.
