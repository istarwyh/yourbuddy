# Agent Note: YourBuddy 产品身份

Status: implemented

[English](2026-09-06-yourbuddy-product-identity.md) | 中文

## 问题

以实现概念命名的产品要求用户先理解 Agent Harness，再认识它能做什么。YourBuddy 使用更亲近用户的名字，同时保留工作台在模型、工具与呈现方式上的用户自主权。桌面元数据、运行时资源、发布自动化与工作台默认品牌指向同一个产品。

## 决策

产品名为 YourBuddy，标语为“Your models. Your tools. Your way.”，中文表达为“按你的方式工作的 AI 工作台”。桌面包与二进制名称使用 `yourbuddy`，应用元数据使用 `io.github.istarwyh.yourbuddy`。Y8 图标的真源是 [app-icon.svg](../../../../apps/desktop-tauri/app-icon.svg)，它内嵌到产品 Client，并渲染为原生图标。[Personal Workbench](../../../../apps/desktop-tauri/product/personal-workbench/README.zh.md) 插件提供默认名称与图标，保留明确设置的自定义值，并在重置个性化时恢复产品身份。

本次改名明确采用破坏性更新。数据目录为平台应用数据下的 `YourBuddy`，开发者覆盖项使用 `YOURBUDDY_*`，运行时资源使用 `yourbuddy-*`，发布 Tag 使用 `yourbuddy-vX.Y.Z`，更新器查询 `yourbuddy-updater`。不提供旧环境变量别名、数据接管、应用 ID 兼容或旧更新渠道发布。已有 XiaoHui 与 YourHarness 数据既不移动也不删除。已配置的更新器公钥继续作为发布签名的信任根。

[产品装配决策](2026-08-22-yourbuddy-product-workbench.zh.md)继续负责打包与凭据隔离。[个人品牌决策](2026-08-23-personal-workbench-branding.zh.md)继续负责 Profile 个性化；本文定义其产品默认值。上游 DeepSeek 包名、作者署名、许可证与冻结归档决策保留原始身份。

[九月官网内容方案](../../../../docs/show/202609/README.zh.md)将这项产品身份连接到产品解释、首次使用路径、默认插件选择理由与建议路线图。方案区分源码支持的能力、发行证据和建议方向；它不发布网站，也不承诺未来功能。

[OINK 产品官网](../../../../docs/product-website.zh.md)从仓库正文发布明确列出的双语产品页面。SDK 的 VitePress 投影保持独立可用；主题与编译器固定版本，公开安装包的可用性以已核验发行证据为准，不从源码版本推断。官网从同一内容生成本地搜索和机器可读页面。

首页以入门指南中的文件创建任务解释产品，并明确标注为示例。中性底色、清晰的系统字体与 Y8 品牌蓝让任务和结果更容易阅读。社区插件以列表呈现，并附选择理由。项目自己的模板渲染首页数据，可搜索的操作说明与文本导出由仓库指南负责。任务示例不声称是真实执行会话。

产品官网托管于 GitHub Pages，使发布内容对应仓库中同一份经审查的源码。[官网工作流](../../../../.github/workflows/product-site.yml)使用 Pages 提供的基础 URL 构建并检查产物，再由权限受限的独立 Job 从 `master` 部署。PR 生成预览，同一分支的串行执行避免部署重叠。源码与产物检查覆盖项目子路径，线上浏览器验收覆盖双语导航、搜索和资源。

## Alternatives considered

**只修改可见应用标题。** 否决，因为资源、发布产物与恢复默认行为仍会暴露不一致的产品名称。

**复用旧应用 ID、数据目录与更新渠道。** 否决，因为本次转型明确允许破坏性更新，并排除旧版兼容。

## 后果

新安装使用独立的 YourBuddy 主目录。已有安装需要单独安装 YourBuddy，旧更新渠道不会收到它。完整装配的无密钥发布 Smoke 通过真实工作台验证默认身份、自定义名称与 Logo 的持久化，以及恢复默认。上游运行时 Package 仍可独立识别和维护。
