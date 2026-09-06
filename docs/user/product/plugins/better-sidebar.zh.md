# Better Sidebar

[English](better-sidebar.md) | 中文

随应用集成的快照版本：`0.17.1`。来源：[omdsh-dev/DSH-better-sidebar](https://github.com/omdsh-dev/DSH-better-sidebar)。

## 解决的问题

用户不必只依据助手描述判断完成情况，可以在对话旁查看文件树、编辑器、图片与 Markdown 等预览、真实终端、Git 差异和后台任务。

## 使用方式

在会话工作区打开右侧栏或底部面板，查看 Agent 产生的文件；代码任务配合终端与 Git 面板检查变化。各类侧边卡片可以在设置中调整。

## 默认集成的理由

它补全“提出任务 → 产生结果 → 人工检查”的最后一步，也为其他插件注册页面和文件预览器提供位置。

## 限制

真实终端操作会影响实际工作目录；面板不是隔离环境的保证。面向模型的 `terminal_*` 与 `sidebar_open` 工具默认关闭，需要用户显式开启。内嵌网页受到目标站点 iframe 策略与浏览器规则限制，部分网站无法嵌入；侧边对话仍属 Beta 能力。
