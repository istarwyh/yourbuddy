# 获取 YourBuddy

[English](download.md) | 中文

桌面目标为 macOS Apple Silicon。YourBuddy 0.3.5 是当前已核验的公开版本：完整文件、更新签名、App 标识与迁移运行时通过独立检查。由于已有用户持有的旧版实例运行，本次没有重复原生启动。

## YourBuddy 安装包

下载 [macOS Apple Silicon 版 YourBuddy 0.3.5](https://github.com/istarwyh/yourbuddy/releases/download/yourbuddy-v0.3.5/yourbuddy-0.3.5-macos-arm64.dmg)。独立下载的完整文件为 568,339,607 字节，SHA-256 为 `609a26786c301794ae2464723a3338438e8086627c3919a94b476ede8181fca7`，与 GitHub 发布摘要及公开校验和一致。

0.3.5 恢复了被桌面权限层拒绝的网络、生命周期、更新、外部链接与插件市场控制项。Codex Preset 委派现在会从模型自动路由中排除冲突的 `codexhost-delegation` Skill，并保留内置 `subagent_codex` 路径。公开 App 内含 DSH 0.1.2-rc.1 与 Harbor Adapter 0.9.4；其迁移复制后的 Python 3.12.14 / Harbor 0.21.0 运行时通过 CLI／导入检查。原生启动、安装包 WebView 操作、从已有安装执行更新、OAuth 与真实模型流量仍未验证。

[查看 0.3.5 Release](https://github.com/istarwyh/yourbuddy/releases/tag/yourbuddy-v0.3.5)、[下载校验和](https://github.com/istarwyh/yourbuddy/releases/download/yourbuddy-v0.3.5/SHA256SUMS.txt)、阅读[验证记录](../../releases/yourbuddy-v0.3.5/README.zh.md)，或按[源码构建说明](../../../README.zh.md#run-from-source)运行。旧 XiaoHui 产物保留原名称，不作为 YourBuddy 下载展示。

## 桌面包包含什么

默认插件、托管的 Node 与 pnpm 资源、Harbor Python 运行时随包提供。模型访问、在线服务网络以及需要容器的评测流程所用 Docker 仍需准备。目前不支持 Windows、Linux 或 Intel Mac 安装包。

## 更新与验证

0.3.5 Release 提供安装包、SHA-256 校验和、Tauri Updater 包、签名文件与验证记录。稳定更新元数据与版本化清单相同；已使用正式 Tag 配置中的公钥，独立验证更新包的预哈希 Minisign 签名及受信注释。已有安装可以使用**设置 → 通用设置 → 应用生命周期 → 检查更新**；从旧安装版实际执行更新仍未验证。Updater 签名与 Apple 应用签名相互独立：App 的严格代码签名检查通过，签名为 ad-hoc、没有 TeamIdentifier，但 Gatekeeper 拒绝。它未完成 Apple Developer 签名或公证，首次启动可能需要按文档执行 macOS 放行操作。

继续查看[发行状态](releases.zh.md)与[首次使用](start.zh.md)。
