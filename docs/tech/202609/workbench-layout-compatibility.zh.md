---
description: "在 YourBuddy 中持续维护 DSH 与 Better Sidebar 下游改动并交换工作台和对话区域的技术方案。"
---

# YourBuddy 工作台布局兼容与来源记录方案

[English](workbench-layout-compatibility.md) | 中文

YourBuddy 在自己的分支持续维护布局改动：Better Sidebar 工作台成为桌面主区域，DSH 对话移入右侧辅助栏。DSH 和 Better Sidebar 在 YourBuddy 之外保持原有默认行为，产品来源记录保存上游来源和小范围下游改动集合。

状态：已为 YourBuddy 0.3.7 实现。

## 目录

- [当前职责](#current-ownership)
- [已确定方案](#decisions)
- [运行时设计](#runtime-design)
- [下游维护](#downstream-maintenance)
- [升级流程](#upgrade-workflows)
- [实现](#implementation)
- [功能验收](#functional-acceptance)
- [回滚](#rollback)
- [后续研究](#further-exploration)
- [开发说明](#developer-note)

<a id="current-ownership"></a>

## 当前职责

| 关注点 | 当前所有者 | 所需改动 |
|---|---|---|
| Shell 轨道与拖动柄 | [`ui-layout/AppFrame.tsx`](../../../packages/client/ui-layout/src/client/AppFrame.tsx) 管理 `sidebar | conversation | details` 与可选的 `sidebar | workbench | details | conversation` 桌面 Grid | 外层宽度和拖动柄继续由 Shell 管理。 |
| Shell 子区域 | [`ui-layout/src/client/index.ts`](../../../packages/client/ui-layout/src/client/index.ts) 声明 `sidebar`、`conversation`、`details` 和 `shell.overlay` | 声明可选、Root Scope 的 `workbench` Slot，不替换 `conversation`。 |
| Better Sidebar 展现 | [`dsh-better-sidebar/src/client/index.tsx`](../../../apps/desktop-tauri/product/dsh-better-sidebar/src/client/index.tsx) 挂载 Body Portal 或 Workbench Slot | 保留 Portal 默认值，并在 YourBuddy 中选择 Slot。 |
| Better Sidebar 行为 | 插件 Service 和 Store 管理标签、查看器、终端、拦截器和工作台状态 | 两种展现模式复用同一个 Service 和 Store。 |
| DSH 更新 | [`sync-dsh-upstream.mjs`](../../../apps/desktop-tauri/scripts/sync-dsh-upstream.mjs) 把官方 DSH Release 合并到 YourBuddy 分支 | 把布局改动作为已提交的下游代码，并在每次 Merge 时协调。 |
| 外部插件更新 | [`refresh-product-plugins.mjs`](../../../apps/desktop-tauri/scripts/refresh-product-plugins.mjs) 使用 npm 或 GitHub 来源替换产品快照 | 对每个新的暂存快照重新应用 Better Sidebar 兼容补丁。 |

<a id="decisions"></a>

## 已确定方案

1. YourBuddy 在自己的分支持续维护 DSH 布局改动，不以进入官方 DSH Release 为前提。
2. DSH 增加通用、可选的 `workbench` Slot。Slot 被占用时成为桌面主区域；没有 Occupant 时 DSH 保持原有对话布局。
3. Better Sidebar 保留 `portal` 默认展现，并为 YourBuddy 增加 `slot`。
4. 两个修改后的代码库都提交到 YourBuddy 仓库。DSH 更新使用 Merge 和比较；Better Sidebar 更新使用上游快照与兼容补丁重新生成产品快照。
5. 来源记录保持精简：只记录上游身份、补丁文件、补丁 Hash、用途和受影响路径。实现不引入通用补丁平台或复杂策略引擎。

<a id="runtime-design"></a>

## 运行时设计

### Shell 布局

`@deepseek-ai/dsh-client-ui-layout` 增加可选、Root Scope 的单一 `workbench` Slot。没有 Occupant 时，AppFrame 渲染当前三栏布局。Occupant 本身就是明确的运行时选择：AppFrame 把工作台渲染为可伸缩的桌面主区域，并把对话移入右侧辅助栏。

| 运行时状态 | 主区域 | 辅助区域 | 选择者 |
|---|---|---|---|
| 没有 Workbench Occupant | 对话 | 无 | DSH 默认值 |
| 存在 Workbench Occupant | 工作台 | 对话 | 注册到 `workbench` Slot 的插件 |

桌面轨道顺序是导航、主区域、详情和辅助区域。详情栏继续可用，不会被对话或工作台替换。

窄窗口保持对话为全宽任务区域，并通过 Shell Overlay 访问工作台。

### 几何与状态

DSH 管理外层 Grid、实际宽度、响应式布局和拖动柄。Better Sidebar 管理用户的工作台偏好与内容状态。

Better Sidebar Store 把 Split Pane 标签树、Dock 状态和内容按会话保存，同时在会话之间共享 Slot 宽度。桌面 Slot 展现始终显示标签树，不受已保存 Dock 状态影响。`ctx.layout` 上的小型注册项暴露期望的辅助栏宽度，并接收 AppFrame 发出的尺寸调整请求。

布局注册项跟随插件生命周期安装和移除。工作台注册项或 Occupant 缺席时，AppFrame 回退为当前对话布局。

### Better Sidebar 展现

Better Sidebar 把能力初始化与外层 Shell 分开，同时只创建一个 Store 和一个 `betterSidebar` Service。

- `portal` 创建 Body Host，并保留可展开的底部工作台。
- `slot` 把相同的 Split Pane 标签树注册到 DSH `workbench` Slot。桌面宽度下，它填满 Slot 并省略 Dock 的高度拖动与关闭控件；窄屏下，它回到 Overlay 并遵循 Dock 状态。
- 两种模式都保留相同的内置与第三方标签、查看器、终端、文件操作、Side Chat、Subagent View、拦截器、多语言、设置、Split Pane 和逐会话内容状态。普通资源打开继续使用 DSH 原生右侧栏。

Better Sidebar Host 配置增加 `presentation: 'portal' | 'slot'`，默认值为 `portal`。现有 Boot Decision 响应在 Client 挂载展现前携带解析后的取值。

现有补偿样式表仍保持一个文件，但只有生命周期管理的 Body Attribute 标识 `portal` 展现时，Frame 级 Selector 才生效。Slot 模式可以加载同一份样式表而不激活 Portal 布局规则。

### 产品选择

YourBuddy 把 Better Sidebar 配置为 `presentation: 'slot'`。由此产生的 Workbench Occupant 会激活 DSH 的可选桌面 Grid。产品插件不替换 `root`、`conversation` 或 `betterSidebar` Service。

<a id="downstream-maintenance"></a>

## 下游维护

两个组件都以修改后的形式提交。由于 DSH 有可合并的 Git 历史，而外部 Better Sidebar 快照会在刷新时被替换，两者采用不同的上游更新策略。

| 组件 | 仓库状态 | 更新策略 |
|---|---|---|
| DSH | 修改后的源码提交在 YourBuddy 分支 | `merge-and-compare` |
| Better Sidebar | 修改后的 `src` 和运行时 `lib` 快照提交在 `apps/desktop-tauri/product` | `replace-replay-and-compare` |

### DSH 下游改动

DSH 布局改动保持为小范围普通 Commit，只涉及 `packages/client/ui-layout` 及直接相关的文档和测试。官方 DSH 更新合并进 YourBuddy 分支，因此会保留该改动，或产生普通 Git 冲突供评审。

DSH 补丁文件是由补丁条目记录的 YourBuddy 下游基线生成的来源记录工件。它记录边界清晰的 DSH 改动，绝不再次应用到已经包含修改的 YourBuddy 工作树。

### Better Sidebar 下游改动

Better Sidebar npm 归档是可替换快照。兼容补丁同时包含被修改的 `src` 文件和包实际导出的运行时 `lib` 文件，避免为外部包增加第二套产品构建流程。

刷新在临时目录下载新的原始快照，在其中应用兼容补丁，运行聚焦包检查和 Bundle Client Smoke，再使用生成结果替换已提交的产品目录。

### 最小来源记录

`DSH_UPSTREAM.json` 继续记录官方仓库、Tag、版本和 Commit，并为已物化的下游改动增加简短 `patches` 列表。每项记录 `id`、`file`、`sha256`、`baseCommit`、`purpose` 和 `paths`。

`dsh-better-sidebar/YOURBUDDY_UPSTREAM.json` 保留当前包名、来源、Integrity、Archive、上游 Tree 和最终 Tree 字段。其 `patches` 条目改为包含 `id`、`file`、`sha256` 和 `purpose` 的结构化引用。

Bundle Manifest 包含这些来源记录和补丁 Hash。补丁内容只作为产品源码输入，运行时不读取。

不增加独立补丁 Registry、批准流程、兼容版本范围计算器或通用转换语言。补丁无法继续应用时，与对应上游升级一起维护。

<a id="upgrade-workflows"></a>

## 升级流程

### DSH Release 升级

1. 创建独立升级 Worktree，并获取选中的官方 DSH Tag。
2. 通过现有 DSH 同步流程合并官方 Commit。
3. 处理小范围布局改动中的冲突，并检查受影响文件的上游变化。
4. 从升级结果的下游基线重新生成 DSH 来源记录补丁。
5. 运行聚焦布局测试、构建、Bundle 应用 Smoke 和可见布局旅程。
6. 更新 `DSH_UPSTREAM.json`，把 Merge、下游调整、补丁和来源记录一起提交。

### Better Sidebar 升级

1. 在现有刷新暂存目录下载并解包选中的 npm 快照。
2. 对新快照重新应用 Better Sidebar 兼容补丁。
3. 上游修改了相同展现代码或已经包含部分行为时，调整补丁。
4. 针对暂存快照运行插件测试和构建 Client Smoke。
5. 更新补丁引用和 `YOURBUDDY_UPSTREAM.json`。
6. 一起替换并提交产品快照、补丁、Lockfile 和来源记录。

<a id="implementation"></a>

## 实现

### DSH 布局

- 可选 `workbench` Slot、随生命周期释放的宽度注册、第四轨道和辅助区域拖动柄位于 `@deepseek-ai/dsh-client-ui-layout`。
- 没有工作台 Occupant 时保持现有结果。
- 聚焦测试覆盖默认 Grid、占用后的 Grid、详情行为、尺寸调整、会话切换和生命周期释放。

### Better Sidebar 展现

- Portal 与 Slot 展现挂载共享同一份能力初始化。
- Host `presentation` 设置通过现有 Boot Response 传递。
- Portal 补偿 CSS 按展现模式限定；Slot 模式注册 Workbench 与共享宽度 Binding。
- Service、Store、标签、终端、查看器、Split Pane 工作台和集成保持共享。

### 下游记录

- 一个 DSH 布局补丁记录第一方下游 Diff，一个 Better Sidebar 兼容补丁覆盖源码与运行时 Bundle 输出。
- 两个现有来源文件包含结构化补丁条目。
- Better Sidebar 刷新会先重放声明的 Materialized Patch，再执行兼容调整；现有检查通过后才替换已提交快照。

### YourBuddy 组合

- 原生 Overlay 选择 Better Sidebar `slot` 展现。
- Better Sidebar 产品快照包含对应的源码、运行时 Bundle 和类型声明。
- Release 验证执行桌面组合并记录可见结果。

<a id="functional-acceptance"></a>

## 功能验收

| 领域 | 必需结果 |
|---|---|
| 默认 DSH | 没有工作台 Occupant 时，DSH 保持当前对话布局。 |
| 默认 Better Sidebar | 没有 YourBuddy 配置时，Better Sidebar 保持当前 Portal 展现。 |
| YourBuddy 桌面 | 导航保持在左侧，工作台是可伸缩主区域，详情仍可用，对话位于可调整宽度的右侧区域。 |
| 对话 | 流式输出、工具、审批、输入框附件、滚动、停止、重试和会话切换都可用。 |
| 工作台 | 内置与第三方标签、Explorer、Editor、Diff、Terminal、Browser、Side Chat、Subagent View、Split Pane 和内容恢复都可用。 |
| 几何 | 即使已保存 Dock 状态为折叠，桌面工作台仍填满 Slot；拖动柄跟随可见列，Slot 模式下 Portal 补偿不生效，切换会话后共享宽度偏好不变。 |
| 窄窗口 | 对话和审批仍可访问，工作台通过 Overlay 打开。 |
| 生命周期 | 刷新页面和重新激活插件后只有一个工作台区域，并保留已存内容。 |
| 升级 | 一次 DSH Release 升级和一次 Better Sidebar 快照刷新都能通过相应流程保留布局改动。 |

<a id="rollback"></a>

## 回滚

YourBuddy 可以通过选择 Better Sidebar `portal` 展现恢复默认对话布局，无需降级任一组件。工作台内容 Store 保持不变，因此切换展现不会丢弃标签或终端记录。

如果必须删除一项兼容改动，先删除其产品配置，再在同一个后续变更中删除下游代码和来源记录补丁。

<a id="further-exploration"></a>

## 后续研究

- 仅当可见使用暴露具体问题时，再调整辅助对话区域宽度或详情栏交互。
- 只有上游 DSH 或 Better Sidebar 后来提供等价行为时，才重新讨论下游补丁。

<a id="developer-note"></a>

## 开发说明

所有者：YourBuddy 桌面产品维护者。实现时间：2026-09-19，目标版本为 YourBuddy 0.3.7。复审期限：第一次触及任一补丁区域的上游刷新，或 2026-10-31，以较早者为准。实现优先采用最小的功能专用机制，不建设通用补丁管理框架。
