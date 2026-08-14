<p align="center">
  <img src="https://raw.githubusercontent.com/Adkid-Zephyr/Liltloom/main/assets/brand/liltloom-mark.svg" width="72" alt="Liltloom Logo">
</p>

<h1 align="center">Liltloom / 语织</h1>

<p align="center"><strong>让 AI 慢慢学会你的表达，需要时再织进回答。</strong></p>
<p align="center">中文优先 · 用户拥有 · 静默学习 · 显式取用 · 可检查、可编辑、可迁移</p>
<p align="center"><em>A Chinese-first, user-owned writing-style memory layer for AI.</em></p>

<p align="center">
  <a href="https://github.com/Adkid-Zephyr/Liltloom/actions/workflows/ci.yml"><img src="https://github.com/Adkid-Zephyr/Liltloom/actions/workflows/ci.yml/badge.svg" alt="CI"></a>
  <a href="./LICENSE"><img src="https://img.shields.io/badge/License-MIT-blue.svg" alt="MIT License"></a>
  <a href="https://github.com/deepseek-ai/deepseek-harness"><img src="https://img.shields.io/badge/%E9%A6%96%E4%B8%AA%E9%80%82%E9%85%8D-DeepSeek%20Harness-5B6DF6" alt="DeepSeek Harness adapter"></a>
</p>

<p align="center"><a href="#中文说明">中文说明</a> · <a href="#english">English</a> · <a href="#五分钟开始使用">安装</a> · <a href="#界面预览">界面预览</a> · <a href="./spec/manual-testing.md">人工测试</a></p>

## 中文说明

> 你不应该每换一个模型、一个工具或一个新对话，就重新复制一遍“请模仿我的风格”。

Liltloom（语织）是一个**中文优先、由用户拥有的个人写作风格记忆层**。它从合格的用户原生表达中提炼语言偏好，保存为结构化、可审阅的规则；当你确实需要 AI 模仿自己时，再把与当前任务有关的内容编译成一份短小、有界的 **Style Context Packet**。

它不是另一段越来越长的万能 Prompt，也不会默认把所有聊天原文塞进数据库。你能看到它学到了什么，随时修改、锁定、忽略、删除，也可以导出为可读 JSON 带走。

名字里的 **lilt** 是语调与节奏，**loom** 是织机：平时安静收集表达中的细线，需要时再把它们织进回答。

### 一眼看懂

| 能力 | Liltloom 的做法 |
|---|---|
| 自动学习 | 只观察通过资格检查的用户本人表达，过滤工具结果、助手内容、日志、代码、大片引用、疑似粘贴与秘密 |
| 静默保存 | 基础模式只累计统计特征和结构化规则；普通对话不额外调用模型，也不改变 system prompt |
| 显式取用 | 默认只有用户主动激活，或受控接口获得授权时，风格信息才进入写作任务 |
| 人工控制 | 规则可查看、新增、编辑、锁定、忽略和删除；使用前可以预览完整上下文 |
| 数据迁移 | 提供带版本的可读 JSON 导出；同一份数据协议可供不同 Agent / Harness adapter 复用 |
| 精度升级 | 原文片段与小模型分析是两个独立的高阶开关，开启前明确提示存储、调用和成本影响 |

### 为什么是“中文优先”

中文写作的风格不只是一组形容词。标点是全角还是半角、单句多长、自然段如何推进、什么时候列点、标题密度，以及“直接”与“生硬”之间的距离，都会影响最终读感。

当前 MVP 已经把这些细节做进产品，而不只是翻译 README：

- 确定性提取中文句末标点、全角标点占比、句长、段落、列表和标题倾向；
- 自动生成可执行的中文风格规则，例如短句负担、自然分段和中文标点偏好；
- 设置界面、授权说明、风险提示和数据控制以中文为主，减少术语堆砌；
- 区分默认、技术、专业、社交和长文等文体，避免把一套语气强行用在所有场景；
- 中文文本可以直接学习和使用，不要求先翻译成英文，也不要求用户自己编写风格 Prompt。

**中文优先不等于只支持中文。** Core 接受 Unicode 文本，Style Context 协议也不绑定语言；只是当前产品文案、默认规则和主要验收样本优先服务中文用户。英文与其他宿主可用，但成熟度暂时不与中文 + DeepSeek Harness 组合等同。

## 界面预览

以下界面来自目前维护最完整的 DeepSeek Harness adapter。Liltloom core 和数据格式不依赖 DSH，其他宿主可以使用不同的原生界面。

| 静默学习与取用设置 | 可检查、编辑和锁定的表达规则 |
|---|---|
| ![Liltloom 学习概览](https://raw.githubusercontent.com/Adkid-Zephyr/Liltloom/main/assets/media/ui-overview.png) | ![Liltloom 规则管理](https://raw.githubusercontent.com/Adkid-Zephyr/Liltloom/main/assets/media/ui-rules.png) |

| 使用前预览 Style Context Packet | 用户主动维护的个人上下文 |
|---|---|
| ![Liltloom 风格取用预览](https://raw.githubusercontent.com/Adkid-Zephyr/Liltloom/main/assets/media/ui-style-preview.png) | ![Liltloom 个人上下文](https://raw.githubusercontent.com/Adkid-Zephyr/Liltloom/main/assets/media/ui-personal-context.png) |

| 可读 JSON 导出、导入与永久删除 |
|---|
| ![Liltloom 数据控制](https://raw.githubusercontent.com/Adkid-Zephyr/Liltloom/main/assets/media/ui-data-control.png) |

## 五分钟开始使用

当前正式维护的是 **DeepSeek Harness Web adapter**。要求 Node `^22.19.0 || >=24`、pnpm，以及提供 `storage-domain` 的 DSH Web profile。

```sh
git clone https://github.com/Adkid-Zephyr/Liltloom.git
cd Liltloom
pnpm install
pnpm run check
dsh plugin --profile web add "$PWD"
dsh --profile web --dump-config
dsh --profile web
```

启动后打开 **设置 → 插件 → Liltloom**。建议第一次按这个顺序体验：

1. 在“概览”确认自动学习已开启、取用模式为“显式”；
2. 正常输入几段你本人写的中文，不需要专门喂样本；
3. 到“规则”查看学到的偏好，也可以补一条人工规则并锁定；
4. 到“预览”检查即将交给 AI 的 Style Context Packet；
5. 仅在需要模仿自己时激活风格，完成后关闭；
6. 到“数据”导出 JSON，确认数据可以由你带走和编辑。

完整逐步验收见 [人工测试指南](./spec/manual-testing.md)。也可以从 [GitHub Releases](https://github.com/Adkid-Zephyr/Liltloom/releases) 下载构建好的 tarball。

### 从 DeepSeek Harness 源码运行

如果你正在 DSH 源码仓库内调试，把上面的 `dsh` 换成仓库中的 `pnpm dsh`：

```sh
pnpm dsh plugin --profile web add /absolute/path/to/Liltloom
pnpm dsh --profile web --dump-config
pnpm dsh --profile web
```

也可以自行打包安装：

```sh
pnpm pack
dsh plugin --profile web add /absolute/path/to/liltloom-0.2.0.tgz
```

当前 adapter 按 DSH `0.1.0-rc.5` 生命周期设计，并使用公开的 `0.1.0-rc.6` 包完成构建测试。manifest 将宿主 API 标为 optional peers，只是为了避免 profile 的 pnpm 将宿主内建包误报为缺失依赖；运行时仍需要对应服务。

## 日常使用

### 原生设置界面

打开 **设置 → 插件 → Liltloom**，可以管理：

- **概览**：学习状态、取用模式、Agent 接口和高阶功能授权；
- **规则**：搜索、新增、内联编辑、锁定、忽略和二次确认删除；
- **预览**：真正激活前检查完整、有界的 Style Context Packet；
- **高阶**：维护自我描述与保留策略；原文样本只在主动读取时加载；
- **数据**：导出/导入可读 JSON，或输入 `DELETE` 永久清空个人数据。

未激活时，Liltloom 不在对话输入区常驻，也不轮询；激活后才显示一个可随时关闭的小型状态条。

### 命令

所有 `/liltloom` 命令由 Harness 直接执行，不开启模型轮次；命令参数也不会复制进 session log。

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

`preview` 显示将要使用的完整上下文；`use` 默认只影响下一次响应，加 `session` 后持续到 `/liltloom off`。`mode auto` 只允许当前 session 的 workspace 自动应用；当前消息里的“不要使用我的风格”仍有最高优先级。

## 数据存在形式

| 形态 | 用途 | 是否长期保存 |
|---|---|---|
| DSH `storage-domain` 记录 | 规则、统计聚合、设置、激活状态、watermark 和资源账本 | 是；Web 默认位于 `$DSH_HOME/storages/style_memory.json` |
| Versioned JSON export | 人工编辑、备份与迁移 | 由用户决定；格式见 [`liltloom-export.schema.json`](./spec/schemas/liltloom-export.schema.json) |
| Style Context Packet | 模仿写作时交给 Agent 的结构化规则与渲染文本 | canonical profile 不保存 prompt；激活后按宿主机制进入 runtime context |

基础模式默认**不保存完整对话原文**。不要把底层 `style_memory.json` 当作长期迁移格式；它包含运行时状态，未来后端也可能换成 SQLite。导出 JSON 才是稳定、可读、可编辑的迁移边界。

卸载插件不会自动删除个人数据。需要彻底清除时，先运行 `/liltloom clear confirm`，再执行：

```sh
dsh plugin --profile web remove liltloom
```

## 可选的高阶能力

### Deep Style：保留少量原文片段

Deep Style 默认关闭。开启后，只从通过基础资格检查且不少于 100 字的用户原生文本中保留稀疏片段；疑似 secret 的内容直接拒绝。

```text
/liltloom deep on
/liltloom exemplars [register]
/liltloom exemplar-lock|exemplar-unlock|exemplar-delete <excerpt-id>
/liltloom deep off keep
/liltloom deep off delete
```

MVP 每段最多 1,200 字、默认保留 90 天、最多 200 条、总计最多 240,000 字。配额达到后按锁定状态、质量和时间淘汰低价值的未锁定记录；锁定记录不会自动过期。关闭时必须明确选择保留或删除已有片段。

### 小模型分析

小模型只补充确定性统计不擅长的语义风格规则。插件不捆绑模型，也不把“免费模型”假设为无限资源：必须显式配置独立 provider/model 路线，再由用户运行 `/liltloom analysis on` 首次授权。

分析最多一个并发调用；失败尝试也计入每日调用和输入额度；输出经过严格 schema 校验后才会合并。路由失败只暂停分析，不影响聊天和本地规则学习，也不会回退到其他模型。完整配置项见 [`cordis.patch.yml`](./cordis.patch.yml) 与 [资源和保留规范](./spec/04-privacy-cost-retention.md)。

### 最小个人上下文

MVP 只保存用户亲自填写的一段自我描述，不从普通对话推断人格：

```text
/liltloom self 我重视直接、诚实和清晰的沟通。
/liltloom self-use on
/liltloom preview default self
/liltloom use default self
/liltloom self-clear
```

原文始终是权威来源；`self-use` 是独立授权，未开启时调用方会得到 `SELF_CONTEXT_NOT_AUTHORIZED`。

## Core、适配器与 Agent 接口

Liltloom 是风格记忆层，不是只为某一个 Harness 写的插件：

| 层 | 责任 | 宿主依赖 |
|---|---|---|
| `liltloom/core` | 数据模型、原生文本资格检查、特征提取、确定性规则、Style Context 编译、可移植 JSON schema | 无 DSH 运行时依赖 |
| `liltloom/adapters/dsh` | DSH 会话事件、`storage-domain`、动态上下文、命令、tool、RPC 与原生设置界面 | DeepSeek Harness |

“可移植”描述的是协议和核心边界，不是假装所有宿主都已经完成。`0.2.0` 只有 DSH adapter 达到可安装、可测试状态；后续 adapter 应复用同一份 portable export 和 Style Context Packet。

目前提供四层调用方式：

1. `liltloom/core`：供其他宿主 adapter 复用的 TypeScript 核心；
2. `ctx.styleMemory`：供受信任 DSH 插件调用，提供 query、compile、activate、CRUD 和 export/import；
3. `style_context` model tool：默认不注册，用户执行 `/liltloom tool on` 后才出现；
4. `/liltloom-rpc`：仅供 loopback 原生 Web 客户端调用的结构化通道，不是公开远程 HTTP API。

这些接口最终使用同一套编译器、授权规则和 token 上限。在 `explicit` 模式下，model tool 只有在当前用户消息明确要求“按我的风格写”时才会成功。

## SDD 与验收

这个 MVP 按 Specification-Driven Development 推进，Vision、行为、数据、接口、隐私和验收之间有可追踪关系：

- [MVP Goal](./spec/goal.md) · [Vision](./spec/00-vision.md) · [Product behavior](./spec/01-product-behavior.md)
- [Domain model](./spec/02-domain-model.md) · [Style Context API](./spec/03-style-context-api.md)
- [Privacy, resources, and retention](./spec/04-privacy-cost-retention.md) · [Storage and migration](./spec/05-storage-migration.md)
- [Acceptance specification](./spec/06-acceptance.md) · [Traceability matrix](./spec/07-traceability.md)
- [DSH integration](./spec/08-dsh-integration.md) · [Portable core and adapters](./spec/09-portable-core-and-adapters.md)
- [Executable schemas](./spec/schemas/README.md) · [Decision records](./spec/decisions) · [Gate status](./spec/status.md)
- [Verification record](./spec/verification.md) · [Manual testing guide](./spec/manual-testing.md)

运行全部无需密钥的验收：

```sh
pnpm run check
pnpm run pack:check
```

## MVP 已知边界

- 首版只有 DSH adapter 达到正式支持状态，并要求带持久存储的 DSH Web profile；
- 原生界面目前中文优先，尚无独立 dashboard、移动端或跨设备同步；
- 没有 embeddings、向量库、微调、事实记忆或自动人格推断；
- token 数是保守估算，不是特定 provider tokenizer 的精确计数；
- 小模型批次只保存在机会性短期队列中，不会为了重试持久化原始分析样本；
- DSH 仍处于 release-candidate 快速变化阶段，升级时需要重新执行 lifecycle 验收。

## English

**Liltloom is a Chinese-first, user-owned writing-style memory layer for AI writing tools.** It learns structured and reviewable preferences from eligible user-authored text, then compiles a bounded Style Context Packet only when the user explicitly wants an AI to write in their style.

The base mode stores aggregate features and rules rather than full conversation transcripts. Every learned rule can be inspected, edited, locked, suppressed, deleted, and exported as versioned JSON. Raw exemplars and small-model analysis are separate opt-in features with clear storage and resource implications.

Chinese is the product’s primary language today: the deterministic extractor covers CJK punctuation, sentence rhythm, paragraphing, lists, and headings; the native settings UI and default generated rules are Chinese-first. The core protocol remains Unicode- and host-agnostic, so Chinese-first does not mean Chinese-only.

DeepSeek Harness is the first maintained and currently best-supported adapter—not Liltloom’s product boundary. See [Five-minute setup](#五分钟开始使用), [data formats](#数据存在形式), [screenshots](#界面预览), and the [manual test guide](./spec/manual-testing.md).

## 社区 / Community

欢迎中文问题、功能建议、宿主适配器和 Pull Request。新 adapter 需要保留显式授权、可移植导出、有界上下文和诚实的隐私语义。

Issues and pull requests are welcome. New host adapters should preserve explicit authorization, portable exports, bounded context, and honest privacy semantics.

[提交 Issue](https://github.com/Adkid-Zephyr/Liltloom/issues) · [查看 Releases](https://github.com/Adkid-Zephyr/Liltloom/releases) · [产品界面截图](./assets/media/README.md)

MIT License
