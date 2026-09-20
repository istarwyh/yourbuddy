# YourBuddy 0.3.10

[English](README.md) | 中文

本归档记录 YourBuddy 0.3.10 对 Better Sidebar 文件打开与内嵌浏览器的恢复。

- 发布标识：`yourbuddy-v0.3.10`。
- 产品渠道：适用于 Apple Silicon macOS 的 YourBuddy 桌面应用。
- 归档状态：发布前候选版本；本地源码与组装产品检查通过，公开产物、Updater 元数据、官网部署与可下载验证归档仍待完成。
- 发布源码：发布后记录不可变 Tag Commit；产品修复 Commit 为 `663210f699bd5f58cf848d5723da8218c4744cd2`。
- 证据图集：未捕获；受控浏览器观察记录为仅测源码证据，而不是已安装 YourBuddy 截图。
- 证据下载：等待公开产物核验。

## 面向用户的发布说明

### 改了什么

Better Sidebar 文件动作会显式指定 Files Tab 所属的 Session。Browser Tab 默认使用不受限的跨源 iframe 行为，受限沙箱仍可作为显式设置启用。

### 解决了什么问题

文件树点击与**在新标签页中打开**在原生 Sidebar 展示下不再静默失效。在内嵌浏览器输入普通 URL 后，兼容网站不再因为默认受限沙箱而保持空白。

### 在哪里使用

在 Better Sidebar 主工作区的 **Files**、**Changes** 与 **Browser** Tab 中使用。

### 如何体验

1. 打开一个 Session 并选择其 **Files** Tab。
2. 从文件树打开文件，或在右键菜单选择**在新标签页中打开**，确认出现 Editor Tab。
3. 打开 **Browser** Tab，输入 `https://baidu.com/`，确认导航后页面可以渲染。
4. 如需受限模式，请在 Side Card 设置中启用浏览器沙箱。

### 安装或升级

发布后，从 0.3.10 GitHub Release 安装 Apple Silicon DMG，或在旧版 YourBuddy 中使用**设置 → 通用设置 → 应用生命周期 → 检查更新**。

### 兼容性、迁移与限制

现有应用数据会保留，无需迁移。已显式保存的浏览器沙箱偏好仍具有权威性。不受限默认值赋予内嵌跨源页面普通 iframe 能力，包括顶层导航。桌面应用支持 Apple Silicon 上的 macOS 11 及以上版本。应用继续使用 ad-hoc 签名，尚未完成 Apple Developer 签名或公证。在公开阶段补充记录之前，原生 GUI 启动、打包 WebView 交互、通过旧版 Updater 安装、OAuth 与真实模型流量仍未验证。

## 验证概览

| 场景 | 状态 | 受测构建 | 环境 | 证据 |
|---|---|---|---|---|
| 聚焦 Sidebar 回归 | passed | 本地源码候选版本 | macOS 15.6.1 arm64；Node 22.19.0；pnpm 11.7.0 | [本地验证](evidence/local-candidate-validation.txt) |
| 产品补丁重放与组装 Smoke | 在记录的受控范围内通过 | 已准备的本地产品 | 受控本地 Host 与 Chromium；无模型供应商 | [本地验证](evidence/local-candidate-validation.txt) |
| 正式桌面发布 | pending | 不可变 Tag `yourbuddy-v0.3.10` | GitHub Actions | 待完成 |
| 公开安装包、Updater、运行时与官网 | pending | 公开 Release 产物 | GitHub Release 与 GitHub Pages | 待完成 |

## 场景：本地候选版本与组装产品验证

- 状态：在记录的受控范围内通过。
- 日期与时间：2026-09-20 22:50 UTC+08:00 CST。
- 发布版本与 Commit：`yourbuddy-v0.3.10`；产品修复 Commit `663210f699bd5f58cf848d5723da8218c4744cd2`；最终 Tag 待定。
- 受测构建：本地源码候选版本与已准备的组装 Host/Client 产品。
- 环境：macOS 15.6.1 arm64；Node 22.19.0；pnpm 11.7.0；Rust 1.98.0；uv 0.12.5。
- 证据来源：本次发布实测。
- 数据：合成文件路径、隔离产品状态与受控 Chromium iframe 中的百度公开内容。
- 模型或服务：受控本地服务与公开 HTTP 内容；未使用模型供应商。

### 操作步骤

1. 运行 Better Sidebar 浏览器与文件打开聚焦回归规格。
2. 依次重放全部 Better Sidebar 记录补丁，并验证已提交快照与补丁 Hash。
3. 运行产品刷新兼容性套件。
4. 运行 `prepare:release -- --allow-dirty`，刷新候选版本、构建 Harness、重新生成冻结产品 Lock、准备组装分发并执行产品 Smoke。
5. 在受控 Chromium 中比较受限 iframe Token 与兼容 Token 集合，并观察百度渲染结果。

### 预期结果

文件动作携带所属 Session Scope。默认浏览器偏好关闭受限沙箱；选择启用时仍保留 GUI Origin 与 Loopback 例外；全部产品补丁依次重放；组装产品 Smoke 通过。

### 实际结果

一条聚焦 Vitest 断言与全部 67 项产品刷新检查通过。源码与两份分发 Client Bundle 均包含文件 Scope、浏览器策略及不受限默认值。产品 Provenance Hash 通过验证；`prepare:release` 完成 Harness 构建、冻结 Lock 重新生成、分发准备与产品 Smoke；受控 Chromium 使用兼容 Token 时能够渲染百度，而原始受限 Token 集合仍显示空白。

### 证据

- 操作前：用户提供的 Better Sidebar 截图保留为会话证据，不重新分发。
- 执行中：[本地候选验证](evidence/local-candidate-validation.txt)记录命令与受限结果。
- 结果：源码测试、补丁依次重放、已准备产品 Smoke 与受控浏览器观察通过。
- 失败与恢复：首次浏览器聚焦测试导入完整 Browser 组件，因为产品快照的 `react-icons` 依赖不在根测试依赖图中而失败；最终测试直接执行分发 Sandbox Policy，并检查源码与 Bundle 同步。

### 范围限制

受控 Chromium 观察不是打包后的原生 WebView。本地阶段不能证明原生 GUI 启动、Updater 安装、Apple Developer 签名、公证、OAuth、真实模型流量、公开下载、稳定 Updater 元数据或官网部署。

## 交付状态

- 产品发布状态：等待 `yourbuddy-v0.3.10` 工作流与 GitHub Release。
- 验证资料归档状态：部分完成；本地证据已提交，公开产物、运行时、工作流、官网与可下载归档证据仍待完成。
- 站点同步状态：等待产品发布与公开产物核验；现有 0.3.9 下载仍是已核验的公开目的地。
- 未验证范围：原生 GUI 启动、打包 WebView 交互、从旧安装版更新、Apple Developer 签名与公证、OAuth、真实模型流量、公开产物、Updater 元数据与 0.3.10 官网旅程。

## 交付清单

- [x] 发布标识与桌面版本源已为 0.3.10 准备完成。
- [x] 开头说明回答改了什么、解决了什么问题、在哪里使用以及如何体验。
- [x] 已说明安装、兼容性、迁移与已知限制。
- [x] 本地场景记录日期、时区、环境、受测构建、证据来源、数据类型及服务类型。
- [x] 明确标记仅测源码、受控服务、待完成与未验证证据。
- [x] 双语发布索引中已包含版本条目。
- [ ] 已在提交后的候选版本上完成最终干净工作区准备。
- [ ] 已独立核验公开发布页、安装包、Updater 元数据、签名、Hash 与迁移运行时。
- [ ] 已完成双语官网同步并独立核验线上下载旅程。
- [ ] 已创建、上传、解压并核验可下载验证资料归档。
- [x] 已分别报告产品发布状态、归档状态、站点同步与未验证范围。
- [x] 未移动或覆盖公开 Tag 与安装包；本次发布使用新版本。
