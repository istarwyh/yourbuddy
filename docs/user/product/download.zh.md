# 获取 YourBuddy

[English](download.md) | 中文

YourBuddy 当前适用于 Apple Silicon 上的 macOS 11 或更高版本。

## 下载最新版本

打开 [YourBuddy 最新 Release](https://github.com/istarwyh/yourbuddy/releases/latest)。推荐下载小型安装包 `yourbuddy-<version>-bootstrap-macos-arm64.dmg`，自动更新也使用这一版本。首次启动不能访问外网时，下载体积更大的 `yourbuddy-<version>-offline-macos-arm64.dmg`。两者安装相同的应用身份与组件版本。

旧版应用也可以使用**设置 → 通用设置 → 应用生命周期 → 检查更新**。正常升级会保留现有 YourBuddy 数据。

## 桌面包包含什么

Bootstrap DMG 携带应用 Shell、默认插件 Manifest 与固定 pnpm Package。首次启动会复用兼容的宿主 Node 与完整的用户 pnpm Store，只下载缺失的签名 Release Component。Harbor 保持可发现，但只有用户明确执行 Harbor 安装操作后才会安装 Python Runtime。Offline DMG 内含相同组件的 Seed。模型访问、在线服务网络以及需要容器的评测流程所用 Docker 仍需准备。目前不支持 Windows、Linux 或 Intel Mac 安装包。

## 安装限制

YourBuddy 使用带签名的 Tauri Updater，但 macOS 应用尚未使用 Apple Developer 身份签名或公证。首次启动可能需要选择**隐私与安全性 → 仍要打开**。请查看所选 GitHub Release 及其不可变[发布归档](../../releases/README.zh.md)，了解对应版本的说明、校验和、证据与已知限制。

继续查看[发行状态](releases.zh.md)、[全部 GitHub Releases](https://github.com/istarwyh/yourbuddy/releases)与[首次使用](start.zh.md)。
