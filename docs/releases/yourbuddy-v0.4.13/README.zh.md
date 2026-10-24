# YourBuddy 0.4.13

[English](README.md) | 中文

本归档区分已验证的源码和预准备 Chromium 行为，以及待执行的打包验收与公开交付。

- 发布标识：`yourbuddy-v0.4.13`
- 产品渠道：适用于 macOS Apple Silicon 的 YourBuddy 桌面应用。
- 归档状态：已记录源码与预准备产品验证；发布工作流和公开资产待核验。
- 证据 Commit：[已合并实现](https://github.com/istarwyh/yourbuddy/commit/e2953b84d40972ffb4c22682248290b032383883)。
- 证据图集：[预准备 Chromium 工作台](evidence/workbench.png)，仅含合成内容；不代表原生 Tauri 窗口。
- 证据下载：[不可变 Tag 源码归档](https://github.com/istarwyh/yourbuddy/archive/refs/tags/yourbuddy-v0.4.13.zip)，发布后可用；独立下载待核验。

## 面向用户的发布说明

### 改了什么

从中间 Files 工作台打开 PDF、Word、PPT 和 Excel 时复用现有 DSH 阅读器：PDF.js、LibreOffice kit 和 Excel 查看器，没有新增查看器依赖。

### 解决了什么问题

办公文件进入现有阅读器，不再落入仅提供下载的编辑器回退。Files 树状态与原生文档身份得到保留；同步后台打开会保留窄屏下已折叠的 Session 区域。

### 在哪里使用

使用默认中间 Files 工作台。打开文档会显示原生阅读器；返回 Files 可打开其他文件。

### 如何体验

从 Files 打开合成 PDF、DOCX、PPTX 或 XLSX，查看分页或工作表，关闭阅读器后重新打开。预览为只读，转换在本机完成；另行要求 Agent 读取文件时遵循该任务的模型和工具设置。

### 安装或升级

发布后使用 [GitHub Releases](https://github.com/istarwyh/yourbuddy/releases/latest) 中的 macOS Apple Silicon Bootstrap 或 Offline DMG，或现有签名更新器。公开资产完成核验前不宣称已可用。

### 兼容性、迁移与限制

选用的 Harness 仍为 `0.2.0-rc.1`。已有仅下载标签需关闭重开；Session 接管后的原生队列重放保留上游可见性行为。旧 DOC/PPT/XLS 仅有路由回归覆盖，未包含在这些视觉样例中。编辑、OCR、协作和公式重算不在本次范围内。

合成 macOS 原生 DOCX/PPTX 转换报告缺少 Liberation Sans；此前 Linux WASM 检查报告缺少宋体。转换成功不保证与 Microsoft Office 排版完全一致。补充的 modern PDF.js Node 导入在 Node 22 因缺少 Promise.try 失败；Node 26 解析检查和 Node 22 Host 下的真实 Chromium 渲染通过。

## 验证概览

| 场景 | 状态 | 受测构建 | 证据 |
|---|---|---|---|
| 标准构建、类型、lint、文档、hygiene、测试与 Hooks | 通过 | 版本递增前的隔离源码 | [源码检查](evidence/source-checks.json) |
| 默认 8 个 Clients，再安装 Harbor 后 9 个；四格式与重开 | 通过 | 版本递增前的冻结预准备产品 | [预准备结果](evidence/prepared-workbench.json) |
| 合成 PDF/XLSX 解析与原生 DOCX/PPTX 转换 | 通过，存在字体警告 | Node 26 补充解析器 | [转换结果](evidence/office-conversion.json) |
| 打包发布、公开资产与已安装更新器 | 未验证 | 0.4.13 发布待执行 | 仍须运行现有发布工作流 |

## 预准备产品场景

2026-10-24 UTC，在 macOS 15.6.1 arm64 上使用 Node 22.22.3、pnpm 11.7.0 和 Chromium 149.0.7827.55 测试提交 `e0b5fcb241a5b70199e825d9bb8d3c99cada89eb`；后续合并包含相同的已审查源码。真实 Host、Profile 与 Harbor Runtime 使用隔离数据和合成文件，未发送真实模型请求。

Smoke 点击中间 Files 入口，检查 PDF 页面文本与画布内容或 Excel 工作表内容，保留 Files 标签，关闭阅读器后重开。默认与安装 Harbor 后的阶段均通过，包括布局生命周期和品牌持久化/重置。此前两处验收编排失败已修复并独立复审，内容检查得到保留。

截图仅为 Chromium Bridge 证据。原生 Tauri 窗口验收未执行，用户已明确豁免。独立的重复打开/Agent 与用户混合去重、窄屏后台和缺依赖 UI 场景仍未验证，源码回归不能替代这些场景。Windows 交付、真实供应商、已安装更新及数据降级兼容性均未获得证明。

## 交付状态

- 产品发布：待执行；创建 Tag 或启动 Actions 不代表发布成功。
- 验证归档：已包含源码与预准备证据；发布运行与独立公开下载证据待补。
- 站点同步：本地双语产品构建通过；由现有网站工作流负责部署，线上页面仍待核验。
- 未验证范围：上述仅测源码、仅测 Bridge、已豁免、待执行及有限验证场景均单独保留。

## 回滚

保留不可变的 [0.4.12 发布](https://github.com/istarwyh/yourbuddy/releases/tag/yourbuddy-v0.4.12) 及其原始签名更新清单。需要撤回时恢复上一版本的最新发布标记与稳定更新源；不得移动公开 Tag 或替换已发布安装包。更新器只接受更高版本，因此已更新应用需手动重装上一版 DMG。操作前退出应用并备份应用数据；数据降级兼容性未验证。

已下载的 [0.4.12 更新清单基线](evidence/rollback-updater-0.4.12.json) 的 SHA-256 为 `13b23973b8fe9e04123695977602e1ebe2a6fefc49fbebdcfbcf178930f1ff1e`。此为保留的回滚证据，不代表已经执行回滚。

## 发布后观察——2026-10-24 UTC

以下观察取代上文发布前的交付状态。公开 Tag 与已发布安装包字节保持不变。

[正式发布](https://github.com/istarwyh/yourbuddy/releases/tag/yourbuddy-v0.4.13) 于 08:57:24 UTC 发布，非草稿、非预发布，包含 17 个资产。其附注 Tag 指向 `05dbb5c63baf06ed728a7913260bd02e6e59449d`。[官方发布运行 40078157066](https://github.com/istarwyh/yourbuddy/actions/runs/40078157066) 成功完成；[保留的步骤记录](evidence/release-workflow.json) 覆盖组件准备、两种安装包、原生 Offline 安装/冷启动、迁移 Runtime、更新清单、校验和与发布。

| 场景 | 结果 | 证据与限制 |
|---|---|---|
| 已发布版本的预准备产品 | 通过 | [真实 Host/Profile，默认 8 个 Clients 再安装 Harbor 后 9 个](evidence/released-prepared-workbench.json)，Node 24.20.0；桌面 Invoke 仍仅验证 Bridge |
| 原生 Offline | 通过 | [签名 Offline 种子与三轮正常冷启动](evidence/native-offline.json)：46,716 / 11,652 / 9,557 ms；不代表四格式原生窗口交互 |
| 公开资产与清单 | 在所述范围内通过 | [34 项检查、9 个独立资产下载](evidence/public-verification.json)；全部 17 个资产 Digest 与 CI 保留的[发布校验清单](evidence/release-SHA256SUMS.txt)及[公开元数据](evidence/public-release.json)一致 |
| Apple 公证 | 跳过 | 两种安装包构建均记录缺少公证凭据；更新器/组件签名不代表 Apple Developer 公证 |
| 双语网站 | 已部署并核验 | [六个线上办公指南/下载页面](evidence/website-live.json)返回 HTTP 200 且包含预期内容；[部署运行](https://github.com/istarwyh/yourbuddy/actions/runs/40077615762) |

独立下载验证了 Bootstrap 归档/DMG 字节、清单签名、更新器身份及 Bootstrap 应用版本/arm64 身份。报告列出的八个大型/Runtime 归档未独立下载；已对照实际成功构建记录核验其 Digest/大小一致性。稳定更新源与正式清单字节一致，匿名最新发布 URL 指向 0.4.13。未在本机执行下载的软件。

产品发布与站点同步已完成；本归档保留所述证据范围。上文仅测源码、仅测 Bridge、缺字体及未验证 UI 的限制仍然适用。CI 原生冷启动不能替代用户已豁免的四格式原生窗口验收、已安装更新器行为或数据降级测试。记录的 0.4.12 回滚基线仍可使用，未执行回滚。
