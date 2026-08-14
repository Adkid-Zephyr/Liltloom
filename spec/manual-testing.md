# Liltloom Manual Testing Guide

Status: MVP v1

This guide separates a fast keyless smoke test from the tests that require a configured model. Use a fresh DSH Web profile when validating a release package.

## 1. Install and start

From the DeepSeek Harness repository:

```sh
export DSH_HOME=/tmp/liltloom-manual
pnpm dsh plugin --profile web add /absolute/path/liltloom-0.2.0.tgz
pnpm dsh plugin --profile web peers check
pnpm dsh --profile web --port 0
```

Pass when peer checking reports no issues and DSH prints a loopback URL. Open that URL, complete the initial DSH notice, and skip API-key setup if running keyless.

## 2. Ten-minute keyless smoke test

### Discover the native UI

1. Open `Settings → Plugins`.
2. Select the `Liltloom` tab.
3. Confirm the two-thread mark, `Liltloom / 语织` identity, compact metrics, and five sections: `概览`, `规则`, `取用预览`, `高级`, `数据`.

Expected: the status is `正在学习`; there is no Liltloom badge or dock in an ordinary empty conversation.

### Check safe defaults

On `概览`, verify:

- learning is `学习中`;
- use is `显式取用`;
- AI access is off;
- `细织模式` is off;
- small-model refinement is disabled when no Host route is configured.

Toggle learning to `暂停`, reload the settings page, and verify it remains paused. Restore `学习中`.

### Exercise a rule lifecycle

1. Open `规则`.
2. Add `先给结论，再给最少必要解释。` in the default register.
3. Verify the rule count increases and the new rule is locked.
4. Edit it inline to `结论优先，解释保持简短。` and save.
5. Search for `结论优先`.
6. Test `解锁/锁定` and `忽略/恢复`.
7. Click `删除`; verify nothing is removed until clicking `确认删除`.

Expected: every mutation is reflected without a page reload and no browser-native prompt appears.

### Preview without invoking a model

1. Keep at least one rule.
2. Open `取用预览` and click `生成预览`.
3. Verify the rendered packet contains the rule, a profile revision, selected-rule count, and bounded token estimate.
4. Click `复制` and paste into a temporary editor.

Expected: previewing does not create a chat turn or activate the conversation.

### Check progressive disclosure

1. On `概览`, turn on `细织模式`.
2. Verify an in-page disclosure appears and cancel it.
3. Open `高级`.
4. Verify exemplar text is absent until `主动读取样本` is clicked.
5. On `数据`, verify `清空全部` stays disabled until the exact text `DELETE` is entered; then erase the text without clearing.

### Check JSON ownership and migration

1. Add a test rule and save a short self-description under `高级`.
2. Export JSON from `数据`.
3. Verify the file is named `liltloom-YYYY-MM-DD.json` and contains `"product": "liltloom"`.
4. Keep this file as a backup.
5. Import it in merge mode and verify no validation error occurs.

Expected: the document is readable and editable JSON. A legacy export with `"product": "dsh-style-memory"` must also import successfully.

## 3. Conversation activation test

This requires a DSH workspace/session; a model key is not required for session-scoped activation itself.

1. Ensure at least one active rule exists.
2. Create or open a workspace and session.
3. Enter `/liltloom` with no arguments.
4. Verify the lightweight action menu offers `织入下一次回复` and `织入整个会话`.
5. Choose `织入整个会话`.
6. Verify a small `Liltloom 已织入` dock appears near the composer with register, rule count, and scope.
7. Click its close button and verify the dock disappears immediately.
8. Run `/style-memory status` once and verify the legacy alias still responds.

Expected: commands do not create a model turn, and inactive conversations have no permanent Liltloom UI.

## 4. Learning test with a configured model

1. Send several original messages written naturally by the user.
2. Wait for background processing, then inspect the learned-message and rule counts.
3. Send messages dominated by code, logs, large quotations, or obvious pasted material.
4. Verify those messages do not create equivalent style evidence.
5. Ask for an answer normally and verify no style packet is applied while invocation remains explicit.
6. Activate Liltloom for one response, ask for writing, and verify the dock disappears after that response completes.

Expected: learning is silent, ordinary answers are unchanged, and explicit activation is consumed according to its selected scope.

## 5. Optional high-cost paths

Only run these after configuring the exact small-model provider and model in the Host patch.

1. Verify the UI names the configured route and shows daily call/input/output limits.
2. Enable small-model refinement only after its cost disclosure appears.
3. Trigger enough eligible text for one analysis batch.
4. Verify resource counters increase and a provider failure does not fail the chat turn or fall back to another model.

## 6. Persistence and deletion

1. Add one rule, stop DSH, and restart the same profile.
2. Verify the rule and settings persist.
3. Export a backup.
4. Enter `DELETE` and clear all data.
5. Verify rules, samples, self-description, activation, metrics, and learning watermarks are cleared.
6. Import the backup and verify portable user data returns.

## Release pass criteria

Pass the release only when the keyless smoke test, session activation, JSON round-trip, restart persistence, and typed deletion all behave as specified, with no browser-console errors. Small-model and real-response tests may be recorded separately when no provider credentials are available.
