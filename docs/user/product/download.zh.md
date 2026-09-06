# 获取 YourBuddy

[English](download.md) | 中文

桌面目标为 macOS Apple Silicon。YourBuddy 0.3.2 是当前已完成独立验证的版本。

## YourBuddy 安装包

下载 [macOS Apple Silicon 版 YourBuddy 0.3.2](https://github.com/istarwyh/yourbuddy/releases/download/yourbuddy-v0.3.2/yourbuddy-0.3.2-macos-arm64.dmg)。公开文件大小为 567,479,032 字节，SHA-256 为 `a00e9ed9b0f8ae0702692cb69b3ba773eb5f622a0f05c95df522f3d1c8dd466c`。

[查看 0.3.2 Release](https://github.com/istarwyh/yourbuddy/releases/tag/yourbuddy-v0.3.2)、[下载校验和](https://github.com/istarwyh/yourbuddy/releases/download/yourbuddy-v0.3.2/SHA256SUMS.txt)、阅读[不可变验证记录](https://github.com/istarwyh/yourbuddy/tree/27183fd9c14ae5c10fb86694a045358428569756/docs/releases/yourbuddy-v0.3.2)，或按[源码构建说明](../../../README.zh.md#run-from-source)运行。旧 XiaoHui 产物保留原名称，不作为 YourBuddy 下载展示。

## 桌面包包含什么

默认插件、托管的 Node 与 pnpm 资源、Harbor Python 运行时随包提供。模型访问、在线服务网络以及需要容器的评测流程所用 Docker 仍需准备。目前不支持 Windows、Linux 或 Intel Mac 安装包。

## 更新与验证

0.3.2 Release 提供精确安装包、SHA-256 校验和、带签名的 Tauri Updater 包与验证记录。已有安装可通过**设置 → 通用设置 → 应用生命周期 → 检查更新**检查升级。Updater 签名与 Apple 应用签名相互独立：当前构建使用 ad-hoc 签名，尚未使用 Apple Developer 身份完成签名和公证，因此 Gatekeeper 会拒绝，首次启动可能需要按文档执行 macOS 放行操作。

继续查看[发行状态](releases.zh.md)与[首次使用](start.zh.md)。
