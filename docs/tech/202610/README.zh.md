---
description: "YourBuddy 继承终端环境并展示 macOS 权限状态的十月技术方案入口。"
---

# YourBuddy 桌面环境集成方案

[English](README.md) | 中文

本目录定义 YourBuddy 如何默认继承用户登录 Shell 导出的环境，再应用少量应用自有覆盖，并准确展示影响功能的 macOS 权限。

## 当前提案

阅读[终端环境与 macOS 权限方案](terminal-environment-and-permissions.zh.md)，了解已确定决策、启动顺序、变量优先级、网络迁移、权限归属、数据模型、协议、失败恢复、测试和分阶段交付。

| 部分 | 提议结果 |
|---|---|
| Shell 环境 | Finder 启动在 Runtime 发现前捕获交互式登录 Shell 的导出环境 |
| 应用覆盖 | YourBuddy 管理托管 Runtime、隔离 DSH 主目录、内部端点和最终网络策略 |
| 外部工具 | Host 与插件发现 Shell PATH 工具，YourBuddy 托管 Shim 保持最前 |
| 权限 | 设置展示可靠状态，并标明无法全局查询或属于其他进程的权限 |
| 诊断 | 只报告来源、状态和被覆盖变量名，不记录环境变量值 |

状态：仅为实施提案，不代表源码或安装包已经具备这些行为。
