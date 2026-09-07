# 发行状态

[English](releases.md) | 中文

一次发行需要可用产物，以及与之对应的用户说明和验证证据。

## YourBuddy

### 0.3.5 — 2026-09-08

YourBuddy 0.3.5 恢复了被桌面权限层拒绝的网络、生命周期、更新、外部链接与插件市场控制项。即使存在冲突的全局 `codexhost-delegation` Skill，Codex Preset 委派也会使用内置 `subagent_codex` 路径。五个公开附件均已匿名完整下载检查，更新签名通过密码学验证，公开 App 的标识、内置修复与迁移运行时通过检查。由于已有用户持有的旧版实例妨碍隔离启动，原生启动、安装包 WebView 控制项、从 0.3.4 升级、OAuth 与真实供应商调用仍未验证。

[Release 与下载](https://github.com/istarwyh/yourbuddy/releases/tag/yourbuddy-v0.3.5) · [验证记录](../../releases/yourbuddy-v0.3.5/README.zh.md) · [下载页](download.zh.md)

### 0.3.4 — 2026-09-07

YourBuddy 0.3.4 新增普通消息附带页面，以及找回未发送消息。在 Harbor 中，无需手动附加引用，就能询问当前 Trial 或勾选行；显式引用优先。公开 App 内含配套 Harbor JavaScript／Python 适配器 0.9.4。五个附件均已独立完整下载检查，更新签名已通过密码学验证，原样 App 副本已使用隔离数据完成 Host 认证就绪与启动。窗口可视化检查／截图、从已有安装执行更新、OAuth 与真实模型调用仍未验证。图集中的七张图是使用合成数据的历史源码截图，不是正式安装后应用截图。

[Release 与下载](https://github.com/istarwyh/yourbuddy/releases/tag/yourbuddy-v0.3.4) · [验证记录](../../releases/yourbuddy-v0.3.4/README.zh.md) · [下载页](download.zh.md)

### 0.3.3 — 2026-09-07

YourBuddy 0.3.3 修复了已安装 macOS 应用的本地 Host 认证。原生启动在打开同 Site 工作台 Shell 前完成一次性交换，因此 macOS WebKit 可以使用严格的会话 Cookie，而无需向 Renderer 暴露进程 Token。公开 DMG、Updater 归档、签名、校验和与稳定 Manifest 已独立下载检查；发布版应用已使用隔离数据完成 Host 认证就绪与启动。窗口可视化截图、从旧安装版执行更新、OAuth 与真实模型调用仍未验证。

[Release 与下载](https://github.com/istarwyh/yourbuddy/releases/tag/yourbuddy-v0.3.3) · [验证记录](../../releases/yourbuddy-v0.3.3/README.zh.md) · [下载页](download.zh.md)

### 0.3.2 — 2026-09-06

YourBuddy 0.3.2 新增应用内帮助，并强化私有 Host 的认证启动。macOS Apple Silicon 文件仍然公开，并曾完成独立检查，但安装后的应用后来复现了 `dsh web authentication required`；请在 0.3.3 发布后使用新版本。App 使用 ad-hoc 签名，尚未使用 Apple Developer 身份完成签名和公证；安装后的交互式帮助、真实 OAuth/模型调用与企业代理/CA 路径仍未验证。

[Release 与下载](https://github.com/istarwyh/yourbuddy/releases/tag/yourbuddy-v0.3.2) · [不可变验证记录](https://github.com/istarwyh/yourbuddy/tree/27183fd9c14ae5c10fb86694a045358428569756/docs/releases/yourbuddy-v0.3.2) · [下载页](download.zh.md)

## 每个版本会说明什么

版本页说明用户可以完成的工作、精确版本和产物、已知限制，以及实际执行的安装或使用验证。失败、跳过与未验证路径保留可见；构建成功本身不等于已经发布。

[GitHub Releases](https://github.com/istarwyh/yourbuddy/releases)保存下载产物，仓库[发布记录](../../releases/README.zh.md)定义配套证据。旧品牌发行保留为历史记录，不作为新品牌可用性声明。
