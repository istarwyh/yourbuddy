---
description: "Web GUI 的外壳布局：AppFrame 栏位、可选工作台布局、拖动柄、让步行为、面板几何与主题呈现。"
kind: "package-reference"
---

# @deepseek-ai/dsh-client-ui-layout

[English](README.md) | 中文

## 概述

本包提供 Web GUI 的外壳布局。AppFrame 默认渲染侧栏、对话与详情栏。可选、Root Scope 的 `workbench` Occupant 会成为桌面端可伸缩主区域，并把对话移入可调整宽度的辅助栏；低于 768px 时，对话仍是主区域，工作台通过 Overlay 以抽屉呈现。`ctx.layout` 在保留现有侧栏和详情动作的同时协调工作台宽度。本包还把解析后的主题投影到 document。

## 目录

- [使用本包](#use-this-package)
- [理解实现](#understand-the-implementation)
- [进一步探索](#further-exploration)
- [模型体验](#model-experience)
- [已知限制与延期工作](#known-limitations-and-deferred-work)
- [开发备注](#dev-note)

-----

<a id="use-this-package"></a>
## 使用本包

在 root 槽位挂载本插件；它围绕侧栏、对话、详情、可选工作台与 Shell Overlay 槽位渲染应用框架。没有工作台 Occupant 时，行为仍是 DSH 三栏布局。工作台插件通过 `ctx.layout` 注册一个共享宽度 Binding；随后由 AppFrame 管理外层辅助对话拖动柄，插件负责保存宽度。

### 主题呈现

呈现器消费解析后的主题快照，并投影到 document：`html { color-scheme }` 驱动原生 UA 控件，依据当前配色方案设置 `body[data-ds-dark-theme]`，把主题的别名 token 与 `--dsh-content-font-size` 设为 body 上的内联变量，并持有一个 `<meta name="theme-color">`，其内容随计算后的 body 背景色更新。释放呈现器时，它会连同其他全局写入一起移除自己的元数据节点。

-----

<a id="understand-the-implementation"></a>
## 理解实现

<details>
<summary>实现细节——点击展开</summary>

一次 `register()` 调用把 `AppFrame` 贡献进运行时的内建 `'root'` 槽位，并声明五个子槽位（`sidebar`、`conversation`、`workbench`、`details`、`shell.overlay`）、安放布局 Store 并接好 `ctx.layout`。`registerWorkbench()` 安装一个随生命周期释放的宽度 Binding；释放后恢复普通对话布局。DSH 的瞬时布局 Store 仍只管理侧栏与详情几何，工作台提供方可以自行持久化辅助栏宽度。AppFrame 始终挂载对话和详情，并把工作台挂载到桌面主栏或窄窗口 Overlay。主题呈现器仍是独立的纯 DOM Effect。

</details>

-----

<a id="further-exploration"></a>
## 进一步探索

当布局面不够用时阅读以下页面。它们从框架进入它所渲染的栏与它所呈现的主题。

- [ui-sidebar](../ui-sidebar/README.zh.md)——占据 `sidebar` 栏及其座位。
- [ui-conversation](../ui-conversation/README.zh.md)——占据 `conversation` 与 `details` 栏。
- [YourBuddy 工作台布局](../../../docs/tech/202609/workbench-layout-compatibility.zh.md)——下游组合与刷新来源记录。
- [ui-theme](../ui-theme/README.zh.md)——呈现器消费其解析快照的主题 seam。
- [Web 客户端架构](../../../.agents/notes/implemented/architecture/2026-07-19-gui-web-client-architecture.zh.md)——浏览器插件行如何加载并注册槽位。

-----

<a id="model-experience"></a>
## 模型体验

无。布局外壳管理浏览器查看状态；这里没有任何内容进入模型请求。

#### KV Cache 影响

无；该包既不组装也不发送提供方请求。

## 已知限制与延期工作

<a id="known-limitations-and-deferred-work"></a>


这些限制界定了当前布局行为。它们是当前包约束，不是通用窗口管理器对比或任务积压。

- **面板几何是瞬时状态**——重新加载会恢复侧栏默认值并保持详情栏关闭；在不同会话 id 之间切换同样会关闭详情栏并忘记拖动后的宽度，而未选中表面以零宽度渲染详情栏却不修改几何。
- **让步链自动关闭通过推导零宽度实现，不触碰偏好宽度**——窗口变宽时面板自行恢复；消费方不得把 store 中的详情宽度当作渲染真值。
- **挤压重排期间无滚动锚定**——布局变化可能移动读者的视口。

<a id="dev-note"></a>
### 开发备注

<details>
<summary>维护者的工作上下文——点击展开</summary>

无。

</details>

**运行时不变式：** 不发布伴生入口。`ctx.layout` 后的 viewing-state store 不发出 Cordis 事件；clamp、prune 与 concession-chain 顺序由本包测试覆盖。
