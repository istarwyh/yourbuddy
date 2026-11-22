# Plugin Marketplace

[English](marketplace.md) | 中文

随应用集成的快照版本：`0.5.10`。来源：[Scorp1o117/dsh-plugin-marketplace](https://github.com/Scorp1o117/dsh-plugin-marketplace)。

## 解决的问题

用户可以从插件页面发现社区插件，查看 README、来源、安装方式，并按需要增加能力。

## 使用方式

1. 打开**插件 → 随应用提供的插件设置 → 插件市场**。
2. 确认详情页显示插件管理区域及搜索输入框，然后搜索插件并查看详情；英文界面对应 **Plugin management · web** 和 **Search plugins…**。

只有当一个 npm 包明确关联所选代码仓库并声明 DSH Bundle 补丁时，页面才提供确认安装入口；确认后查看安装状态，再通过应用生命周期入口重启 YourBuddy。AI 解释功能使用当前配置的默认模型。

## 升级后的入口

随应用集成的 Marketplace `0.5.10` 使用上述插件页面入口，替代**设置 → 插件市场**。这是 YourBuddy 集成的第三方插件变更，不是单独的 DSH Core 发行。使用过旧设置入口的用户，按使用步骤即可进入搜索页。

## 默认集成的理由

默认组合只是起点。发现入口让用户能够继续选择工具，并在安装前理解它的来源和用途。

## 限制

GitHub Topic 和 Star 仅帮助发现项目，不等于安全审查或兼容性认证。一键安装还要求 npm 包具有有效的 DSH Bundle 元数据和仓库关联，元数据不明确时入口不可用。搜索依赖外部网络并可能限流；安装代码具有与手动安装 DSH 插件相同的 Host 权限。不要因为插件属于同一套 Enhancement Suite，就把其中的记忆、人格或视觉插件也写成默认安装。
