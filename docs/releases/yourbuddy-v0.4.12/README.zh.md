# YourBuddy 0.4.12

[English](README.md) | 中文

本发布前归档将源码验证、尚待执行的安装包验收与公开交付分别记录。

- 发布标识：`yourbuddy-v0.4.12`
- 产品渠道：适用于 macOS Apple Silicon 的 YourBuddy 桌面应用。
- 归档状态：已记录源码验证；安装包验收与独立公开下载检查待完成。
- 证据来源：2026-10-20 UTC 的本次发布准备；较早的 PR 结果明确标为历史证据。
- 证据下载：发布后的 [Tag 源码归档](https://github.com/istarwyh/yourbuddy/archive/refs/tags/yourbuddy-v0.4.12.zip) 将包含本目录；尚未验证其公开下载。

## 用户发布说明

### 更新内容

网络代理测试与正在运行的 Host 使用同一份共享代理策略。内置产品插件精确声明所选 Harness 0.2 预发布版本。刷新固定的 Ego Browser Runtime 时会保留已记录的产物，并校验最终摘要。

### 解决的问题

安装包中的代理预检查不再依赖 CLI 未声明的依赖或已移除的 Dispatcher 标记。初始化失败仍按失败处理。插件 Metadata 与内置 Runtime 对齐，重新刷新 Ego Browser 时会替换固定归档中已有的 SDK 文件。

### 使用位置

打开设置 → 通用设置 → 网络代理。刷新与兼容性修复属于发布准备流程，不会增加新的应用内控件。

### 体验方法

发布后，从 [GitHub Releases](https://github.com/istarwyh/yourbuddy/releases/latest) 安装 macOS Apple Silicon 的 Bootstrap 或 Offline DMG。测试草稿策略，保存并重启，再测试生效的 Host 策略。HTTP 401/403 仅说明可达；成功登录或模型响应需要单独验证。

### 兼容性与限制

所选 Harness 为 `0.2.0-rc.1`。版本检查、TLS 检查、默认插件功能、发布保护与凭据权限均未放宽。本次交付没有 Windows 发布渠道。[Issue #39](https://github.com/istarwyh/yourbuddy/issues/39) 与 [Issue #71](https://github.com/istarwyh/yourbuddy/issues/71) 保留未验收范围，不予关闭。

## 验证摘要

| 场景 | 状态 | 被测构建 | 证据 |
|---|---|---|---|
| 组合兼容性、重放、刷新与 Bundle | 通过，47/47 | 本地源码 | [源码检查](evidence/source-checks.json) |
| 原始 product-refresh 聚合 | 通过，Oil 147/147 与产品 110/110 | 本地已构建源码 | [源码检查](evidence/source-checks.json) |
| 代理预检查/Host 与 Workbench | 通过，3/3 与 135/135 | 本地已构建源码；Loopback Fixture | [源码检查](evidence/source-checks.json) |
| 准备后的 Chromium 与原生 Offline 安装/冷启动 | 未验证 | 安装包待生成 | 每个 Tag 执行既有验收并保留脱敏证据 |
| 公开安装包、校验和、更新器与组件 | 未验证 | 待发布 | 独立下载与签名/Manifest 检查待完成 |

## 源码检查记录

2026-10-20 UTC，隔离的 macOS arm64 Checkout 使用 Node 22.22.3 与 pnpm 11.7.0。组合源码树通过带品牌的完整构建（347 个 Client 产物）、针对性回归、完整 Workbench 测试、`test:docs`（21/21）、`doc-sync`（43/43）、完整 `lint`、原始提交 Hook 与原始 pre-push 类型检查。两轮独立审查未发现剩余代码阻塞，并重算了快照与补丁摘要。合并后的源码对应 [PR #70](https://github.com/istarwyh/yourbuddy/pull/70)、[PR #72](https://github.com/istarwyh/yourbuddy/pull/72) 与 [PR #73](https://github.com/istarwyh/yourbuddy/pull/73)。

隔离全局及系统 Git 配置后，发布源码检查通过 29/29。首次运行通过 28/29，原因是本机 URL 专属凭据 Helper 出现在 Fixture 断言中；未修改生产认证代码。普通 HTTPS 发布通过原始 Hook，但缺少 Workflow Scope。现有 GitHub App 在未增加权限的情况下发布了相同的已验证源码树。

## 已知验证缺口

较早的 PR 运行曾在两项未修改的 Oil 时间/顺序断言失败；本次聚合通过，但仍保留此前失败及未明确的原因。#72 的 Linux Coverage 在下载 bubblewrap 时遇到 HTTP 503，于测试开始前停止。此前 #70/#73 主 CI 通过；更新后 Head 的 CI 单独计算，不声称已完成。Cloudflare Preview 缺少配置的凭据；未增加权限或凭据。

真实 Provider 请求、已安装应用的代理保存/重启、企业网络行为、升级/降级、Bootstrap 清理/恢复与 Apple 公证均不能由源码测试证明。准备后的 Chromium 使用真实 Host/Profile 与桌面命令桩，不能验证原生 WebView 控件。发布 Workflow 成功仅支持实际执行过的验收范围。

## 交付状态

- 产品发布状态：待完成；此处不声称已有公开 0.4.12 安装包。
- 验证归档状态：部分完成；已记录源码证据，发布运行与公开下载证据待完成。
- 官网同步状态：没有新的产品使用指引；双语稳定 Latest Release 链接需要发布后检查。
- 未验证范围：以上所有待完成或仅有源码证据的场景；Windows 交付不适用。

## 回滚

保留不可变的 [0.4.11 发行版](https://github.com/istarwyh/yourbuddy/releases/tag/yourbuddy-v0.4.11)。如撤回本版，将 Latest Release 标记及稳定更新器 Manifest 恢复为前一版。更新器 Manifest 携带归档签名；组件 Manifest 与其独立签名保留在不可变的发行版中。不得移动公开 Tag 或替换已发布安装包字节。已更新的应用需要手动重装旧版 DMG，因为更新器仅接受更高版本。切换安装版本前退出应用并保留应用数据备份；尚未测试数据降级兼容性。
