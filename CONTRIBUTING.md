# Contributing to Liltloom

Thanks for helping improve Liltloom. Bug reports, product feedback, documentation improvements, tests, and focused pull requests are welcome.

## Development

Requirements: Node.js `^22.19.0 || >=24` and pnpm.

```sh
pnpm install
pnpm run check
pnpm run pack:check
```

For a core change, verify that `liltloom/core` remains host-neutral. For a DSH adapter change, install the generated tarball into a fresh DeepSeek Harness Web profile and follow [`spec/manual-testing.md`](spec/manual-testing.md).

## Pull requests

- Keep changes focused and explain the user-visible effect.
- Add or update tests for behavior changes.
- Preserve quiet defaults, explicit style activation, local-first storage, user editability, and bounded resource use.
- Update the owning SDD document or decision record when changing a product contract.
- Never add credentials, private conversation exports, or user writing samples to fixtures.

New host adapters are welcome when they preserve the obligations in [`spec/09-portable-core-and-adapters.md`](spec/09-portable-core-and-adapters.md). DeepSeek Harness is in developer preview; include the tested DSH version or commit when reporting an issue with that adapter.
