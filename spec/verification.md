# MVP Verification Record

Date: 2026-08-14 (Asia/Shanghai)

## Target

- DeepSeek Harness source commit: `47f943859bef60e4160492346772ded9b24f765a`
- Source package version: `0.1.0-rc.5`
- Public packages used for standalone plugin development: `0.1.0-rc.6`
- Plugin: `dsh-liltloom@0.1.0`
- Node requirement: `^22.19.0 || >=24`

The peer range intentionally supports DSH `>=0.1.0-rc.5 <0.2.0`. Host APIs are optional pnpm peers because DSH supplies and resolves them; Cordis service injection remains the runtime requirement.

## Automated release checks

`pnpm run check` passed:

- TypeScript strict typecheck;
- 6 Vitest files;
- 25 keyless tests;
- production TypeScript build.

`pnpm pack --dry-run` passed and contained the compiled `lib`, bundle patch, README, MIT license, complete SDD, and all 11 JSON Schemas.

## Clean tarball installation

The built `dsh-liltloom-0.1.0.tgz` was installed into a new temporary DSH Home and Web profile with:

```sh
DSH_HOME=<fresh-home> pnpm dsh plugin --profile web add /absolute/path/dsh-liltloom-0.1.0.tgz
```

Results:

- clean exit;
- no install peer warning;
- `pnpm dsh plugin --profile web peers check`: `No peer dependency issues found`;
- `pnpm dsh --profile web --dump-config` contained the `# == dsh-liltloom` layer and all v1 resource settings.

## Real boot and storage

The clean tarball profile started keylessly with `--host 127.0.0.1 --port 0`. DSH printed a live loopback URL, an HTTP GET to `/` succeeded, and the initialized domain asserted:

```text
domain = style_memory@1
observationState = learning
invocationMode = explicit
modelToolEnabled = false
deepStyleEnabled = false
analysisEnabled = false
```

The process was then terminated intentionally with `SIGINT`; exit 130 is the expected result of that verification stop, not a startup failure.

## Native client and browser verification

A second clean tarball profile was booted on an OS-selected loopback port. The HTML boot catalog named `dsh-liltloom`, `/plugins/dsh-liltloom/client.js` returned HTTP 200, and the `/liltloom-rpc` channel returned a successful structured status response. Peer checking again reported no issues.

The real DSH Web UI was exercised in the in-app browser:

- `Settings → Plugins → Liltloom` mounted the two-thread mark, compact summary, and all five views;
- a rule was added, edited inline, saved, and removed through the in-page second confirmation;
- the preview compiled the edited rule without starting a model turn;
- Deep Style displayed an explicit in-page consent action and could be cancelled without mutation;
- the Advanced view exposed `主动读取样本` before any exemplar-body request;
- the Data view kept clear disabled until the user enters `DELETE`;
- a fresh page reported zero browser-console errors.

The renamed package was independently installed into multiple fresh temporary profiles. `--dump-config` showed `id: liltloom` and `name: dsh-liltloom`; the boot catalog, client bundle, and `/liltloom-rpc/status/read` all succeeded. The legacy package artifact was not enabled alongside Liltloom because both intentionally share the durable `style_memory` domain.

## Compatibility-specific evidence

Integration tests compose real DSH `storage`, `storage-json`, `storage-domain`, `session`, `system-prompt`, `tools`, and `commands` services with the plugin. They verify dynamic-context assembly directly. Source review of the target commit confirms prompt assembly currently precedes `agent/pre-step`; the implementation therefore captures current-message style opt-out at `agent/inbox/inserted` and does not depend on `pre-step` for same-step context.
