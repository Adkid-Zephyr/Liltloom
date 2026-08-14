# Liltloom / 语织

[![CI](https://github.com/Adkid-Zephyr/dsh-liltloom/actions/workflows/ci.yml/badge.svg)](https://github.com/Adkid-Zephyr/dsh-liltloom/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![DeepSeek Harness](https://img.shields.io/badge/DeepSeek%20Harness-plugin-5B6DF6)](https://github.com/deepseek-ai/deepseek-harness)

`dsh-liltloom` 是 DeepSeek Harness 的个人写作风格记忆插件。它在后台从合格的用户原生表达中提炼可审阅的风格规则；只有在用户授权的调用路径中，才把一个有 token 上限的风格上下文交给 Agent。

Liltloom is a quiet, user-owned writing-style memory plugin for DeepSeek Harness. It learns from eligible user-authored conversation, stores structured and reviewable preferences, and only applies a bounded style context after explicit authorization.

> Lilt 是语调与节奏，loom 是织机。Liltloom 悄悄学会你的表达，需要时再织进回答。

> Vision：自动学习、静默保存、显式取用；需要模仿用户写作风格时，既能由人激活，也能通过受控接口调用；应用范围由用户选择。原文片段和小模型分析是两个独立的高阶开关。

这是一个针对 DeepSeek Harness `0.1.0-rc.5` 生命周期设计、并以公开 `0.1.0-rc.6` 包完成构建测试的 Web-profile MVP。

## 默认行为

- 自动观察顶层会话中 `source.kind === "user"` 的原生文本；排除子 Agent、插件、工具、助手、代码块、日志、大片引用、疑似粘贴内容和秘密。
- 基础模式只保存不可逆的统计聚合与由它们生成的规则，不复制完整对话原文。
- 普通请求不增加 system prompt、动态上下文或 tool schema，也不调用模型。
- 默认调用模式是 `explicit`；用户可改为关闭，或只对当前工作区启用自动应用。
- 全局画像和 workspace overlay 分层保存；同一特征下 workspace 规则优先。
- 人工规则默认锁定，自动学习不会覆盖锁定记录。

“静默”指不打断对话、不改变普通模型请求，并不表示偷偷收集：安装本身是用户授权，状态、数据、导出和删除入口始终可见。

## 数据到底以什么形式存在

| 形态 | 用途 | 是否长期保存 |
|---|---|---|
| DSH `storage-domain` 记录 | 规则、统计聚合、设置、激活、watermark、资源账本 | 是；Web 默认位于 `$DSH_HOME/storages/style_memory.json` |
| Versioned JSON export | 人工编辑、备份、迁移 | 由用户决定；格式见 `spec/schemas/liltloom-export.schema.json`；兼容重命名前的导出 |
| Style Context Packet | 给 Agent 模仿写作时使用的结构化规则和渲染文本 | canonical profile 中不保存 prompt；激活后按 DSH 机制进入可重放 runtime context |

用户可以用命令直接修改规则，也可以 `export` JSON、离线编辑后再 `import`。不要把底层 `style_memory.json` 当作迁移格式；它包含运行时状态，且后端未来可以从 JSON 换成 SQLite。

## 安装

要求 Node `^22.19.0 || >=24`、pnpm，以及提供 `storage-domain` 的 DSH Web profile。

manifest 把 DSH host API 标成 optional peers，避免 profile 的 pnpm 把宿主内建包误报为普通缺失依赖；这不代表运行时可选。插件的 Cordis 注入仍会等待 `storageDomain`、`sessions` 和 `systemPrompt`，因此未提供这些服务的 composition 不会激活。

```sh
git clone https://github.com/Adkid-Zephyr/dsh-liltloom.git
cd dsh-liltloom
pnpm install
pnpm run check
dsh plugin --profile web add "$PWD"
dsh --profile web --dump-config
dsh --profile web
```

从 DeepSeek Harness 源码 checkout 运行时，把最后三条的 `dsh` 换成仓库中的 `pnpm dsh`：

```sh
pnpm dsh plugin --profile web add /absolute/path/to/dsh-liltloom
pnpm dsh --profile web --dump-config
pnpm dsh --profile web
```

也可以从 [GitHub Releases](https://github.com/Adkid-Zephyr/dsh-liltloom/releases) 下载已经构建好的 tarball，或从源码自行生成：

```sh
pnpm pack
dsh plugin --profile web add /absolute/path/to/dsh-liltloom-0.1.0.tgz
```

卸载插件不会自动删除它的个人数据。需要清除时，先运行 `/liltloom clear confirm`，再执行：

```sh
dsh plugin --profile web remove dsh-liltloom
```

## 日常使用

所有 `/liltloom` 命令都直接由 Harness 执行，不开启模型轮次；命令参数也不会被复制进 session log。

### 原生界面

打开 `设置 → 插件 → Liltloom`，可以直接管理以下内容：

- 概览：学习状态、取用模式、Agent 接口和高阶功能授权；
- 规则：搜索、新增、内联编辑、锁定、忽略和二次确认删除；
- 预览：在真正激活前检查将交给 Agent 的有界 Style Context Packet；
- 高阶：维护自我描述与保留策略，原文样本只在点击“主动读取样本”后加载；
- 数据：导出/导入可读 JSON，或通过输入 `DELETE` 清空个人数据。

在已有会话中输入不带参数的 `/liltloom` 会打开轻量操作面板；带参数的命令仍适合键盘操作和自动化。风格激活后，输入区附近才显示一个小型激活条，可随时关闭；未激活时不常驻、不轮询。

```text
/liltloom status
/liltloom list [default|technical|professional|social|longform]
/liltloom add [technical] 偏好先给结论，再给最少必要解释。
/liltloom edit <preference-id> <new text>
/liltloom lock|unlock|suppress|restore|delete <preference-id>

/liltloom preview [register] [deep] [self]
/liltloom use [register] [session] [self]
/liltloom off
/liltloom mode explicit|auto|disabled

/liltloom pause
/liltloom resume
/liltloom export
/liltloom import <export-json>
/liltloom import-replace <export-json>
/liltloom clear confirm
```

`preview` 会显示即将使用的完整有界上下文。`use` 默认只影响下一次响应；加 `session` 后持续到 `/liltloom off`。`mode auto` 只把当前 session 的 workspace 加入自动应用范围，当前消息中的“不要使用我的风格”仍具有最高优先级。

## Deep Style：可选原文片段

Deep Style 默认关闭。开启后，插件只从通过基础资格检查且不少于 100 字的用户原生文本中保留稀疏片段；疑似 secret 的内容直接拒绝。

```text
/liltloom deep on
/liltloom exemplars [register]
/liltloom exemplar-lock <excerpt-id>
/liltloom exemplar-unlock <excerpt-id>
/liltloom exemplar-delete <excerpt-id>
/liltloom deep off keep
/liltloom deep off delete
```

MVP 的存储信封是：每段最多 1,200 字、默认 90 天、最多 200 条、总计最多 240,000 字。配额达到后按锁定状态、质量和时间确定性淘汰低价值未锁定记录；锁定记录不自动过期或淘汰。关闭时必须明确选择保留还是删除已有片段。

## 可选小模型分析

小模型只补充确定性统计不擅长的语义风格规则。插件不捆绑模型，也不假设“免费模型”等于无限资源：必须在 DSH 组合配置中显式指定独立 provider/model 路线，然后由用户运行 `/liltloom analysis on` 完成首次授权。

在 `$DSH_HOME/profiles/web/cordis.patch.yml` 中覆盖整行（DSH patch 的 `config` 是整值替换，不是深合并）：

```yaml
- id: liltloom
  name: dsh-liltloom
  config:
    observationEnabled: true
    invocationMode: explicit
    modelToolEnabled: false
    deepStyleEnabled: false
    analysisEnabled: false
    analysisProvider: your-small-model-provider
    analysisModel: your-small-model-id
    analysisMaxCallsPerDay: 20
    analysisMaxInputTokensPerDay: 50000
    analysisMaxOutputTokensPerDay: 6000
    analysisMaxOutputTokensPerCall: 600
    analysisBatchMessages: 6
    analysisMaxBatchChars: 8000
    analysisFlushIntervalMs: 30000
    analysisTimeoutMs: 60000
    analysisMaxRetries: 1
    analysisRetryBackoffMs: 60000
    contextMaxTokens: 1200
```

分析最多一个并发调用；失败尝试也计入每日调用和输入额度；输出经过严格 schema 校验后才可合并；路由失败只暂停分析，不影响聊天和本地规则学习，也绝不回退到其他模型。资源账本记录 token 与 `priceStatus: unknown`，MVP 不伪造模型价格或“免费”状态。

## 最小个人上下文

MVP 只保存一段用户亲自填写的自我描述，不从普通对话推断人格。

```text
/liltloom self 我重视直接、诚实和清晰的沟通。
/liltloom self
/liltloom self-use on
/liltloom preview default self
/liltloom use default self
/liltloom self-clear
```

原文始终是权威来源；`self-use` 是独立授权，不开启时即使调用方请求也会得到 `SELF_CONTEXT_NOT_AUTHORIZED`。

## 给 Agent / 其他插件调用

有三层接口：

1. `ctx.styleMemory` 服务：供受信任的 DSH 插件使用，提供 `query()`、`compile()`、`activate()`、CRUD、export/import 等方法。
2. `style_context` model tool：默认不注册，因为 tool schema 本身会改变普通模型请求；用户运行 `/liltloom tool on` 后才出现。
3. 原生 Web 客户端通过 DSH Connection 的 `/liltloom-rpc` 结构化通道调用同一服务。该通道只接受 loopback 来源，不是面向远程应用的公开 HTTP API。

在 `explicit` 模式下，模型 tool 只有在当前用户消息明确要求“按我的风格写”时才能成功；`configured-auto` 仍受 workspace allowlist 约束。两条接口最终使用同一套编译器和 token 上限。

## SDD 与验收

- [MVP Goal](spec/goal.md)
- [Vision](spec/00-vision.md)
- [Product behavior](spec/01-product-behavior.md)
- [Domain model](spec/02-domain-model.md)
- [Style Context API](spec/03-style-context-api.md)
- [Privacy, resources, and retention](spec/04-privacy-cost-retention.md)
- [Storage and migration](spec/05-storage-migration.md)
- [Acceptance specification](spec/06-acceptance.md)
- [Traceability matrix](spec/07-traceability.md)
- [DSH runtime integration](spec/08-dsh-integration.md)
- [Executable schemas](spec/schemas/README.md)
- [Decision records](spec/decisions)
- [Gate status](spec/status.md)
- [Verification record](spec/verification.md)
- [Manual testing guide](spec/manual-testing.md)

运行全部 keyless 验收：

```sh
pnpm run check
pnpm run pack:check
```

## MVP 已知边界

- 首版只正式支持有持久存储的 DSH Web profile；headless 需自行组合同等 storage 服务。
- 原生界面目前以中文为主；尚无独立 dashboard、移动端或跨设备同步。
- 没有 embeddings、向量库、微调、跨设备同步、事实记忆或自动人格推断。
- token 数是保守估算，不是特定 provider tokenizer 的精确计数。
- 小模型批次是机会性短期队列；原始分析样本不会为重试而持久化，避免重新引入基础模式原文存储。
- DSH 仍处于 release-candidate 快速变化阶段；升级时应重新执行类型、组合、启动和 lifecycle 验收。

License: MIT

## Community

Issues and pull requests are welcome in this repository. For the wider DSH ecosystem, add the `dsh-plugin` topic to compatible projects and share releases through the official DeepSeek Harness Discussions and community channels.
