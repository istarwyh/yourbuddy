# DeepSeek Harness Desktop

[English](root-readme.md) | 中文

<p align="center">
  <img src="../../apps/desktop-tauri/app-icon.png" width="120" height="120" alt="DeepSeek Harness" />
</p>

<h1 align="center">DeepSeek Harness</h1>

<p align="center">跨平台桌面发行版 · 自定义标题栏 · 托盘 · 签名自动更新 · 任务完成提醒</p>

<p align="center">
  <a href="https://github.com/Sakana-yuyu/deepseek-harness-desktop/releases"><img src="https://img.shields.io/github/v/release/Sakana-yuyu/deepseek-harness-desktop?display_name=tag&logo=github&label=Release" alt="Latest release" /></a>
  <a href="https://github.com/Sakana-yuyu/deepseek-harness-desktop/actions/workflows/desktop-release.yml"><img src="https://img.shields.io/github/actions/workflow/status/Sakana-yuyu/deepseek-harness-desktop/desktop-release.yml?logo=githubactions&label=Desktop" alt="Desktop build" /></a>
  <a href="../../LICENSE"><img src="https://img.shields.io/github/license/Sakana-yuyu/deepseek-harness-desktop?logo=opensourceinitiative&label=License" alt="License" /></a>
  <a href="https://v2.tauri.app/"><img src="https://img.shields.io/badge/Tauri-2-24C8DB?logo=tauri&logoColor=white" alt="Tauri 2" /></a>
  <a href="https://www.rust-lang.org/"><img src="https://img.shields.io/badge/Rust-native-DEA584?logo=rust&logoColor=white" alt="Rust" /></a>
</p>

<p align="center">
  <a href="#快速开始">快速开始</a> ·
  <a href="#功能概览">功能概览</a> ·
  <a href="#界面">界面</a> ·
  <a href="#社区">社区</a>
</p>

![主窗口](../../apps/desktop-tauri/screenshots/main.png)

> 把 DeepSeek Harness 的 `dsh web` 装进轻量 Tauri 壳：自定义标题栏、托盘、签名更新，以及一轮任务完成时的通知和提示音。

本仓库是 [Sakana-yuyu](https://github.com/Sakana-yuyu) 维护的 [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) 桌面发行版。GitHub 首页默认使用中文。

## 为什么使用桌面版

上游负责 agent 循环、工具和 Web UI。本 fork 只补桌面功能：无边框窗口、按操作系统放置的最小化/最大化/关闭、托盘、自动更新和完成提醒。框架代码留在 `packages/`，同步上游无需修改这些包。

## 功能概览

| 图标 | 能力 | 说明 |
| :---: | --- | --- |
| <img src="../../apps/desktop-tauri/app-icon.png" width="22" height="22" alt="DeepSeek" /> | 原生桌面壳 | Tauri 2 / Rust 窗口承载现有 `dsh web` UI。 |
| <img src="https://cdn.simpleicons.org/tauri/24C8DB" width="22" alt="Title bar" /> | 自定义标题栏 | 不使用原生标题栏按钮。Windows 在右，macOS 在左，Linux 按窗口管理器布局。 |
| <img src="https://cdn.simpleicons.org/apple/000000" width="22" alt="Tray" /> | 系统托盘 | 第一次关闭询问最小化到托盘还是退出，并记住选择。菜单可修改该偏好、显示窗口、检查更新或退出。 |
| <img src="https://cdn.simpleicons.org/github/111827" width="22" alt="Update" /> | 签名自动更新 | 主窗口打开后检查 `desktop-updater` 通道并验证签名。发布说明为中英双语。 |
| <img src="https://cdn.simpleicons.org/googlechat/34A853" width="22" alt="Notify" /> | 任务完成提醒 | 一轮 `turn/end` 完成且窗口不在前台时，弹出通知并播放提示音。 |
| <img src="https://cdn.simpleicons.org/nodedotjs/5FA04E" width="22" alt="Node" /> | 镜像预配 | 安装包只带源码。首次启动扫描本机 Node / pnpm 和 `~/.dsh`，只在缺失时从 npmmirror 下载。 |
| <img src="https://cdn.simpleicons.org/rust/000000" width="22" alt="Overlay" /> | Overlay 插件 | Host 协作功能通过 `dsh web --patch` 加载 Cordis overlay，不修改 `packages/`。 |

### 支持的平台

- Windows x64 和 x86
- macOS Intel 和 Apple Silicon
- Linux x64（AppImage、deb）

从 [Releases](https://github.com/Sakana-yuyu/deepseek-harness-desktop/releases) 下载发行包。详情见[桌面端 README](../../apps/desktop-tauri/README.zh.md)。

## 界面

![任务完成通知](../../apps/desktop-tauri/screenshots/notify.png)

## 快速开始

1. 打开 [GitHub Releases](https://github.com/Sakana-yuyu/deepseek-harness-desktop/releases)。
2. 安装对应平台的 **0.2.0-rc.1-0.3**。
3. 首次启动扫描本机 Node / pnpm 和已有的 `~/.dsh`，仅下载缺失内容。

## 社区

- <img src="https://cdn.simpleicons.org/github/111827" width="16" alt="GitHub" /> [GitHub 仓库](https://github.com/Sakana-yuyu/deepseek-harness-desktop)
- <img src="https://cdn.simpleicons.org/github/111827" width="16" alt="Releases" /> [Releases](https://github.com/Sakana-yuyu/deepseek-harness-desktop/releases)
- <img src="https://cdn.simpleicons.org/github/111827" width="16" alt="Upstream" /> [上游 DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness)
- <img src="https://cdn.simpleicons.org/discourse/111827" width="16" alt="Linux.do" /> [Linux.do](https://linux.do/)
