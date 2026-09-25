# Agent Note: YourBuddy 产品工作台协调器

Status: implemented

[English](2026-09-25-yourbuddy-product-workbench-coordinator.md) | 中文

## 问题

YourBuddy 需要让 Better Sidebar 保持核心工作界面，同时允许创作者内容临时使用同一个中间区域。原生右侧栏与 Conversation 构成一个用户可见的会话区域；只隐藏 Conversation 会留下具有误导性的占用轨道，也会让不可见的内容 Overlay 改变 Conversation 几何。Agent 在后台打开资源时不能抢走正在显示的内容焦点，而输入请求与已完成的 Turn 仍需及时可见。

此前的工作台主区域布局让 Better Sidebar 拥有根 `workbench` Slot 及其宽度 Binding。该所有权无法协调另一个中间界面、聚合会话收起或产品级导航意图，除非让功能插件互相导入，或把 YourBuddy 词汇放进通用 DSH Package。

## 决策

第一方 `dsh-personal-workbench` 插件是产品协调器。只有它占用根 `workbench` Slot，声明产品专用的 `workbench.core` 与 `workbench.content` 子 Slot，并拥有唯一的 Layout Binding。Better Sidebar 把既有 Split Pane Tree 注册到 `workbench.core`；Oil Creator 把一个始终挂载的 Content Inspector 注册到 `workbench.content`。协调器隐藏并 Inert 非活动 Wrapper，但不卸载任一功能，因此 Better Sidebar Service、终端、Tab、创作者草稿与 Host Job 都能独立于可见性继续存在。

Layout Binding 携带一个正数恢复宽度，以及 `expanded` 和 `reserveRightbar`。通用 `ui-layout` 即使在收起状态也会按恢复宽度计算几何，然后在 `expanded` 为 false 时为原生右侧栏与辅助 Main 渲染精确的零宽轨道。右侧栏会收到独立的 `visible` 呈现事实：它隐藏 Panel 与 Float，但不改写自身的展开、全屏、Tab 或 Split 状态。桌面端保持中间工作台为主界面；窄屏在展开时保持 Conversation 为主界面，在会话区域收起时改为中间工作台为主界面。

Conversation 标题栏与中间工作台边缘都可以收起完整会话区域。中间控件留在隐藏区域之外，并恢复此前保存的正宽度；控件通过 `aria-controls` 标识同一个区域，收起操作会把焦点从刚变成 Inert 的 Session 内容移动到持久恢复控件。协调器只持久化会话展开状态与宽度；Oil Creator 继续持有内容选择与草稿，Better Sidebar 继续持有逐 Session Split Tree。完成初始状态恢复后，选择另一个当前 Session 会显示核心工作台并展开会话区域；当前 Session 出现新的输入或审批请求，以及追加持久化 `turn/end` 时也会展开。初始 Replace、历史 Prepend、临时流式事件、工具事件与非当前 Session 都不会改变选择或展开状态。

Better Sidebar 会把每次打开解析为明确的 `user` 或 `background` 意图。在 YourBuddy Slot 呈现中，打开目标进入插件自有的核心 Split Tree，而不是原生右侧栏。用户意图请求协调器显示核心界面；Agent Feed 与其他已知自动打开使用后台意图，只更新隐藏 Tree，不替换 Content。Portal 呈现与直接原生 Tab 操作保留上游原生右侧栏行为。

Oil Creator 会在固定 GitHub Package Build 之前通过源码注册 Content。它的 Inspector 不拥有外层宽度、拖动柄、Conversation DOM Query 或 Padding 修改。产品刷新会在构建前验证并应用由摘要绑定的源码 Patch，之后无模糊匹配地重放既有摘要绑定的 Materialized Package Patch；上游上下文变化会在替换已审查快照前失败。

## 已考虑的替代方案

**为 Better Sidebar 与 Content 提供独立 Shell 列。** 未采用，因为永久预留 Content 列会削弱 Better Sidebar 的产品核心地位，也会在没有详情时浪费横向空间。

**把 Content 做成 Better Sidebar Tab。** 未采用，因为创作者详情具有独立于 Better Sidebar Tab 持久化的产品导航与草稿生命周期，而且这会让一个功能 Package 依赖另一个功能 Package 的运行时 API。

**让 Oil Creator 继续作为会填充 Conversation 的 `shell.overlay`。** 未采用，因为 Overlay 可见性与 Conversation 几何由不同所有者管理；选择 Content 会缩小用户看不到的区域，这正是已报告缺陷的原因。

**只收起 Conversation，或向右侧栏传入 `canShow: false`。** 未采用，因为右侧栏会保留可见轨道，或把聚合隐藏误解为适配失败请求，进而破坏自身的展开偏好。

**暂停隐藏功能的资源。** 未采用，因为可见性属于呈现状态。终端 Session、已注册 View、草稿状态与 Host Job 不需要第二套暂停协议；引入它会把产品导航耦合到功能内部。

**把 Content 与 Better Sidebar 策略放进 `ui-layout`。** 未采用，因为 Shell 只需要通用辅助几何与 Owner 可见性。产品 Slot 名、打开意图、Agent 注意力规则与 Content 选择应属于第一方产品插件。

## 后果

YourBuddy 会呈现左侧导航、以 Better Sidebar 为核心的中间工作台，以及可独立收起的右侧会话区域。Content 只临时替换可见的中间界面；重复选择仍然有效；Agent 后台打开不会抢焦点；当前 Agent 需要用户注意或完成 Turn 时，Conversation 会恢复。收起操作保留原生右侧栏与 Conversation 状态，而不是把聚合可见性翻译成功能状态。

通用 DSH Extension 新增必填的 Workbench 几何字段与 Rightbar `visible` Owner Prop，但不包含 YourBuddy 标识。产品协调器成为跨功能布局策略的持久所有者，并且在 Cordis 激活关系中必须先于需要该产品 Service 的 Consumer。Better Sidebar 与 Oil Creator 快照携带严格重放 Patch，因此上游升级必须精确应用，否则停止并等待审查。

聚焦的 Store、Layout、Rightbar、打开意图、Oil 源码与刷新测试固定各自行为。桌面 Release Verifier 会启动组装后的 Host，观察两个保持挂载的中间子界面，收起为两条零宽且隐藏的会话轨道，再恢复它们，并检查 Better Sidebar 填满核心位置。产品可见 Release 还会记录组装浏览器路径，因为仅使用 Mock 的组件测试无法证明最终 Slot 组合与几何。
