# Plugin Marketplace

[English](marketplace.md) | 中文

随应用集成的快照版本：`0.2.8`。来源：[Scorp1o117/dsh-plugin-marketplace](https://github.com/Scorp1o117/dsh-plugin-marketplace)。

## 解决的问题

用户可以从设置中发现社区插件，查看 README、来源、安装方式，并按需要增加能力。

## 使用方式

打开设置 → 插件市场，搜索插件并查看详情。符合条件的包提供确认安装入口；确认后查看安装状态，再通过应用生命周期入口重启 YourBuddy。AI 解释功能使用当前配置的默认模型。

## 默认集成的理由

默认组合只是起点。发现入口让用户能够继续选择工具，并在安装前理解它的来源和用途。

## 限制

GitHub Topic 和 Star 仅帮助发现项目，不等于安全审查或兼容性认证。一键安装还要求 npm 包具有有效的 DSH Bundle 元数据和仓库关联，元数据不明确时入口不可用。搜索依赖外部网络并可能限流；安装代码具有与手动安装 DSH 插件相同的 Host 权限。不要因为插件属于同一套 Enhancement Suite，就把其中的记忆、人格或视觉插件也写成默认安装。
