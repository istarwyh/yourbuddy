# Context Doctor

[English](context-doctor.md) | 中文

随应用集成的快照版本：`0.7.2`。来源：[Zhenyu98/dsh-context-doctor](https://github.com/Zhenyu98/dsh-context-doctor)。

## 解决的问题

当项目指令、技能与 MCP 工具逐渐增加时，用户需要知道哪些内容占用上下文、哪些指令重复、哪些同名技能发生遮蔽。

## 使用方式

在已有会话的输入区展开 Context Doctor，或请 Agent 调用 `context_audit`，查看指令链、技能目录、工具 schema 与 MCP 分组报告。先检查建议指向的文件和来源，再决定是否修改。

## 默认集成的理由

一个鼓励用户组合插件的工作台，也需要帮助用户观察组合的代价。审计可以辅助做出保留、精简和按需加载的选择。

## 限制

审计本身只读，Token 数是估算值，不是账单。重复检测主要识别相同文本，不能保证找出语义冲突，也不能证明某项内容毫无价值。用户随后要求 Agent 执行修改是另一个操作；分享报告时应检查路径与摘录是否包含敏感信息。
