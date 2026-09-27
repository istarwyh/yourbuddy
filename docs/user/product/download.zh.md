# 获取 YourBuddy

[English](download.md) | 中文

YourBuddy 当前适用于 Apple Silicon 上的 macOS 11 或更高版本。

## 下载最新版本

打开 [YourBuddy 最新 Release](https://github.com/istarwyh/yourbuddy/releases/latest)，在 **Assets** 中下载 macOS Apple Silicon DMG。GitHub 会让这个 URL 始终指向最新公开 Release，因此本页不需要在每次发布后修改版本链接。

旧版应用也可以使用**设置 → 通用设置 → 应用生命周期 → 检查更新**。正常升级会保留现有 YourBuddy 数据。

## 桌面包包含什么

默认插件、托管的 Node 与 pnpm 资源、Harbor Python 运行时随包提供。模型访问、在线服务网络以及需要容器的评测流程所用 Docker 仍需准备。目前不支持 Windows、Linux 或 Intel Mac 安装包。

## 安装限制

YourBuddy 使用带签名的 Tauri Updater，但 macOS 应用尚未使用 Apple Developer 身份签名或公证。首次启动可能需要选择**隐私与安全性 → 仍要打开**。请查看所选 GitHub Release 及其不可变[发布归档](../../releases/README.zh.md)，了解对应版本的说明、校验和、证据与已知限制。

继续查看[发行状态](releases.zh.md)、[全部 GitHub Releases](https://github.com/istarwyh/yourbuddy/releases)与[首次使用](start.zh.md)。
