# 获取 YourBuddy

[English](download.md) | 中文

桌面目标为 macOS Apple Silicon。YourBuddy 0.3.11 是当前已核验的公开版本：完整文件、Updater 签名、App 标识、内置产品 Provenance 与迁移运行时通过独立检查。原生启动与安装包 WebView 交互仍未验证。

## YourBuddy 安装包

下载 [macOS Apple Silicon 版 YourBuddy 0.3.11](https://github.com/istarwyh/yourbuddy/releases/download/yourbuddy-v0.3.11/yourbuddy-0.3.11-macos-arm64.dmg)。独立下载的完整文件为 569,117,419 字节，SHA-256 为 `1143cc7df94dadde3aa76b5b0db9cf669bd6967b6c676b862db5dd4870b44d4a`，与 GitHub 发布摘要及公开校验和一致。

0.3.11 默认加入 Oil Creator 本地内容工作台，并新增可选的**内容创作** Agent Preset。Sidebar 的 **Library** 用普通本地项目文件夹保存脚本、录屏、字幕、封面、文章与发布材料。该版本内置 DSH 0.1.5-rc.2、Oil Creator 0.1.0、Better Sidebar 0.19.1、Codex Auth 0.3.2、Harbor Evolution 0.9.7、Plugin Marketplace 0.3.3 与 Context Doctor 0.7.2。产品 Provenance 与迁移复制后的 Python 3.12.14 / Harbor 0.21.0 运行时通过独立检查。原生启动、安装包 WebView 操作、从已有安装执行更新、OAuth、可选创作集成与真实模型流量仍未验证。

[查看 0.3.11 Release](https://github.com/istarwyh/yourbuddy/releases/tag/yourbuddy-v0.3.11)、[下载校验和](https://github.com/istarwyh/yourbuddy/releases/download/yourbuddy-v0.3.11/SHA256SUMS.txt)、阅读[验证记录](../../releases/yourbuddy-v0.3.11/README.zh.md)、[下载验证归档](https://github.com/istarwyh/yourbuddy/releases/download/yourbuddy-v0.3.11/yourbuddy-v0.3.11-verification.zip)，或按[源码构建说明](../../../README.zh.md#run-from-source)运行。旧 XiaoHui 产物保留原名称，不作为 YourBuddy 下载展示。

## 桌面包包含什么

默认插件、托管的 Node 与 pnpm 资源、Harbor Python 运行时随包提供。模型访问、在线服务网络以及需要容器的评测流程所用 Docker 仍需准备。目前不支持 Windows、Linux 或 Intel Mac 安装包。

## 更新与验证

0.3.11 Release 提供安装包、SHA-256 校验和、Tauri Updater 包、签名文件与验证记录。稳定更新元数据与版本化清单相同；已使用正式 Tag 配置中的公钥，独立验证更新包的预哈希 Minisign 签名及受信注释。已有安装可以使用**设置 → 通用设置 → 应用生命周期 → 检查更新**；从旧安装版实际执行更新仍未验证。Updater 签名与 Apple 应用签名相互独立：App 的严格代码签名检查通过，签名为 ad-hoc、没有 TeamIdentifier，但 Gatekeeper 拒绝。它未完成 Apple Developer 签名或公证，首次启动可能需要按文档执行 macOS 放行操作。

继续查看[发行状态](releases.zh.md)与[首次使用](start.zh.md)。
