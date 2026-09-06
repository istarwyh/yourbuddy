# 处理文件与检查成果

[English](workspace.md) | 中文

把对话放在实际工作成果旁边。

## 选择正确目录

开始前添加并选中工作区。Agent 文件操作与 Harbor 工具请求使用当前会话的工作目录。陌生任务先使用练习文件夹，并核对工具返回的实际路径。

## 检查产物

Better Sidebar 提供文件树、编辑器、预览、终端、Git 和后台任务面板。打开生成的 Markdown 或代码，对照需求，检查命令结果。Git 操作与真实终端会影响实际工作区。

## 委派一个明确任务

默认 Codex 预设可以把自包含任务委派给 Codex Subagent。提供目标、相关文件和完成条件。它共享工作目录，但不会继承完整父会话；登录和权限遵循原生 Codex 配置。加载提供方并不会启动子进程。

## 有依据地管理上下文

Skill 提供可复用的任务指令；插件增加运行时能力或界面。额外指令和工具会占用上下文。精简前使用 [Context Doctor](plugins/context-doctor.zh.md)，修改后再检查一个代表性任务。

可选控件见 [Better Sidebar](plugins/better-sidebar.zh.md)，反复任务的质量检查见[评测](evaluation.zh.md)。
