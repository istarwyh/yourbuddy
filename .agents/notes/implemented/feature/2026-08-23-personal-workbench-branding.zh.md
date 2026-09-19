# Agent Note: 个人工作台品牌

Status: implemented

[English](2026-08-23-personal-workbench-branding.md) | 中文

## Problem

YourBuddy 以一套明确的工作台形态发布，但发行版仍固定了可见身份。用户把它作为自己的 Agent 工作空间后，需要一种小而易懂的命名方式，而不应为了换名称和 Logo 重新构建 Web Client 或替换大范围 UI。

## Decision

发行版内置产品插件 `dsh-personal-workbench`，并在通用设置中提供一张卡片。卡片允许编辑工作台名称、上传 Logo、设置空会话标题与可选标题标记、预览草稿、把结果应用到侧边栏和空会话 Hero，也允许恢复 YourBuddy 默认。配置持久化在当前 Profile 的 `personal-workbench` 设置命名空间。

卡片遵循共享主题的主按钮配方：`--dsw-alias-button-primary-fill` 提供背景，`--dsw-alias-label-primary-foreground` 提供与之配对的文字颜色。它不会硬编码浅色前景，因为主按钮背景在暗色模式中变浅、在亮色模式中变深。

自定义呈现只占用 `sidebar.brand.name`、`sidebar.brand.mark`、`conversation.hero.brand.mark`、`conversation.hero.brand.headline` 和 `conversation.hero.brand.badge`。身份值停用或缺失时，插件会使用 YourBuddy 名称与随附的 Y8 图标，详见[产品身份](2026-09-06-yourbuddy-product-identity.zh.md)；Hero 文案留空时保留 Conversation 的本地化 fallback，关闭标记时则由一个不渲染内容的 occupant 占用对应 slot。个人 occupant 使用 `-10` 优先级覆盖已有品牌 occupant，而不修改对方 Package。

## Alternatives considered

**把品牌能力放进 Harbor Evolution。** 否决，因为评测与工作台身份面向不同用户、生命周期和设置；耦合后会让 Harbor 负责无关的 shell 呈现。

**构建完整主题或白标系统。** 否决，因为当前需求仅限工作台身份与空会话 Hero 文案。浏览器标题、桌面图标、主题、字体、壁纸和全局文案仍由原有模块负责。

**替换生成产物中的 YourBuddy 默认资源。** 否决，因为每次个性化都将要求重新构建，也不能让配置在普通 DSH Profile 变更中自然延续。

## Consequences

用户可以直接在运行中的应用里个性化工作台，也能恢复发行版默认值，无需编辑 YAML。该能力新增一个 Profile 命名空间和五个条件式 slot occupant，并有意不提供按 Workspace 区分身份或更广泛的换肤能力。

该 Package 会被复制到桌面端裁剪后的 workspace，进入 CLI 依赖闭包，并由桌面 Overlay 激活。聚焦测试固定设置默认值、本地化 Hero fallback、自定义及隐藏标记 occupant、应用与恢复生命周期、适配主题的主按钮 Token 配对、Bundle 收录和 Overlay 激活。
