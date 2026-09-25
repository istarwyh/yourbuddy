---
description: "Better Sidebar 核心工作台与共享同一中间位置的内容详情模式技术参考。"
---

# YourBuddy 以 Better Sidebar 为核心的工作台架构

[English](creator-workbench-core-layout.md) | 中文

## 产品模型

Better Sidebar 是 YourBuddy 的核心工作台，负责中间工作体验，包括标签、分屏、文件、编辑器、终端、浏览器和其他工具视图。DSH Conversation 显示在右侧，用户可以同时工作并与 Agent 对话；用户希望中间工作台使用全部剩余宽度时，也可以把它完全折叠。

左侧侧栏提供**会话**和**内容**两个导航标签。切换左侧标签只改变导航列表。选择一条具体内容后，内容详情工作区临时替换中间可见的 Better Sidebar。关闭内容详情、返回会话或执行“返回工作台”后，恢复 Better Sidebar 及其原有标签和分屏。

内容是临时的中间位置模式，不是 Better Sidebar 标签、第二个外层栏，也不是产品主外壳。

## 布局模型

创作者产品使用以下外层排列：

```text
Navigation | Middle workbench seat | Session right area
```

中间位置只有两种由产品拥有的模式：

| 模式 | 中间可见内容 | 进入操作 | 退出操作 |
|---|---|---|---|
| `core` | Better Sidebar | 应用启动、会话导航、关闭内容 | 选择一条内容 |
| `content` | 已选内容详情 | 选择一条内容 | 关闭、返回工作台或会话导航 |

中间模式切换不能增加或删除 AppFrame 轨道、改变右侧 Session 宽度或展开状态、选择其他 Session 或修改 Better Sidebar store。一个产品协调器拥有中间模式，以及右侧 Session 的展开偏好和恢复宽度。Better Sidebar 与 Oil Creator 只贡献内容。

右侧 Session 区域是由 DSH `rightbar` 和 Conversation 组成的一个产品可见区域，并拥有统一的展开状态。折叠会彻底移除两条外层轨道，让中间位置使用释放出的宽度，同时保留每个内部界面的状态；展开会恢复保存的 Conversation 宽度和保留的 rightbar 展示，同时保持中间模式不变。现有左侧栏折叠继续可用。中间位置不支持独立折叠。

## 组合所有权

[`AppFrame`](../../../packages/client/ui-layout/src/client/AppFrame.tsx) 拥有桌面和窄视口网格，并使用通过 [`LayoutController.registerWorkbench()`](../../../packages/client/ui-layout/src/client/service.ts) 注册的通用工作台占用状态。YourBuddy 产品协调器是唯一的根 `workbench` 占用者，也是唯一协调中间模式和聚合 Session 几何尺寸的产品组件。

Better Sidebar 贡献持久的 `workbench.core` 子项，Oil Creator 贡献临时的 `workbench.content` 子项。两个功能都不拥有 AppFrame 轨道、同级区域宽度或 Conversation 几何尺寸。Oil Creator 在分配的中间边界内渲染内容详情；它不注册停靠式 `shell.overlay`、查询 Conversation 宿主或写入 Conversation padding。

[工作台兼容记录](workbench-layout-compatibility.zh.md)说明 Better Sidebar 的位置和上游集成。本文负责说明该位置周围的 YourBuddy 产品组合。

## 组件组合

产品协调器在创作者 profile 的完整生命周期内占用根 `workbench` 槽位。它声明两个明确的子位置，而不是建设通用提供者框架：

```text
root
└─ workbench                 YourBuddyWorkbenchHost
   ├─ workbench.core         Better Sidebar
   └─ workbench.content      Oil Creator content detail
```

宿主在同一个中间网格单元中渲染两个子项。Better Sidebar 子项在两种模式中都保持挂载并继续运行，因此组件和 store 状态能够跨越临时替换。`content` 模式下，它的包装层在视觉上隐藏，并退出焦点和无障碍树，但不增加资源挂起行为。内容详情在相同边界内显示于其上方。返回 `core` 后显示现有 Better Sidebar 组件树，并触发正常尺寸观察器。

两个子槽位刻意采用产品专用的 `single`，因为只有两个消费者。该组合不暴露公开的动态工作台提供者注册表。

协调器而不是 Better Sidebar 向 `ctx.layout` 注册外层工作台绑定。它的快照包含 Session 区域的请求展开状态和 Conversation 正数偏好宽度。AppFrame 在折叠时把已报告的 rightbar 预留和辅助 Conversation 轨道都推导为 `0px`，在展开时恢复 rightbar 报告和经过限制的 Conversation 宽度。中间模式切换不能写入这两个字段。

恢复控件位于中间宿主或持久外壳控制区，不能放在已经折叠的 Session 区域内。显式新建或选择 Session 会展开右侧区域，因为用户明确指向 Conversation。普通流式内容、工具活动、内容选择和中间模式切换不能展开它；下文明确的 Session 输入请求与本轮完成事件可以展开。

窄视口下一次只显示一个内容界面。Session 展开时 Conversation 保持主界面，工作台通过现有抽屉显示；Session 折叠时工作台宿主成为主界面，同时保留持久的 Conversation 恢复控件。宿主仍在同一个工作台边界内切换 Better Sidebar 和内容，不能创建第二个覆盖层。

## 状态所有权

| 状态 | 所有者 | 生命周期 |
|---|---|---|
| 中间模式：`core` 或 `content` | 产品工作台协调器 | 创作者 profile 的 Client 生命周期 |
| 右侧 Session 展开偏好 | 产品工作台协调器 | 经过验证的设备本地偏好 |
| 右侧 Session 正数偏好宽度 | 产品工作台协调器 | 经过验证的设备本地偏好，折叠时继续保留 |
| Better Sidebar 标签、分屏树、终端、查看器和每个 Session 的状态 | Better Sidebar store 与服务 | Better Sidebar 插件生命周期 |
| 左侧会话/内容导航标签 | Oil Creator 侧栏 store | 创作者插件生命周期和设备本地偏好 |
| 已选内容、详情标签、草稿和内部详情宽度 | Oil Creator store 与 Host 服务 | 创作者插件生命周期；持久数据保留在磁盘或 Host |
| 当前 Session 和 Conversation 视图 | DSH Session 与 Conversation 包 | 现有 Session 机制 |
| 外层轨道和响应式位置 | `ui-layout` | 根布局生命周期 |

切换中间模式只修改协调器的 `mode`。选择内容先更新 Oil Creator 选择，只有目标记录被接受后才进入 `content`。退出内容时，创作者导航命令决定清空还是保留选择，但不能修改 Better Sidebar 状态。

Better Sidebar store 在 Slot 组件挂载之前、每次 `apply()` 生命周期中创建一次。展示注册与服务和 store 创建相互分离。组件保持挂载还可以保护 store 未记录的编辑器、终端、滚动和焦点恢复状态。

## 产品协调器服务

协调器向 Oil Creator 侧栏和内容详情提供职责有限的产品服务：

- `showCore()` 显示 Better Sidebar，不改变当前标签和 Session。
- `showContent(id)` 先让 Oil Creator 选择并验证内容，再显示内容详情。
- `closeContent()` 显示 Better Sidebar，并把焦点移到打开或关闭详情的逻辑控制点。
- `setSessionExpanded(expanded)` 把 rightbar 和 Conversation 的预留都折叠为零，或恢复各自记录的展示，同时保持中间模式不变。
- `setSessionWidth(width)` 只更新下次展开时恢复的 Conversation 正数宽度。
- `getSnapshot()` 与 `subscribe()` 通过框架绑定的 observable 向已注册 UI 暴露当前模式、已选内容标识、Session 展开状态和偏好宽度。

协调器不暴露任意提供者注册、React 节点、网格样式或 Session 修改。Better Sidebar 与 Oil Creator 通过 `ctx.slots.inject()` 注册到各自声明的子槽位，不能互相导入组件。

左侧导航遵循以下切换：

1. 选择**内容**只把左侧列表切到内容库，中间模式保持不变。
2. 选择一条内容调用 `showContent(id)`，在中间位置显示详情。
3. 选择**会话**或点击“返回工作台”时调用 `showCore()`，并保留当前 Session 展开状态。
4. 显式新建或选择一个 Session 时调用 `showCore()`，并展开右侧 Session 区域。
5. 关闭内容不能关闭 Better Sidebar、清空其标签或以其他方式改变右侧 Conversation。

重复选择同一条内容时保持内容模式，不更新外层几何尺寸。选择另一条内容只替换创作者详情状态。

## 打开意图与 Agent 事件规则

每个 Better Sidebar 打开请求都携带产品意图：显式用户操作使用 `user`，Agent 与自动化活动使用 `background`。用户意图请求创建或激活目标标签，调用 `showCore()` 并聚焦该标签，同时保持 Session 展开状态不变。后台请求只创建或更新隐藏的 Better Sidebar 状态，并可以标记工作台恢复控件，但不能替换可见内容或改变焦点。

折叠的 Session 区域依据语义 Session 事件工作，不能观察 DOM 或匹配本地化文字。流式内容、工具活动和普通后台更新保持折叠。请求用户输入时展开 Session 区域并显示问题或审批界面；本轮完成时展开 Session 区域并显示 Conversation 最终状态。这些事件驱动的展开会保留当前中间模式，不能清空内容或 Better Sidebar 状态。

事件 Consumer 在识别权威 Session 状态的位置拥有展开决策。界面徽标和恢复控件从同一份已记录状态推导，不能独立猜测任务是否完成。

## Better Sidebar 职责

Better Sidebar 在默认创作者 profile 中完整启用。它的注册服务、内置工具、原生文件操作、标签模型、每个 Session 的状态和可选外部标签贡献属于产品能力。

它的展示所有权仅限于核心子项：

- 在 YourBuddy slot 模式下，Better Sidebar 把组件注册到 `workbench.core`，并接收 `visible` owner prop。
- 内容显示期间，它的 store、服务、原生界面、拦截器和注册继续运行。
- 产品协调器拥有外层辅助 Session 宽度绑定。
- YourBuddy 之外的 portal 展示属于上游 Better Sidebar，不使用产品协调器。

内容可见期间，Better Sidebar 保持挂载并继续运行。实现不增加资源挂起、进程暂停或隐藏模式优化，只有包装层因展示和无障碍要求变为 hidden 与 inert。重新显示后安排现有 resize 路径，让终端和编辑器重新测量恢复的边界。

## 内容职责

Oil Creator 拥有左侧内容库，并向 `workbench.content` 贡献一个中间内容详情组件。该组件包含概览、视频、脚本、字幕、封面、文章、发布和流程阶段界面。

Oil Creator 没有外层几何行为：

- 它不把 `ContentInspector` 注册为停靠式 `shell.overlay`。
- 它不查询 `conversationHost()`。
- 它不调用 `applyConversationInset()` 或写入 Conversation padding。
- 它不根据 `--oil-sidebar-width` 定位内容详情。
- 它不拥有外层中间宽度或 Session 宽度。

内容可以保留内部详情标签布局和内部列表—详情宽度，只要都位于分配的中间边界内。未保存的脚本和字幕草稿位于 Oil Creator store，已经提交的文件和长任务继续由 Host 所有者持有。因此，返回 Better Sidebar 不能丢弃草稿、取消任务，也不能让组件可见性成为用户工作的唯一副本。

## 上游一致性与 package 边界

DSH 核心只接收通用布局能力：被占用的工作台可以报告辅助主区域是否展开、正数偏好宽度，以及关联 rightbar 预留是否参与当前求解。`ui-layout` 拥有计算和 DOM 轨道，其源码不能包含 YourBuddy、Better Sidebar、Oil Creator、Content 或创作者 profile 标识。

产品协调器位于 YourBuddy 产品组合之下，拥有全部产品语义，包括 `core/content`、聚合 Session 区域、打开意图、Agent 事件展开和持久化。它通过 Cordis 服务和声明的 Slot 组合功能 package，不能运行时导入其他功能组件。

Better Sidebar 拥有标签平台，只贡献 `workbench.core`；它的 YourBuddy 兼容补丁只包含展示适配器，不能包含 Content 行为。Oil Creator 拥有创作者数据，只贡献 `workbench.content`；它不能了解 AppFrame、Conversation、rightbar 或 Better Sidebar 几何尺寸。每个 package 都能在不导入其他功能 package 运行时的情况下构建和测试。

上游同步检查三项性质：DSH 集成保持通用；Better Sidebar 与 Oil Creator 快照记录上游身份和最小补丁；产品验证重新构建产物、无模糊匹配地重新应用补丁，再运行真实组合流程。补丁应用失败或通用布局约定变化会阻止刷新，不能静默保留分叉 bundle。

这种分离无法阻止上游 API 变化，但能把产品专用行为留在 DSH 主代码之外，让每项必要适配都明确、很小且可测试。

## 持久化

协调器用一个带版本的记录保存聚合 Session 展开偏好、上次 Conversation 正数宽度和可选的上次中间模式。折叠不能覆盖正数宽度或 rightbar 占用者自己的展示状态；AppFrame 只在实际渲染几何中屏蔽这些轨道。默认启动模式始终是 `core`，产品重启后不重新打开内容详情。

Oil Creator 的设备本地记录拥有导航标签、已选内容、筛选、搜索和内部详情偏好。外层覆盖层宽度不属于创作者状态。持久脚本、字幕、封面、文章和发布状态继续位于创作者片库与 Host 记录。

Better Sidebar 持久化的标签和偏好保持现有格式。只有协调器读写聚合 Session 几何记录；提供者和创作者代码不能直接访问该记录。

## 焦点与无障碍

中间宿主无论处于哪种模式都只有一个带标签区域。模式控制在适用位置暴露 `aria-expanded` 或选中状态，内容详情提供带标签的“返回工作台”操作。

进入内容后，只有目标条目提交成功才把焦点移到内容标题。关闭内容后，焦点恢复到已选内容行或返回操作的逻辑前序控制点。隐藏的 Better Sidebar 使用 `hidden` 或等效 `inert` 行为，使其控件不能获得焦点，屏幕阅读器也不会同时朗读两种模式。

折叠当前获得焦点的 Session 后，焦点移到中间宿主或外壳控制区中的持久恢复控件。只有显式指向 Session 的操作才会在展开后把焦点移入 Conversation；普通恢复操作让焦点留在控件上。折叠控件暴露 `aria-expanded` 和 `aria-controls`，零宽度 Session 子树在保留状态的同时变为 inert。

响应式进入或退出窄屏抽屉不能抢夺焦点。内容加载失败时，中间位置继续显示内容标题、错误信息和返回操作。

## 失败与生命周期规则

- 协调器在一个 Cordis effect 生命周期内占用根工作台，并一起释放布局绑定与子槽位声明。
- 缺少 `workbench.core` 时，创作者 profile 不能静默显示空白默认页；组合在最早可解析点失败。
- 缺少 `workbench.content` 时，`showContent()` 被拒绝并保留可见 Better Sidebar。
- 内容加载失败保留在中间内容界面，Conversation 几何尺寸保持不变。
- Better Sidebar 渲染失败保留在现有错误边界内，不能阻止内容详情提供返回操作。
- 内容可见时 Oil Creator 卸载，协调器原子返回 `core`。
- Better Sidebar 卸载会使必要核心组合失效，不能把内容选为永久后备。
- HMR 不能创建重复的根、core、content、布局绑定或 Remote 注册。
- 折叠 Session 会保留正数宽度、rightbar 展示、当前 Session、视图、滚动状态和正在运行的生成。
- 当前 Session 请求输入或本轮完成时，聚合 Session 区域只展开一次；非当前 Session 的事件标记导航状态，但不能隐式切换 Session。
- Better Sidebar 后台打开请求不能替换 Content；用户意图打开请求不能让目标继续隐藏。
- 缺少恢复控件属于组合失败；产品不能进入无法恢复的零宽度 Session 状态。
- 中间模式切换不能以副作用写入外层宽度、Session 展开状态或 Session 选择。

## 实现所有权

| 所有者 | 职责 |
|---|---|
| YourBuddy 产品组合 | 拥有 `YourBuddyWorkbenchHost`、协调器服务与状态、两个子槽位、根布局绑定、打开意图规则、Session 事件展开和设备本地聚合几何偏好。 |
| `ui-layout` | 拥有通用工作台占用几何尺寸、桌面和窄视口 AppFrame 轨道，以及关联 rightbar 和辅助主区域预留的屏蔽与恢复。 |
| Better Sidebar YourBuddy 适配器 | 贡献 `workbench.core`，保持 Better Sidebar store 和组件存活，并暴露可见性，但不拥有外层几何尺寸或 Content 行为。 |
| Oil Creator | 贡献 `workbench.content`，拥有内容选择和草稿，通过协调器处理导航，并把全部内容界面限制在分配的中间边界内。 |
| 产品构建与刷新路径 | 记录精确上游身份，无模糊匹配地应用最小补丁，重新构建产物，拒绝过期组合输出，并执行真实 YourBuddy 流程。 |

YourBuddy profile 只有一个由协调器拥有的根工作台，不把功能直接注册和协调器注册作为并行组合模式维护。

## 验证覆盖

| 层级 | 已验证行为 |
|---|---|
| 协调器状态 | 默认 `core`、有效 core/content 切换、缺少内容时拒绝、Session 折叠与恢复、保留正数宽度，以及切换相互独立 |
| 协调器组件 | 两个子注册、Better Sidebar 隐藏时保持挂载、排除焦点、返回操作、持久 Session 恢复控件和窄屏展示 |
| Better Sidebar | store 和组件状态跨越 core → content → core；隐藏时服务保持活动；`user` 打开显示目标标签，`background` 打开不替换 Content |
| Oil Creator | 内容导航只改变左侧列表；内容行打开中间详情；返回后草稿保留；会话和返回恢复 core；不使用覆盖层或写 Conversation 样式 |
| Session 事件 | 流式内容和工具保持折叠；当前 Session 输入请求和本轮完成只展开一次；非当前 Session 完成不能切换 Session |
| 布局回归 | 一个稳定工作台占用者；Content 模式期间 Session 状态一致；折叠后 rightbar 与 Conversation 轨道都为零；展开恢复两者展示 |
| 生命周期 | 卸载和 HMR 各自只移除一次根与子注册；Oil 卸载返回 core；缺少 Better Sidebar 或恢复控件时明确失败 |
| 真实组合 | YourBuddy 在进入 Content、两种打开意图、聚合折叠、事件驱动展开和返回前后保留标签、草稿、rightbar 状态、Session 标识和宽度 |
| 浏览器回放 | 无密钥流程覆盖“会话 → 内容列表 → 内容详情 → 返回”、Session 区域完全折叠，以及输入和完成时自动打开 Conversation |
| 产品发布 | 构建产物使用协调器槽位，不包含外层几何适配器，记录精确上游身份，无模糊匹配地应用最小补丁，并保证 `ui-layout` 不包含产品标识 |

聚焦 package 测试、`pnpm run test:gui` 和 `DSH_SNAPSHOT=replay pnpm run test:web` 覆盖该实现。发布证据还包括面向产品用户的 GUI 交互录制。

## 可观察行为

应用启动时，Better Sidebar 占用中间位置。把左侧导航切到内容只改变左侧列表；选择一条内容后，其详情显示在同一位置。返回、关闭和会话导航恢复同一组 Better Sidebar 标签、分屏、终端会话、编辑器状态和滚动上下文。

中间模式切换保留聚合 Session 区域的展开状态、已选 Session、Conversation 宽度和 rightbar 展示。用户可以把 rightbar 和 Conversation 都折叠为零宽度轨道，并通过始终可见的控件恢复。

用户意图的 Better Sidebar 打开请求显示并聚焦目标。后台打开请求更新隐藏工作台，不能替换 Content。当前 Session 请求输入和本轮完成时展开 Conversation；流式内容和工具活动不能展开，非当前 Session 不能抢走选择。

Content 草稿和 Host 任务跨越每次切换保持，不能把组件可见性作为唯一状态。内容详情使用根工作台边界，不注册停靠式 shell overlay。Oil Creator 不包含 Conversation DOM 查询、同级区域 padding 写入或外层宽度所有者。

窄视口在 Session 折叠时把工作台显示为主界面，并保留持久 Conversation 恢复控件，不能打开第二个覆盖层。DSH `ui-layout` 只包含通用辅助布局语义；Better Sidebar、Content、Agent 事件和创作者 profile 决策都留在产品 package。真实组合测试和浏览器回放覆盖两种打开意图、聚合折叠和事件驱动 Conversation 展开。

## 局限

Navigation 保留现有折叠，但中间位置不能独立折叠。内容可见期间，实现不会挂起 Better Sidebar 资源；package 分离也无法阻止上游 API 变化。受支持的组合保留两种中间模式、显式聚合 Session 折叠和唯一外层几何所有者；不支持提供者所有的同级宽度和 DOM padding 适配器。

## 开发者说明

所有者：YourBuddy 桌面产品维护者。本文说明 YourBuddy 0.3.16 的组合，其中 Better Sidebar 是持久产品工作台，内容是在同一中间位置中显示的临时聚焦界面。
