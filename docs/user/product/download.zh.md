# 获取 YourBuddy

[English](download.md) | 中文

桌面目标为 macOS Apple Silicon。YourBuddy 0.3.3 是当前已完成核验的公开版本，用于取代存在启动缺陷的 0.3.2。

## YourBuddy 安装包

下载 [macOS Apple Silicon 版 YourBuddy 0.3.3](https://github.com/istarwyh/yourbuddy/releases/download/yourbuddy-v0.3.3/yourbuddy-0.3.3-macos-arm64.dmg)。公开文件大小为 568,343,774 字节，SHA-256 为 `9a8aca090f1ef78c414b51dcf5d61125fd0f26c03972c8e168480281529e2d11`。

0.3.3 修复了 0.3.2 安装版已确认的 `dsh web authentication required` 启动失败。公开 0.3.3 应用已使用隔离数据完成 Host 认证就绪与启动；窗口可视化截图、OAuth 与真实模型流量仍未验证。

[查看 0.3.3 Release](https://github.com/istarwyh/yourbuddy/releases/tag/yourbuddy-v0.3.3)、[下载校验和](https://github.com/istarwyh/yourbuddy/releases/download/yourbuddy-v0.3.3/SHA256SUMS.txt)、阅读[验证记录](../../releases/yourbuddy-v0.3.3/README.zh.md)，或按[源码构建说明](../../../README.zh.md#run-from-source)运行。旧 XiaoHui 产物保留原名称，不作为 YourBuddy 下载展示。

## 桌面包包含什么

默认插件、托管的 Node 与 pnpm 资源、Harbor Python 运行时随包提供。模型访问、在线服务网络以及需要容器的评测流程所用 Docker 仍需准备。目前不支持 Windows、Linux 或 Intel Mac 安装包。

## 更新与验证

0.3.3 Release 提供精确安装包、SHA-256 校验和、带签名的 Tauri Updater 包与验证记录。已有安装可以使用**设置 → 通用设置 → 应用生命周期 → 检查更新**；本次发布验证没有从旧安装版实际走完带签名的更新旅程。Updater 签名与 Apple 应用签名相互独立：这些构建使用 ad-hoc 签名，尚未使用 Apple Developer 身份完成签名和公证，因此 Gatekeeper 会拒绝，首次启动可能需要按文档执行 macOS 放行操作。

继续查看[发行状态](releases.zh.md)与[首次使用](start.zh.md)。
