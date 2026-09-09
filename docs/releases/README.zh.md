# 发布说明与验证资料归档

[English](README.md) | 中文

本参考定义每次发布随仓库交付的记录。它在现有发布流程之上补充面向用户的说明与可审阅证据，不重新定义版本、Tag、构建命令、注册表或审批设置。

## 版本索引

归档存在于 Tag 所指向的 Commit 后，把最新版本放在最前面。发布标识应链接到归档的 `README.md`，不得链接到移动分支。

| 发布版本 | 渠道 | 用户说明 | 验证资料 | 产品状态 |
|---|---|---|---|---|
| [yourbuddy-v0.3.6](yourbuddy-v0.3.6/README.zh.md) | YourBuddy 桌面应用 | 已包含 | 候选记录尚未完成；已记录源码、本地私有 CA 路径、完整组装与 PR CI；公开文件、更新器、App、官网与下载归档待验证 | 等待 Tag 与产品发布 |
| [yourbuddy-v0.3.5](yourbuddy-v0.3.5/README.zh.md) | YourBuddy 桌面应用 | 已包含 | 已完成；记录源码、CI、公开文件、更新签名、App 标识、迁移运行时、官网、可下载归档与原生启动跳过；保留安装包 WebView 与真实 OAuth 限制 | 已发布并在声明范围内完成独立核验 |
| [yourbuddy-v0.3.4](yourbuddy-v0.3.4/README.zh.md) | YourBuddy 桌面应用 | 已包含 | 已完成；记录七张历史源码图、公开产物、更新签名、迁移运行时、隔离启动、官网与可下载归档；保留可视窗口限制 | 已发布并在声明范围内完成独立核验 |
| [yourbuddy-v0.3.3](yourbuddy-v0.3.3/README.zh.md) | YourBuddy 桌面应用 | 已包含 | 已记录公开产物、校验和、Updater 元数据与认证启动；保留窗口截图和 Updater 安装限制 | 已发布并在声明范围内完成独立验证 |
| [yourbuddy-v0.3.2](yourbuddy-v0.3.2/README.zh.md) | YourBuddy 桌面应用 | 已包含 | 已完成；提供不可变证据与已核验下载；保留真实浏览器限制 | 已发布并完成独立验证 |
| [yourbuddy-v0.3.1](yourbuddy-v0.3.1/README.zh.md) | YourBuddy 桌面应用 | 已包含 | 已完成；提供不可变证据与验证资料下载 | 已发布并独立验证 |
| [yourbuddy-v0.3.0](yourbuddy-v0.3.0/README.zh.md) | YourBuddy 桌面应用 | 已包含 | 已保留发布前与失败证据 | 在产物发布前失败；由 0.3.1 取代 |

首个条目使用[可复制的发布目录](_template/README.zh.md)。

## 现有发布渠道

各渠道的既有文件仍是版本、命令与发布方式的权威来源。归档目录使用完整发布 Tag 命名，避免相互独立的版本线发生冲突：`docs/releases/<release-tag>/`。

| 渠道 | 发布标识 | 现有流程 | 需要核验的发布结果 |
|---|---|---|---|
| YourBuddy 桌面应用 | `yourbuddy-vX.Y.Z` | [桌面发布指南](../../apps/desktop-tauri/README.zh.md)与 [macOS 工作流](../../.github/workflows/desktop-release.yml) | GitHub Release 中的 DMG、带签名的更新归档及签名、`SHA256SUMS.txt` 和稳定更新 Manifest |
| DSH 包与文档 | `dsh-vX.Y.Z` | [npm 打包工作流](../../.github/workflows/release.yml)、[手动 npm 发布](../../.github/workflows/release-publish.yml)和[文档部署](../../.github/workflows/docs-pages.yml) | npm 上已发布的版本与文件、安装后 Smoke，以及可以访问的文档站点 |
| Vendored Cordis 包 | `vendor-<package>-vX.Y.Z` | [Vendor 打包工作流](../../.github/workflows/release-vendor.yml)和[手动 npm 发布](../../.github/workflows/release-vendor-publish.yml) | npm 上每个计划发布的包版本及其注册表完整性 |
| Landlock Launcher 包 | `landlock-run-vX.Y.Z` | [Landlock 发布指南](../../native/landlock-run/docs/release.md)和[发布工作流](../../.github/workflows/landlock-run-release.yml) | npm 上计划发布的每个平台包与入口包，包括预期 Dist Tag |
| Python SDK 与运行时 | `python-vX.Y.Z` | [Python 贡献者指南](../../python/development.zh.md)、[GitHub 发布](../../.github/workflows/python-release.yml)和 [GitLab 发布](../../.gitlab-ci.yml) | 每个选定 PyPI 注册表中的 SDK 与全部目标运行时 Wheel 包，以及安装 Wheel 包后的 Smoke |

当次发布未涉及的渠道在版本页中标记为不适用。不得为了让归档看似完整而运行无关发布家族。

每次 YourBuddy 桌面发布都包含[产品官网同步](../product-website.zh.md#release-synchronization)。打 Tag 前准备内容，核验公开产物后再发布真实可用状态。产品官网与 SDK 文档使用不同工作流，两者都不能证明桌面安装包已经可用。

## 单版本归档

最终验证前，把 `docs/releases/_template/` 复制到 `docs/releases/<release-tag>/`。`README.md`、`README.zh.md` 及其配对记录必须保持完整；只在确有有用资料时创建 `screenshots/` 与 `evidence/`。

```text
docs/releases/<release-tag>/
  README.md
  README.zh.md
  README.i18n.yaml
  screenshots/
  evidence/
```

版本页是完整验证报告的真源。渠道专用发布说明可以重复其界面需要的简短用户摘要，然后链接到不可变证据 Commit 中的本归档。

## 面向用户的发布说明

开头回答四个问题：改了什么、解决了什么用户问题、用户在哪里找到它，以及如何体验。先使用产品语言描述可观察行为，再介绍实现名称或提交历史。

适用时说明安装或升级步骤、支持的平台与版本、迁移或数据影响、兼容性限制及已知限制。省略某一项只表示它不适用，不代表已经在未说明的情况下完成验证。

## 证据记录

每个验证场景记录：

- 日期、本地时间与时区；
- 准确的发布标识、版本与 Commit；
- 环境，包括操作系统、架构、相关依赖与外部服务；
- 受测构建：源码 Checkout、本地构建包、候选发布版本或正式发布产品；
- 证据来源：本次发布实测，或已明确标记的历史资料；
- 数据分类：合成数据或经过脱敏的真实数据；
- 模型或服务分类：Mock、受控服务或具名真实供应商；
- 编号操作、预期结果、实际结果与状态；
- 相对证据链接，以及所有失败、恢复操作、跳过原因或未验证范围。

场景状态使用 `passed`、`failed`、`skipped` 或 `not verified`。源码测试不能验证正式安装包，Mock 不能验证真实供应商，组件测试不能验证完整产品旅程。只能陈述记录中的观察直接支持的结论。

若桌面 Release 改动 `WebviewUrl::External` Shell、运行时 Capability、Permission 或应用 Command，JavaScript `invoke` Stub 只能作为 Bridge 证据。资料必须记录真实 Tauri Runtime Authority 结果，并从打包后的 WebView 操作每个受影响 Control；缺失的安装包覆盖必须保留在未验证范围内，且不能支撑“这些 Control 已通过”的结论。

## 截图、日志与敏感数据

当相关状态有助于他人评估产品旅程时，记录操作前、执行中、结果和失败恢复等状态。截图没有数量指标：非 UI 改动可以改用命令输出、日志、校验和、包元数据或可下载产物证据。

使用清晰可读的 PNG 或 WebP，并通过相对链接配上简短说明。受限文本日志应记录命令、退出状态与相关输出；源码与 CI 运行使用固定到 Commit 或具体运行的链接。历史截图必须保留历史标记，不能作为本次实测。

提交或上传前检查每个文件。凭据、Token、账号标识、个人信息、私有业务内容、代理凭据与私有路径不得进入 Git 历史或发布附件。在仓库外创建脱敏副本，只添加该副本；不得先添加敏感原图，再尝试删除。

## 发布与不可变链接

打 Tag 前，完成版本归档并更新本索引，检查全部相对链接与图片渲染，并确认下载资料解压后包含文档列出的文件。现有文档检查可以辅助发现 Markdown 完整性问题，但不能证明发布状态或所记录的产品行为。

当现有渠道支持附件时，使用该机制提供独立的 `<release-tag>-verification.zip`。否则链接不可变 Tag 自动提供的源码下载归档，并说明验证目录在该归档中的位置。公开发布页应链接到包含图集和归档的 Commit，不得链接到移动分支。

发布后，在产品的真实目的地核验：根据渠道下载并检查或安装桌面产物、查询并安装 npm 或 PyPI 包、打开已部署文档。记录实际检查过的公开 URL、文件名、版本、Hash、更新元数据和安装后行为。工作流绿色或只有已上传的工作流产物都不能证明发布完成。

不得移动公开 Tag 或替换已发布安装包来修补归档。已发布字节或面向用户的结论需要修正时，应发布新版本。

## 交付状态

每个版本页与交接说明分别报告：

- **产品发布状态：**哪些渠道和产品文件确实可以下载或安装、哪些失败、哪些不适用。
- **验证资料归档状态：**完整、部分完成或缺失；可用时附上证据 Commit 与下载位置；部分完成或缺失时逐项列出待补资料，并在已知时说明下一步。
- **站点同步状态：**YourBuddy 记录待同步、已部署待核验、已部署且已核验或失败，附官网 Commit、工作流运行、线上 URL 与待核验项；无关渠道标为不适用。
- **未验证范围：**全部跳过、失败、仅有历史资料、仅测源码、仅测特定平台、仅测 Mock 或其他未实测结论。

交付清单属于复制后的版本页。共享的 [_template](_template/README.zh.md)必须保持未勾选，避免它被误认为某个版本的证据。

## 流程范围

这是一项文档与证据约定，不增加自定义校验脚本、CI 要求、人工审批、凭据流程或重复发布命令。
