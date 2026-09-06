# Agent Note: YourHarness 产品身份

Status: implemented

[English](2026-09-06-yourharness-product-identity.md) | 中文

## 问题

以创作者命名的产品没有表达工作台在模型、工具与呈现方式上的用户自主权。桌面元数据、运行时资源、发布自动化与工作台默认品牌必须指向同一个产品。

## 决策

产品名为 YourHarness，标语为“Your models. Your tools. Your way.”，中文表达为“按你的方式工作的 AI 工作台”。桌面包与二进制名称使用 `yourharness`，应用元数据使用 `io.github.istarwyh.yourharness`。YH 图标的真源是 [app-icon.svg](../../../../apps/desktop-tauri/app-icon.svg)，它内嵌到产品 Client，并渲染为原生图标。[Personal Workbench](../../../../apps/desktop-tauri/product/personal-workbench/README.zh.md) 插件提供默认名称与图标，保留明确设置的自定义值，并在重置个性化时恢复产品身份。

本次改名明确采用破坏性更新。数据目录为平台应用数据下的 `YourHarness`，开发者覆盖项使用 `YOURHARNESS_*`，运行时资源使用 `yourharness-*`，发布 Tag 使用 `yourharness-vX.Y.Z`，更新器查询 `yourharness-updater`。不提供旧环境变量别名、数据接管、应用 ID 兼容或旧更新渠道发布。已有 XiaoHui 数据既不移动也不删除。已配置的更新器公钥继续作为发布签名的信任根。

[产品装配决策](2026-08-22-yourharness-product-workbench.zh.md)继续负责打包与凭据隔离。[个人品牌决策](2026-08-23-personal-workbench-branding.zh.md)继续负责 Profile 个性化；本文定义其产品默认值。上游 DeepSeek 包名、作者署名、许可证与冻结归档决策保留原始身份。

## Alternatives considered

**只修改可见应用标题。** 否决，因为资源、发布产物与恢复默认行为仍会暴露不一致的产品名称。

**复用旧应用 ID、数据目录与更新渠道。** 否决，因为本次转型明确允许破坏性更新，并排除旧版兼容。

## 后果

新安装使用独立的 YourHarness 主目录。已有安装需要单独安装 YourHarness，旧更新渠道不会收到它。完整装配的无密钥发布 Smoke 通过真实工作台验证默认身份、自定义名称与 Logo 的持久化，以及恢复默认。上游运行时 Package 仍可独立识别和维护。
