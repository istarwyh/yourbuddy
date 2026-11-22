---
kind: upgrade-guide
description: "YourBuddy 桌面安装器与应用要求 Apple Silicon 上的 macOS 13.5 或更高版本。"
---

# YourBuddy 桌面的最低 macOS 版本

[English](guide.md) | 中文

## 变更

YourBuddy 安装器此前只检查 Darwin 与 arm64，不检查 macOS 版本。现在，低于 `13.5` 的 macOS 会被拒绝并返回 `unsupported_macos`，应用也声明相同的最低版本。这只适用于 YourBuddy 桌面安装器与应用，不改变 `dsh` CLI 或其他平台的要求。随应用提供的 Node 二进制文件要求这一最低版本；旧安装器的检查不代表旧应用实际可以在更早的 macOS 上运行。运行时依据与验证限制见[当前系统要求](../../../user/product/download.zh.md)。

## 迁移

1. 在准备使用的 Apple Silicon Mac 上运行 `sw_vers -productVersion`。
2. 如果结果低于 `13.5`，先升级 macOS，再安装或升级 YourBuddy。
3. 按[下载](../../../user/product/download.zh.md)或[终端安装](../../../user/product/installer.zh.md)指引重试，确认安装器不再报告 `unsupported_macos`。通过系统版本检查不代表下载、原生启动、模型访问或可选集成兼容性均已验证成功。
