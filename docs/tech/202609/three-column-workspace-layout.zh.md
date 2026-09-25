---
description: "YourBuddy 三栏独立折叠与工作台提供者稳定切换的技术方案。"
---

# YourBuddy 三栏工作区布局

[English](three-column-workspace-layout.md) | 中文

状态：技术方案提案。本文定义实施目标，不表示该布局已经实现。

## 目标

YourBuddy 固定包含三个顶层语义栏：左侧导航、中间主工作台和右侧当前 Session。每一栏都能独立折叠，因此外壳支持全部三栏、两栏和一栏组合，同时保证至少保留一个内容栏。

Better Sidebar 是默认主工作台提供者，内容工作台是同一个中间位置的另一位提供者。选择提供者或其中的工具只改变中间栏内容，不能新增外层轨道、修改 Session 栏宽度或打开外壳覆盖层。

现有 DSH `rightbar` 保留为 Session 内部面板，不成为第四个顶层栏。

## 当前问题

[`AppFrame`](../../../packages/client/ui-layout/src/client/AppFrame.tsx) 在工作台注册后按 `sidebar | workbench | rightbar | auxiliary main` 渲染。它先扣除工作台绑定的辅助区域宽度，再计算侧栏和右面板轨道。[`LayoutController.registerWorkbench()`](../../../packages/client/ui-layout/src/client/service.ts) 只暴露“是否存在”和一个宽度，因此工作台占位、主区域位置与 Session 栏尺寸被耦合在一起。

Better Sidebar 在展示方式为 `slot` 时注册唯一的 `workbench` 槽位和宽度绑定，所以它的绑定实际控制辅助 Conversation 区域宽度。内容插件没有注册另一个主工作台提供者。选择内容后，它在 `shell.overlay` 注册 `ContentInspector`，把面板定位在导航侧栏旁，并在预构建的 [`oil-creator` 客户端](../../../apps/desktop-tauri/product/oil-creator/lib/client.js)中直接给 Conversation 宿主写入 `padding-left`。

这条路径解释了已观察到的问题：即使预期的中间工具没有出现或被遮挡，选择操作仍会改变 Conversation 几何尺寸。覆盖层和 DOM 内边距适配器绕过外壳的轨道所有权，因此外壳无法保持右侧 Session 栏，也无法表达中间区域挂载失败。

## 语义栏

| 栏 id | 含义 | 默认内容 | 折叠后占用 | 状态所有者 |
|---|---|---|---|---|
| `navigation` | 全局导航和工作区选择 | YourBuddy 导航侧栏 | 56 px 控制窄条 | 根布局 store |
| `primary` | 当前工作台提供者 | Better Sidebar | 0 px | 根布局 store 管可见性和提供者 id；提供者管理内部状态 |
| `session` | 当前 Session，包含 Conversation、Trajectory 和 Harbor 视图 | 当前 Conversation | 0 px | 根布局 store 管可见性和宽度；Session 包管理内部状态 |

折叠后的导航窄条只承担恢复控制，不算一个展开的内容栏。因此一栏布局只有一个展开的内容栏；仅在导航折叠时额外保留 56 px 窄条。

Session 栏拥有当前视图和内部 `rightbar`。打开文件查看器、详情面板或 Session 工具可以改变 Session 栏内部组合，但不能在 Session 栏之外增加 AppFrame 网格轨道。

## 状态模型

根布局 store 记录四个相互独立的维度：

| 状态 | 取值 | 修改来源 |
|---|---|---|
| 请求可见性 | 每个语义栏一个布尔值 | 只有显式折叠和展开操作 |
| 偏好尺寸 | 导航宽度和 Session 宽度，单位为像素 | 只有外层拖拽手柄 |
| 当前主工作台提供者 | 已注册的提供者 id | 只有提供者选择操作 |
| 最近聚焦栏 | 一个语义栏 id | 焦点进入某栏或显式显示操作 |

提供者内部状态不复制到根 store。Better Sidebar 继续拥有标签、分屏树、终端和每个 Session 的工作台状态。内容工作台拥有首页/详情路由、已选内容 id、当前详情标签和检查器宽度。Conversation、Trajectory、Harbor 与内部 `rightbar` 保持原有所有者。

store 暴露用户请求状态，纯计算求解器根据视口推导实际渲染状态。响应式让步不能改写请求可见性或偏好宽度，因此窗口重新变宽后会恢复用户原来的组合。

`navigation`、`primary` 和 `session` 中至少一个必须处于请求可见状态。直接折叠最后一个可见栏的操作由所属 action 拒绝，对应控件也禁用该操作。

## 组合 API

根槽位树从一个可选的单一 `workbench` 占用者改为按 key 选择的主工作台位置。外壳渲染 key 与 `activePrimaryProviderId` 一致的条目。

```text
root
├─ navigation
├─ primary.workbench[key = activePrimaryProviderId]
└─ session
   ├─ main[key = active Session view]
   └─ rightbar
```

具体实现可以在相邻迁移期间保留公开的 `sidebar`、`main` 和 `workbench` 名称，但它们的语义和基数必须符合以上层级。`workbench` 从 `single` 改为 `keyed`，同一项变更必须更新所有当前消费者。

`ILayout` 成为唯一的外层布局命令所有者，并提供以下操作：

- `setColumnExpanded(column, expanded)` 修改请求可见性，不改变提供者和内部工具状态。
- `toggleColumn(column)` 提供对应的用户操作。
- `selectPrimaryProvider(providerId)` 验证已注册的 keyed 条目，只修改当前提供者 id。
- `revealColumn(column)` 展开并聚焦一个栏，不折叠其他栏。
- `setNavigationWidth(width)` 和 `setSessionWidth(width)` 持久化拖拽结果。

布局可观察快照提供请求可见性、实际可见性、偏好宽度、当前提供者和最近焦点。组件通过现有框架绑定的 observable 机制读取；功能组件不订阅 `ctx`，也不查询外壳 DOM。

YourBuddy 产品组合把 Better Sidebar 配置为默认提供者。通用 DSH 不硬编码产品插件 id。首次提交快照前，过期的持久化提供者 id 会解析为产品配置的默认值。

## 提供者与工具导航

提供者选择和内部导航是两个独立事务。

1. 在全局导航中选择**内容**，调用 `selectPrimaryProvider(contentProviderId)`。
2. 外壳保持当前可见性掩码和两个偏好宽度。
3. keyed 中间位置用内容工作台替换 Better Sidebar。
4. 选择一个内容卡片，只更新内容工作台自己的路由或已选内容 id。
5. 内部工具加载失败时，在中间位置显示错误或空状态，不调用任何外层布局 action。

返回 Better Sidebar 时只修改提供者 id。每个提供者保留的 store 恢复自己的当前标签或路由。提供者卸载会移除对应 keyed 条目；如果它正处于激活状态，外壳原子切换到配置中仍可用的后备提供者，同时保持可见性和几何尺寸。

提供者不能写外层 padding、网格模板或同级区域宽度。`shell.overlay` 继续承载 toast、模态层等临时跨栏界面，不承载停靠式工作台内容。

## 栏位求解

桌面网格始终遵循 `navigation | primary | session` 的语义顺序。只有实际展开的栏产生内容轨道；拖拽手柄只出现在相邻的展开栏之间。

- 导航展开时使用经过限制的偏好宽度。
- Session 与其他内容栏并排时使用经过限制的偏好宽度。
- Primary 使用剩余宽度。
- Primary 隐藏时，剩余的非导航栏占用可用宽度，但不改写自己的偏好值。
- 只展开一个内容栏时，它填满恢复控制之外的全部空间。
- 拖动导航边界只更新导航偏好；拖动 Session 边界只更新 Session 偏好。

桌面初始最小宽度分别为 Navigation 264 px、Primary 420 px、Session 400 px。求解器判断请求组合能否容纳时，需要计入手柄和折叠导航的 56 px 窄条。除非产品配置出现真实的当前消费者，否则这些值保持实现常量。

当视口无法满足全部请求最小宽度时，求解器推导紧凑展示，但不改变存储的掩码。它先把展开的 Navigation 收为窄条。如果两个内容栏仍无法同时容纳，则显示最近聚焦的内容栏，并通过外壳栏位切换器提供另一个栏。视口重新变宽后恢复完整请求组合和偏好宽度。

## 支持的切换

请求可见性共有七种有效组合。

| 展开的栏 | 结果 |
|---|---|
| Navigation + Primary + Session | 完整三栏工作区 |
| Navigation + Primary | 以工作台为主的两栏工作区 |
| Navigation + Session | 以 Session 为主的两栏工作区 |
| Primary + Session | 隐藏展开导航后的工作台与 Session |
| 仅 Navigation | 导航管理视图 |
| 仅 Primary | 专注工作台 |
| 仅 Session | 专注 Session |

折叠和展开会保留隐藏栏的宽度、当前提供者、内部路由和滚动状态。重新展开时恢复这些值。切换提供者保留完整外层状态。切换 Session 保留外层状态，并让 Session 范围的提供者 store 选择对应内部状态。

## 持久化与迁移

外层布局偏好属于设备本地界面状态，不写入 Session 日志、模型上下文、工作区数据或 URL。使用一个带版本的记录保存请求可见性、导航宽度、Session 宽度、每个工作区的当前提供者和最近焦点。在 localStorage 解析边界验证该记录，通过产品配置处理缺失的提供者。

提供者状态继续由提供者自己的存储维护。Better Sidebar 当前的 `dsh-sidebar:v1:width` 值一次性映射为新的 Session 偏好宽度，因为该值当前实际控制辅助 Conversation 栏。内容插件的已选 id 和详情标签状态迁入内容提供者 store；检查器宽度仍是提供者内部状态，不能成为外层栏宽度。

迁移会删除 `applyConversationInset()`、Conversation 宿主 DOM 查询、停靠式 `shell.overlay` 注册，以及把内容面板定位在侧栏旁的 CSS 变量。同时删除工作台提供者通过 `registerWorkbench()` 管理 Session 宽度的能力。

后续路由设计可以允许 URL 请求某个 Session 或提供者，但 URL 不编码像素宽度和折叠状态。这类请求必须调用同一组经过验证的布局命令，不能直接修改 store。

## 焦点与无障碍

每个展开栏都有带标签的折叠控件，并设置 `aria-expanded` 和 `aria-controls`。Primary 或 Session 隐藏时，外壳级栏位切换器仍可通过键盘访问；折叠后的导航窄条为 Navigation 提供同类恢复控件。

折叠当前聚焦栏后，焦点移到对应恢复控件。只有用户显式执行显示操作时，展开栏才把焦点移到标题；响应式恢复不能抢夺焦点。提供者切换在 keyed 条目提交后把焦点移到提供者标题。提供者内容失败时，错误边界仍保留标题和恢复控件。

所有组合的 DOM 顺序始终是 Navigation、Primary、Session。CSS 轨道变化不能重排焦点顺序和阅读顺序。

## 失败与生命周期规则

- 只有目标 keyed 条目存在时才能提交提供者选择；无效命令保留当前提供者。
- 过期持久化 id 在渲染前完成解析，缺失的提供者不能预留空白轨道。
- 提供者渲染失败限制在 Primary 错误边界内，所有轨道保持不变。
- 提供者注册和卸载遵循 Cordis effect 生命周期，并通过现有 Slot 生命周期测试证明移除。
- 适用的异步工具打开流程使用布局导航中止信号；已被取代的结果不能修改当前提供者或可见性。
- Session 或内部 rightbar 失败不能折叠 Navigation 或 Primary。
- 挂载、错误和空状态都不能以副作用修改偏好宽度。

## 实施阶段

### 1. 根布局模型

在 `ui-layout` store 中加入语义可见性、提供者选择、焦点和 Session 宽度状态。用纯三栏求解器替换当前按工作台存在状态计算的布局，并把 `rightbar` 组合移入 Session。

### 2. Keyed 提供者位置

把工作台槽位改为 keyed 基数，在现有主面板保留逻辑旁增加提供者保留和验证，并把 Better Sidebar 配置为 YourBuddy 默认 keyed 条目。Better Sidebar 停止注册宽度绑定，改为填满分配给它的中间位置。

### 3. 内容工作台迁移

把内容工作台注册为 keyed 主工作台提供者，把首页、已选内容详情和工具路由移入该条目。删除停靠覆盖层和 Conversation padding 适配器。内容导航选择提供者，内容卡片只修改提供者内部状态。

### 4. 折叠控制与持久化

加入每栏控制、外壳切换器、焦点恢复、带版本的本地记录和一次性宽度迁移。响应式实际状态保持为推导值，不能持久化。

### 5. 产品验证

验证完整 YourBuddy 组合；只有 Better Sidebar、内容工作台和外壳都使用新 API 后，才能删除兼容代码。实现改变现有运行时所有权时，同步更新[工作台兼容记录](workbench-layout-compatibility.zh.md)。

## 测试矩阵

| 层级 | 必需证据 |
|---|---|
| Store 单元测试 | 七种掩码；拒绝空掩码；宽度保留；提供者选择与可见性独立；过期提供者后备 |
| 求解器单元测试 | 三栏、全部两栏和全部一栏在边界宽度下的结果；响应式让步和变宽恢复；偏好值不变 |
| AppFrame 组件测试 | 语义 DOM 顺序、相邻手柄、折叠控件、焦点恢复，以及提供者切换前后网格几何不变 |
| 布局服务测试 | keyed 注册、无效选择、当前提供者卸载、导航中止和 HMR 安全清理 |
| Better Sidebar 测试 | 默认选择、每个 Session 的状态保留、不注册宽度绑定、填满工作台位置 |
| 内容工作台测试 | 导航选择内容；卡片选择改变中间内容；加载失败保留在中间；不使用 `shell.overlay` 停靠，也不修改 Conversation 样式 |
| 真实组合测试 | Loader 启动同时包含两个提供者的 YourBuddy，执行三栏→两栏→一栏→三栏，并在每种组合切换提供者，观察 Session 宽度稳定 |
| 浏览器回放 | 无密钥 Web 场景覆盖已报告点击路径和窄/宽恢复；面向产品用户的实现同时提供规定的 GUI 录制证据 |

实施阶段的聚焦检查是 `pnpm run test:gui` 和 `DSH_SNAPSHOT=replay pnpm run test:web`，然后通过 `dsh-pre-push-checks` 选择覆盖待提交差异的检查。文档变更继续运行 `pnpm run doc-sync` 和链接检查。

## 验收标准

1. Better Sidebar 默认出现在中间，内容工作台在同一个 DOM 和网格位置替换它。
2. 七种有效可见组合都能通过可见控件到达，外壳不能进入空组合。
3. 折叠或展开一栏不能重置其他栏的宽度和内部状态。
4. 切换主工作台提供者不能改变外层宽度、可见性、Session 选择或 Session 视图。
5. 点击内容项会明显改变中间提供者状态或显示中间位置错误，不能只让 Conversation 变窄。
6. 打开 Session `rightbar` 只能改变 Session 栏内部，不能创建第四条外层轨道。
7. 响应式让步在视口变宽后恢复请求的桌面组合。
8. 提供者失败、卸载和 HMR 后仍保留可用恢复控件和确定的后备行为。
9. 内容工作台和 Better Sidebar 都不能查询 Conversation DOM 或写入同级区域几何样式。

## 非目标

本方案不合并提供者业务 store，不把 Session 数据移入布局持久化，不定义移动端功能重做，也不把所有覆盖层改造成栏。方案只增加一个 keyed 主工作台扩展点和一个根所有的外层布局模型，因为 Better Sidebar 与内容工作台是当前真实消费者。

## 开发者说明

所有者：YourBuddy 桌面与 Web Client 维护者。首次实现 `ui-layout`、Better Sidebar 或内容工作台变更时，一并复核本方案。槽位和布局服务类型改变时，实现必须同步更新所属 subsystem 与 package 文档。
