# Better Sidebar

[English](better-sidebar.md) | 中文

随应用集成的快照版本：`0.19.1`。来源：[omdsh-dev/DSH-better-sidebar](https://github.com/omdsh-dev/DSH-better-sidebar)。

## 解决的问题

用户不必只依据助手描述判断完成情况，可以在对话旁的主工作区查看文件树、编辑器、图片与 Markdown 等预览、真实终端、Git 差异、后台任务及其他插件页面。

## 使用方式

桌面宽度下，即使早先会话保存的 Dock 状态为折叠，Split Pane 工作台仍会显示在对话左侧。拖动分隔条调整两侧宽度，在标签页中打开文件和预览，并通过终端或 Git 面板检查代码变化。窗口较窄时，对话仍是主界面，Better Sidebar 通过 Overlay 控件打开。推荐插件目标、内嵌浏览器的外部打开操作以及终端中的 HTTP(S) 链接会在系统浏览器中打开。在 YourBuddy 中，只需运行一次推荐插件的安装命令；其隔离 Web Profile 会执行依赖构建脚本，无需另行运行 `pnpm approve-builds`。

YourBuddy 0.3.9 通过 [Release 工作台截图](../../../releases/yourbuddy-v0.3.9/screenshots/workbench-primary.png)核验这一桌面布局，并在[验证记录](../../../releases/yourbuddy-v0.3.9/README.zh.md)中记录聚焦展示检查。

## 默认集成的理由

它补全“提出任务 → 产生结果 → 人工检查”的最后一步，也为其他插件页面和文件预览器提供稳定的主区域。

## 限制

真实终端操作会影响实际工作目录；面板不是隔离环境的保证。面向模型的 `terminal_*` 与 `sidebar_open` 工具默认关闭，需要用户显式开启。内嵌网页受到目标站点 iframe 策略与浏览器规则限制，部分网站无法嵌入；侧边对话仍属 Beta 能力。YourBuddy 以可重放产品补丁维护工作台位置；在 YourBuddy 之外，Better Sidebar 仍默认使用上游 Portal 展示方式。
