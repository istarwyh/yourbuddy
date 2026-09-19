# Better Sidebar

[English](better-sidebar.md) | 中文

随应用集成的快照版本：`0.18.1`。来源：[omdsh-dev/DSH-better-sidebar](https://github.com/omdsh-dev/DSH-better-sidebar)。

## 解决的问题

用户不必只依据助手描述判断完成情况，可以在对话旁的主工作区查看文件树、编辑器、图片与 Markdown 等预览、真实终端、Git 差异、后台任务及其他插件页面。

## 使用方式

桌面宽度下，在 DSH 对话左侧使用主工作区；拖动分隔条调整两侧宽度，在标签页中打开文件和预览，并通过终端或 Git 面板检查代码变化。窗口较窄时，对话仍是主界面，Better Sidebar 通过抽屉打开；浮动窗口和底部工作区继续可用。

## 默认集成的理由

它补全“提出任务 → 产生结果 → 人工检查”的最后一步，也为其他插件页面和文件预览器提供稳定的主区域。

## 限制

真实终端操作会影响实际工作目录；面板不是隔离环境的保证。面向模型的 `terminal_*` 与 `sidebar_open` 工具默认关闭，需要用户显式开启。内嵌网页受到目标站点 iframe 策略与浏览器规则限制，部分网站无法嵌入；侧边对话仍属 Beta 能力。YourBuddy 以可重放产品补丁维护工作台位置；在 YourBuddy 之外，Better Sidebar 仍默认使用上游 Portal 展示方式。
