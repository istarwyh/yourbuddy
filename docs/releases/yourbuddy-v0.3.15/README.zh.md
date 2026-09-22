# YourBuddy 0.3.15

[English](README.md) | 中文

本归档记录 YourBuddy 0.3.15 内置的创作者发布流程。

- 发布标识：`yourbuddy-v0.3.15`。
- 产品渠道：macOS Apple Silicon 版 YourBuddy 桌面应用。
- 归档状态：产品已发布，公开产物已完成独立核验，可下载验证归档已准备；网站同步仍待完成。
- 实现证据 Commit：`725d1f3f14db32c685288aa9dc637ed63c397796`；产品 Tag Commit：`167e5512b7817fd690d6cd4c76236b70e2d82282`。
- 证据图集：不适用；本版本增加模型工具与内置 Skills，不改变 GUI。
- 证据下载：[不可变 Tag 源码](https://github.com/istarwyh/yourbuddy/tree/yourbuddy-v0.3.15/docs/releases/yourbuddy-v0.3.15)与[可下载验证归档](https://github.com/istarwyh/yourbuddy/releases/download/yourbuddy-v0.3.15/yourbuddy-v0.3.15-verification.zip)。

## 面向用户的发布说明

### 改了什么

Oil Creator 内置视频发布、视频转文章与微信公众号发布 Skills。`oil_prepare_publish` 工具可以为已启用的视频平台准备草稿，也可以把已有文章上传到微信公众号草稿箱。

### 解决了什么问题

“内容创作”Preset 无需单独安装 Skill 或手动配置仓库，即可执行受支持的发布流程。Ego Browser 探测使用解析后的可执行文件，不再只依赖桌面进程的 `PATH`。产品快照会保留视频发布器生成的运行时模块，并使用可移植的路径与权限哈希。0.3.13 和 0.3.14 Tag 均未产生公开产物；本版本是其修正版。

### 在哪里使用

选择**内容创作** Agent Preset，并让 YourBuddy 为小红书、抖音、B站、视频号或微信公众号草稿箱准备一期内容。

### 如何体验

配置创作者片库与启用平台；视频平台需安装并登录 Ego Lite，公众号需配置 AppID、AppSecret 与 API IP 白名单。打开包含成片或文章的一集，然后让 YourBuddy 准备发布草稿。

### 安装或升级

[Apple Silicon DMG](https://github.com/istarwyh/yourbuddy/releases/download/yourbuddy-v0.3.15/yourbuddy-0.3.15-macos-arm64.dmg) 可从 [0.3.15 GitHub Release](https://github.com/istarwyh/yourbuddy/releases/tag/yourbuddy-v0.3.15) 安装；旧版 YourBuddy 也可以使用**设置 → 通用设置 → 应用生命周期 → 检查更新**。

### 兼容性、迁移与限制

本版本保留现有片库文件与 Creator Overlay 数据，无需迁移。视频发布依赖 Ego Lite 和已登录的创作者账号；公众号草稿依赖本机 API 凭据与 IP 白名单。工具不会执行最终发表或群发。源码测试与本地 Dry Run 不能证明真实账号平台行为、原生安装包启动、安装包 WebView 交互或 Updater 安装。

## 验证概览

| 场景 | 状态 | 受测构建 | 环境 | 证据 |
|---|---|---|---|---|
| Oil Creator 与内置发布器 | passed | 隔离的 0.3.15 发布工作树 | macOS 15.6.1 arm64、Node.js 22.19 | [源码验证](evidence/source-validation.txt) |
| 完整发布准备与 Host Smoke | passed | 已提交发布输入 | macOS Apple Silicon | 68 个 Peer Link 与七个组装 Client Plugin 通过 |
| 公开桌面产物与 Updater | passed | 公开的 0.3.15 产物 | GitHub Release 与稳定 Updater 渠道 | [产物核验](evidence/public-artifact-verification.txt) |
| 产品网站 | not verified | 产品已发布，站点跟进待完成 | 英文与中文路由 | 等待部署与在线检查 |

## 场景：Oil Creator 与内置发布器

- 状态：`passed`。
- 日期与时间：2026-09-23 UTC+08:00 CST。
- 发布版本与 Commit：`yourbuddy-v0.3.15`；实现证据 Commit `725d1f3f14db32c685288aa9dc637ed63c397796`；产品 Tag Commit `167e5512b7817fd690d6cd4c76236b70e2d82282`。
- 受测构建：包含已提交 Oil Creator 快照与内置 Skills 的隔离发布工作树。
- 环境：macOS 15.6.1 arm64、Node.js 22.19。
- 证据来源：本次发布实测。
- 数据：合成内容包与内置 Markdown 示例文章。
- 模型或服务：没有调用模型或外部发布服务。

### 操作步骤

1. 运行 Oil Creator Typecheck、232 项测试与生产 Host 构建。
2. 运行内置视频发布器的 132 项测试，以及微信公众号 `publish-file --dry-run` 转换。
3. 组装产品 Bundle，并验证三个 Skills 与 `oil_prepare_publish` 均保留在安装结果中。
4. 使用所需的已构建 CLI 产物运行桌面产品与发布准备回归测试。

### 预期结果

产品快照保持有效 Provenance、注册每个内置 Skill、暴露只准备草稿的工具、保留最终发表检查点，并且无需安装外部 Skill 即可完成组装。

### 实际结果

Oil Creator 的 232 项测试通过并成功构建。视频发布器 132 项测试通过，微信发布器以 Dry Run 模式转换内置文章，产品 Bundle 的 8 项测试通过，发布准备的 13 项测试通过；提供已记录的构建版 CLI 前置条件后，桌面产品测试 69 项全部通过。完整发布准备随后重新构建 Harness、准备冻结离线安装与迁移运行时，验证 68 个 Runtime Peer Link 和七个组装 Client Plugin，并通过 Host Smoke。

### 证据

- 操作前：发布器需要单独安装；未捕获任何私有创作内容。
- 执行中：[源码验证日志](evidence/source-validation.txt)。
- 结果：源码、发布器、Bundle 与桌面回归检查通过。
- 失败与恢复：首次桌面测试缺少 `apps/cli/lib/bin.js`；提供已构建 CLI 产物后，受影响的 Host CA 测试通过。

### 范围限制

本场景证明源码、内置资源、CLI Dry Run 与组装 Package 行为，不证明真实 Ego Browser Session、真实平台账号、公众号 API 接受、原生 App 启动、最终发表或业务内容质量。

## 交付状态

- 产品发布状态：Tag 触发运行遇到无诊断信息的 DMG 创建失败后，通过不可变 0.3.15 Tag 的手动重试完成发布。
- 验证资料归档状态：在声明范围内完整；源码与公开产物证据已记录到仓库及可下载归档。
- 站点同步状态：等待部署与在线检查。
- 未验证范围：真实创作者账号、最终发表、原生安装包启动、安装包 WebView 交互、从旧安装更新、Apple Developer 签名与公证仍未验证。

## 交付清单

- [x] 发布标识与桌面版本源匹配 0.3.15。
- [x] 面向用户的说明描述改动、问题、位置与最短操作旅程。
- [x] 兼容性、迁移、前置条件与源码测试限制明确。
- [x] 源码与内置发布器证据不包含私有内容。
- [x] 完整发布准备与成功的发布 Workflow 均通过。
- [x] 公开文件、Checksum、Updater 元数据、签名、App 标识、打包模块与迁移运行时完成独立核验。
- [x] 验证资料归档已发布并独立解压。
- [ ] 双语产品网站已同步并在线检查。
- [x] 公开 Tag 与发布产物不会移动或覆盖。
