# Agent Note: YourBuddy 工作台主区域布局

Status: implemented

[English](2026-09-19-yourbuddy-workbench-primary-layout.md) | 中文

## 问题

YourBuddy 需要把 Better Sidebar 工作台作为桌面主区域，同时让 DSH 对话在较窄的右栏继续可用。替换对话插件、分叉 Better Sidebar Service，或在每次刷新后重做一项未记录的修改，都会破坏现有插件扩展路径或升级路径。

## 决策

`@deepseek-ai/dsh-client-ui-layout` 声明一个可选、Root Scope 的 `workbench` Slot。没有 Occupant 时保留 DSH 原有的侧栏、对话与详情 Grid。Occupant 存在时激活按侧栏、可伸缩工作台、详情、可调整宽度对话排列的桌面 Grid。低于 768 像素时，对话仍是主任务区域，Workbench Occupant 通过 Shell Overlay 渲染，因此原有抽屉行为继续可用。

Layout Service 接受一个随生命周期释放的 Workbench 宽度 Binding。AppFrame 管理外层对话拖动柄，Occupant 管理宽度持久化。释放 Binding 后恢复普通 DSH 布局。这样把布局归 Shell 管理，同时不把 Better Sidebar 状态移动到 DSH。

Better Sidebar 保留 `portal` 作为默认展现。可选的 `slot` 展现创建相同 Service 和 Store，把 React Tree 注册到 DSH Workbench Slot，并通过 Layout Binding 暴露 Store 中的共享宽度。只用于 Portal 的 Frame 补偿由生命周期管理的 Body Attribute 选择。YourBuddy 原生 Overlay 选择 `slot`；其他 DSH 安装和 Better Sidebar 挂载保留默认行为。

DSH 原生右侧栏负责普通标签页与资源打开。Better Sidebar 剩余的 Split Pane 工作台始终填满桌面 Slot，不受已持久化的底部面板展开状态影响，因此折叠 Dock 不会让主区域空白。桌面 Slot 不显示 Dock 的高度拖动和关闭控件。低于 768 像素时，同一标签树回到 Overlay 展现并遵循展开状态。

DSH 源码改动作为普通代码提交在 YourBuddy 分支，并在合并官方 DSH Release 时通过 Git 协调。其边界清晰的 Diff 同时保存为来源记录补丁。Materialized Better Sidebar 快照包含相互匹配的 `src`、已构建 `lib`、类型声明和双语 README 改动。结构化来源记录条目指向可重放补丁；产品刷新先把补丁应用到新的原始 npm 快照，再执行现有兼容调整。该机制扩展 [YourBuddy 产品工作台分发](../feature/2026-08-22-yourbuddy-product-workbench.zh.md)，不引入通用补丁框架。

## 已考虑的替代方案

**替换或包装对话插件。** 未采用，因为对话流式输出、审批、输入状态、会话切换与未来对话升级将变成 YourBuddy 自有行为，无法继续留在现有插件中。

**让 Better Sidebar 保持 Viewport Portal，再用 CSS 移动。** 未采用，因为 DSH Shell 无法管理真实 Grid 轨道和拖动柄，Portal 补偿仍会与详情栏及对话几何竞争。

**只以已提交的 Materialized 文件维护 Better Sidebar 改动。** 未采用，因为快照刷新会替换包目录。小型重放补丁明确记录每项 Materialized 差异的本地来源，并让修改后的运行时 Bundle 可复现。

**每次上游 Merge 后应用 DSH 补丁。** 未采用，因为 YourBuddy 分支已经通过 Git 携带该改动。再次应用会与现有 Merge 模型冲突；DSH 补丁只用于来源记录，Better Sidebar 补丁才是快照刷新的活动输入。

## 后果

YourBuddy 获得所需的工作台主区域桌面布局，同时不改变 DSH 默认 Grid 或 Better Sidebar 默认 Portal 模式。Better Sidebar 标签、查看器、终端、集成和逐会话 Split Pane 状态继续使用同一个 Store 与 Service。Slot 模式复用现有面板宽度偏好，因此辅助对话宽度仍在会话之间共享。

可选 Slot 与宽度 Binding 成为小型 DSH 扩展点；上游修改 AppFrame 或 Layout Service 时需要协调。Better Sidebar 升级必须接受已记录补丁，或把补丁与 Materialized 快照及来源记录一起更新。可见 Release 路径必须运行组装后的产品，因为单元测试无法证明真实工作台与对话确实位于预期栏位。
