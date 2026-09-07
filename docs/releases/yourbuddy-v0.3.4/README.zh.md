# YourBuddy 0.3.4

[English](README.md) | 中文

本归档记录 YourBuddy 0.3.4 桌面发布。其中七张源码验证图片是历史证据，不是正式发布应用的截图。公开文件完整性、更新签名、迁移运行时和隔离原生启动已独立核验通过；可视窗口验收仍未验证。

- 发布标识：`yourbuddy-v0.3.4`；产品 Commit 为 [`d4c3b8f08d4fb55ed0a3bf9d3930d60cf759813d`](https://github.com/istarwyh/yourbuddy/commit/d4c3b8f08d4fb55ed0a3bf9d3930d60cf759813d)。
- 产品渠道：YourBuddy 桌面应用，macOS Apple Silicon；无关 npm、Python 与 SDK 发布渠道不适用。
- 归档状态：在声明范围内完成；产品文件、官网交付、历史图片、运行时观察和可下载验证归档分别记录。
- 证据身份：以 [Release 页面](https://github.com/istarwyh/yourbuddy/releases/tag/yourbuddy-v0.3.4)上的不可变图集链接所指文档 Commit 为准。该证据 Commit 与上方产品 Commit 分开记录；本文件不包含自身的 Commit Hash。
- 证据图集：[screenshots](screenshots/) 中的七张历史图片。
- 证据下载：[yourbuddy-v0.3.4-verification.zip](https://github.com/istarwyh/yourbuddy/releases/download/yourbuddy-v0.3.4/yourbuddy-v0.3.4-verification.zip)。

## 面向用户的发布说明

### 改了什么

YourBuddy 0.3.4 允许支持此功能的插件把当前页面附到普通消息中。在 Harbor 打开一个 Trial 或勾选多行，直接在现有输入框提问并发送。紧凑、可展开的附件显示捕获的对象或选区。发送失败的消息仍可找回，不会替换正在写的新草稿。

### 解决了什么问题

用户可以直接询问正在查看的内容，无需每次复制标识或手动附加对象。即使随后切换页面，消息仍保留当时的选区。失败消息的文字与图片保持在一起，不会混入另一份草稿。

### 在哪里使用

在对话的 Harbor 标签页使用。“发送时附带当前页面”控制自动捕获。“问 AI”和 `@harbor` 显式引用优先；其他标签页、斜杠命令或关闭开关时，不补入隐式 Harbor 上下文。原生对话显示页面附件与可找回的未发送消息，不增加第二个输入面板。

### 如何体验

1. 在 YourBuddy 0.3.4 中打开已有 Harbor 结果，选择一个 Trial 或勾选多个 Trial。
2. 不点“问 AI”，直接输入问题并发送。展开消息的页面附件，检查捕获的身份、选区、筛选和观测时间。
3. 切换到另一个 Trial 再提问。之前的附件应保留原始目标。
4. 准备失败时，先保留或清空正在编辑的新草稿，再恢复失败消息。恢复不会发送；再次发送时捕获当时正在查看的页面。

### 安装或升级

[0.3.4 GitHub Release](https://github.com/istarwyh/yourbuddy/releases/tag/yourbuddy-v0.3.4) 已公开。安装包／更新包完整下载、校验和、更新签名、迁移运行时检查和隔离原生启动已独立核验。正式下载页（[English](https://istarwyh.github.io/yourbuddy/en/download/) / [中文](https://istarwyh.github.io/yourbuddy/download/)）在独立资料包中也可访问；其 0.3.4 更新已准备但尚未部署。验签与隔离启动成功不能证明从旧安装版更新成功。

### 兼容性、迁移与限制

桌面发布面向 macOS Apple Silicon。从公开 DMG 原样复制的 App 通过隔离原生启动，但可视窗口检查和从已有安装执行更新仍未验证。Harbor 自动上下文需要宿主贡献 API 与兼容的 Harbor 插件同时具备；单独升级 npm 插件不能给旧宿主增加该 API。公开 App 内含 Harbor JavaScript 与 Python 适配器 0.9.4、Python 3.12.14 和 Harbor 0.21.0。[本地候选记录](evidence/local-candidate-validation.txt)包含本地快照／组合包 Hash；公开组合包 Hash 在下方单独记录，与本地候选并非字节相同。

新的 Harbor 引用在原项目的私有、会话隔离目录中保存身份和修订元数据，不保存证据正文或凭据。内存缓存到期或宿主重启后仍可读取；移动项目、切换会话、旧版仅内存 Token、缺失或损坏的记录不能恢复。证据变化仍明确报告，Trial 集合变化会被拒绝，不会扩大选区。记录不会自动删除。未发送消息找回仅持续于当前浏览器会话，不是持久化发件箱。捕获上下文不会启动评测、Gate、晋级或部署。

## 验证概览

| 场景 | 状态 | 受测构建 | 环境 | 证据 |
|---|---|---|---|---|
| 普通提问、显式优先、固定选区与恢复 | 历史源码运行 passed | 发布前宿主与 Harbor 源码组合，不是 0.3.4 安装包 | macOS arm64、Node 22.22.2、pnpm 11.7.0、Chromium | [历史机器记录](evidence/historical-source-acceptance.json)与下方图集 |
| 完整 Web 测试集 | 历史运行 failed；本归档未重跑 | 历史源码组合 | 本机 Node 22.22.2 与测试网络 | 下方范围限制保留两项失败 |
| 发布文档与本地产品官网 | passed | 功能 Commit `d5e200d441...` 加发布准备改动 | macOS arm64、Node 22.22.2、pnpm 11.7.0、Hugo Extended 0.165.0、缓存 Go 1.27.0 amd64 | [本地文档记录](evidence/local-docs-validation.txt) |
| Node 24 定向单元与浏览器检查 | 单元检查 passed；浏览器运行部分 failed；独立 DNS 辅助远程检查 passed | 当前源码候选，不是已安装桌面应用 | Node 24.20.0、pnpm 11.7.0、macOS arm64 | [本地候选记录](evidence/local-candidate-validation.txt)：9 个单元文件 / 214 个用例；3 个浏览器文件 / 6 个用例；保留远程失败与独立 1 个用例通过 |
| `user-text.tsx` 覆盖率检查 | 修正后 passed；保留此前失败 | 已修正源码候选 | Node 24.20.0、本地覆盖率运行 | 28 个文件 / 573 个用例通过；该精确文件的语句、分支、函数和行覆盖率均为 100% |
| 0.3.4 发布准备、修正源码回放与内置身份 | passed | 最终本地候选发布版本，不是公开安装包 | Node 24.20.0、macOS Apple Silicon 目标 | [本地候选记录](evidence/local-candidate-validation.txt)：220 个 Client 产物、2 个回放文件 / 5 个用例、离线安装、运行时组装与控制区 |
| 主 CI | passed：19 项作业全部成功 | 合并后的产品源码，文件树与受测候选一致 | 仓库 CI 矩阵 | [主 CI 运行](https://github.com/istarwyh/yourbuddy/actions/runs/34085409542) |
| 上游 Cloudflare 预览 | 未执行即取消；不是 passed | PR 源码 | 缺少所需自托管 runner | [已取消的预览运行](https://github.com/istarwyh/yourbuddy/actions/runs/34085409407) |
| 桌面版本发布 | passed；最新正式 Release 为 0.3.4 | 产品 Commit `d4c3b8f08d4fb55ed0a3bf9d3930d60cf759813d` | GitHub Release / macOS Apple Silicon | [桌面工作流](https://github.com/istarwyh/yourbuddy/actions/runs/34087526138)与[公开 Release](https://github.com/istarwyh/yourbuddy/releases/tag/yourbuddy-v0.3.4) |
| 公开文件与更新签名 | passed | 完整下载的发布附件 | 五个公开附件；固定的发布公钥 | [独立产物记录](evidence/public-artifact-stage.json)：大小／摘要、3/3 校验和、稳定清单与 Minisign 密码学验证 |
| 公开 App 身份、迁移运行时与隔离原生启动 | 在声明范围内 passed | 公开 DMG 中 App 的原样副本 | macOS arm64、内置 Node 22.19.0 / pnpm 11.7.0；隔离数据 | [App／运行时阶段记录](evidence/public-runtime-stage.json)与下方原生启动观察；可视窗口未验证 |
| 双语官网与可下载验证归档 | passed | 官网 Commit `e4514ce2d31d1481925c407e58dd220441c7ce42`；公开验证 ZIP | GitHub Pages 与 GitHub Release | [官网工作流 34129035171](https://github.com/istarwyh/yourbuddy/actions/runs/34129035171)、线上页面、Markdown／导航／搜索与本地／公开归档解压检查 |

## 场景：历史自动上下文源码验证

- 状态：在下述仅源码与受控模型范围内 passed。
- 日期与时间：2026-09-07 11:16–11:23 UTC+08:00，Asia/Shanghai；复制的机器记录生成于 11:23:28.612。
- 发布版本与 Commit：受测对象不是正式 0.3.4 产品。宿主基线 `70cc6570c44e356100c3947ac1b7e303801c23dd` 加当时未提交的功能改动；Harbor `0.9.3`，基线 `ee9bd3ef15667c27f1b156042e0bb01733f8bcb0` 加当时未提交改动。宿主功能之后提交为 `d5e200d4415f5d951374dd7794762b542057d0f9`；它不是截图的原始构建标识。
- 受测构建：真实 Loader、构建后的 Harbor 客户端、原生输入框、宿主消息接纳、正式 Harbor 解析工具与持久化会话日志。Harbor 客户端 SHA-256：`ef97477db1e0f842ae54f93bfb0f15a7d6aba56d8f8e10b39f69de6002e978ad`。
- 环境：macOS arm64、Node 22.22.2、pnpm 11.7.0、本地浏览器测试应用；源码记录未保留精确 macOS 版本。
- 证据来源：从 Harbor 的 `docs/verification/automatic-page-context/` 源码验证归档原样复制。这些是历史截图，不是正式 0.3.4 截图。
- 数据：合成 Trial 内容与测试消息。复制的机器记录已将运行时标识替换为占位值。
- 模型或服务：无密钥受控传输 `synthetic-harbor-context/keyless` 与 `synthetic-page-context/keyless`；没有外部模型提供方、真实账号、Candidate 或 Docker 评测。

### 操作步骤

1. 打开 Trial A 并发送普通问题，切换 B 后再发送；随后在 B 页面发送对 A 的显式引用。
2. 准备期间让真实 Job 暂时不可读，检查保留的草稿以及消息未接纳，再恢复 Job 并重试。
3. 勾选 A、B 后提交准确集合；随后不打开单条 Trial，提交经过筛选和排序的列表。
4. 使用第二个会话、重新加载 Harbor 并展开旧附件；比较模型接纳的输入块与持久化用户消息块。
5. 在通用宿主测试插件中发送图片，并让问题 A 在输入 B 时失败；只有输入框空闲后才恢复 A。

### 预期结果

同一条已接纳消息包含原始问题、图片与发送时页面引用。显式引用优先，无关视图不贡献 Harbor 上下文，勾选成员不扩大；失败时不发送缺少上下文的替代消息，也不覆盖其他草稿。

### 实际结果

记录中的 A 为 `hfq-021`、B 为 `hfq-034`，准确保留两个勾选成员，并记录列表的 `completed`、有效与 `lowest-score`，不含自由搜索原文。十条已接纳 Harbor 消息均与日志内容块一致。另一个会话拒绝第一个 Token。重新加载 Harbor 插件后恢复原快照与选区；这不是完整宿主进程重启。通用恢复记录保留 B、单独保存 A，并在明确重发 A 时捕获当前页面 B。11:16 刷新后，两份应用级测试文件的五个用例在 11:20 和 11:23 回放均通过。

### 证据

七张图片复用前已检查可读性与敏感信息，未进行视觉修改。01–04、06 展示真实 Harbor 源码插件；05、07 展示经真实宿主加载的通用测试插件，不是 Harbor。静态图片证明可见状态；[机器记录](evidence/historical-source-acceptance.json)补充接纳与身份断言。

#### 01 — 历史源码：直接询问 Trial A

![历史源码 Harbor Trial A 与没有显式引用的普通问题](screenshots/01-synthetic-trial-a-ordinary-question.png)

#### 02 — 历史源码：查看冻结的消息附件

![历史源码对话中的 Trial 身份与正式解析工具调用](screenshots/02-synthetic-native-conversation.png)

#### 03 — 历史源码：显式 A 优先于当前 B

![历史源码 Harbor 页面 B 与输入框中的显式 Trial A](screenshots/03-synthetic-explicit-a-overrides-page-b.png)

#### 04 — 历史源码：准备失败后保留问题

![历史源码失败提示与保留的普通问题草稿](screenshots/04-synthetic-failure-preserves-draft.png)

#### 05 — 历史通用宿主：图片与页面附件共存

![历史通用宿主测试对话中的图片与折叠合成页面上下文](screenshots/05-synthetic-image-with-page-context.png)

#### 06 — 历史源码：成员与列表筛选清晰可读

![历史源码对话中的两个勾选 Trial 和独立的筛选列表附件](screenshots/06-synthetic-selection-and-filter-attachments.png)

#### 07 — 历史通用宿主：失败 A 不替换草稿 B

![历史通用宿主中的 A 未发送条目与仍在输入框中的 B](screenshots/07-synthetic-failed-a-preserves-draft-b.png)

### 范围限制

源码记录报告 Harbor 检查 589/589、宿主 GUI 3,947 通过且一项跳过，不是新的 0.3.4 产品结果。更早的完整 Web 运行有 94 个文件通过、两个失败：`remote-welcome.e2e.ts` 遇到测试服务 Socket 失败，`hmr-live.e2e.ts` 在应用就绪前于 Node 22.22.2 加载钩子中抛出 `ERR_INVALID_RETURN_PROPERTY_VALUE`。未证明这些只属于基线问题，定向回放不能把它们改记为完整测试集通过。

这些截图不验证 YourBuddy 0.3.4 安装包、原生 WebView、带签名更新的安装、真实提供方推理质量、OAuth、Candidate 执行、Docker 取消、企业代理/CA 流量或其他平台，也不代表 Harbor PRD 完成，更不能证明生产审批、上线或自主部署。正式产品检查与任何新截图必须分别记录其实际版本和时间。

## 场景：Node 24 源码检查与本地发布准备

- 状态：定向单元检查、修正源码回放与本地发布准备／重建 passed；较早的浏览器调用仍有部分失败，另一次 DNS 辅助远程检查通过。
- 日期与时间：定向测试为 2026-09-07 12:00–12:04 UTC+08:00；首次完整准备于 12:42、最终源码构建于 12:53、回放于 12:54、运行时重建于 12:55 UTC+08:00 完成，Asia/Shanghai。
- 发布版本与 Commit：`yourbuddy-v0.3.4` 打 Tag 前的源码运行，基于功能 `d5e200d4415f5d951374dd7794762b542057d0f9` 加当时未提交的发布准备，最终形成候选 `eed670338df5f265189c797e37e66bdcdaa04aa5`；配套 Harbor 源码 `8264804dfd23186d030703580020b941a1bcc306`。产品 Commit 文件树相同，见下方记录。
- 受测构建：修正后源码与本地组装的候选运行时，不是 DMG、原生 WebView 或公开更新包。最终快照 Hash 已包含双语 README 更新，并完成重新构建。
- 环境：macOS arm64、Node 24.20.0、pnpm 11.7.0、Python 3.12.14、Harbor 0.21.0、Harbor JavaScript／Python 适配器 0.9.4。
- 证据来源：本轮发布操作日志，[候选记录](evidence/local-candidate-validation.txt)去除本地路径后汇总；没有新增截图。
- 数据与模型：合成／本地测试及包元数据；没有付费模型请求或 Candidate 评测。

### 操作与结果

两次定向单元运行分别通过 4 个文件 / 134 个用例和 5 个文件 / 80 个用例，合计 9 个文件 / 214 个用例。浏览器调用通过 3 个文件 / 6 个用例，但 `remote-welcome` 测试套件在其唯一用例执行前失败。单独直接重试也在本机代理／DNS 环境下以 `UND_ERR_SOCKET` 失败。另一次仅当前进程使用 DNS shim 的运行通过该用例。shim 没有修改系统 DNS 或已提交产品代码，也不证明原网络环境通过。这些检查不能替代历史完整 Web 结果。

另一次所属包运行通过 59 个文件 / 962 个用例，但 `user-text.tsx` 分支覆盖率为 93.22%，因此覆盖率检查失败。修正删除了固定正则匹配成功后四处不可达回退，未改变正则、行为或阈值，并新增空捕获与未知实体／仅解码一次的回归。12:52:50 UTC+08:00 的重跑通过 28 个文件 / 573 个用例；该精确文件的 59 条语句、51 个分支、13 个函数和 45 行均达到 100% 覆盖率。这是较小范围重跑，不是全部 59 个文件的重跑。下方较早的准备结果只证明当时的本地候选；修正后候选另有后续构建与回放证据。

首次完整 `prepare:release` 调用以 0 退出：先下载全部 587 个生产包，再以零下载离线安装，生成含 38,708 个文件的离线存储，验证 54 个运行时对等依赖链接与 6 个组装 Client 插件，并通过外部链接、Plugin Marketplace、Network 代理和 Application 生命周期控制区冒烟测试。品牌默认值／自定义／持久化／重置快照也通过。其他产品快照与冻结锁文件未变化。

源码修正与双语 README 更新后，最终源码构建记录了 220 个 Client 产物与四项公开值。真实应用的页面上下文回放在 12:54:45 UTC+08:00 通过 2 个文件 / 5 个用例，用时 7.95 秒。最终重建验证缓存摘要，以零下载离线重装全部 587 个包，并再次通过含 54 个对等依赖链接／6 个插件的组装 Host／Chromium 控制区检查。两项官方快照检查与 Client 构建记录检查均通过；DSH 来源记录与锁文件没有变化。这些是本地候选结果，不是安装后桌面验收。精确 Hash 见[候选记录](evidence/local-candidate-validation.txt)。

### 失败、恢复与限制

较早的准备尝试遇到 macOS Unix Socket 路径长度限制，以及大包下载的 60 秒超时。改用短临时目录路径，并正确应用仅本进程生效的 pnpm 300 秒超时后，完整准备成功。纠正前的环境尝试不能记作测试通过。准备期间联网填充缓存；只有后续包安装是离线的。源码与本地运行时证据不验证公开安装包字节、签名、更新安装、线上官网交付或完整 Harbor PRD。

## 场景：发布文档准备

- 状态：本地文档与生成官网检查 passed，不代表公开部署。
- 日期与时间：2026-09-07 12:04–12:06 UTC+08:00，Asia/Shanghai。
- 发布版本与 Commit：`yourbuddy-v0.3.4` 打 Tag 前的文档运行；功能 Commit `d5e200d4415f5d951374dd7794762b542057d0f9` 加当时未提交的发布准备。这些带时间的观察不包含本归档后续的发布更新。
- 受测构建：源码文档与使用正式网址前缀生成的本地产品官网。
- 环境：macOS arm64、Node 22.22.2、pnpm 11.7.0、现有 Hugo Extended 0.165.0 arm64 与缓存 Go 1.27.0 amd64；Go 模块联网已关闭。
- 证据来源：本次发布准备运行；未使用模型、真实账号或业务数据。

### 操作与结果

操作人员检查全部七张历史图和脱敏 JSON，确认复制前后字节一致，记录并检查四组双语配对，然后执行既有文档与官网检查。`test:docs` 15 项通过，`doc-sync` 32 项通过，`lint` 成功退出。`website:check` 70 个测试通过，投影 48 页，完成 Hugo 构建，并检查 57 个 HTML 页面的链接、资源、锚点与源码操作。检查生成的六个中英文首页、下载页和发布页，确认 0.3.3 继续可用、0.3.4 标记为待发布。[本地记录](evidence/local-docs-validation.txt)保留命令、警告与一次已纠正的调用方式。

补齐两份内置 Harbor README 译文与本地候选记录后，12:50–12:51 UTC+08:00 再次运行 `test:docs`，15 项通过；`doc-sync` 32 项通过；`website:check` 70 个测试通过并核验 57 个 HTML 页面。lint 在运行时重建期间延后，以避免并发写入构建文件；随后在修正后的源码上成功退出。独立归档采用明确的英文与中文官网下载链接，不引用其目录以外的文件。

### 范围限制

这些检查验证本地源码一致性与生成的官网内容，不发布官网、不核验线上外部链接，也不能证明 0.3.4 桌面下载可用。最终产品、归档下载与线上官网核验仍由发布人员负责。

## 产品源码与发布进度

[PR #12](https://github.com/istarwyh/yourbuddy/pull/12) 已合并为产品 Commit `d4c3b8f08d4fb55ed0a3bf9d3930d60cf759813d`。发布人员确认其完整文件树与受测候选 `eed670338df5f265189c797e37e66bdcdaa04aa5` 一致；合并不会把历史源码截图变成安装后产品证据。[主 CI 运行](https://github.com/istarwyh/yourbuddy/actions/runs/34085409542) 的 19 项作业全部成功完成。

独立的[上游 Cloudflare 预览](https://github.com/istarwyh/yourbuddy/actions/runs/34085409407)需要 `dsh-ubuntu-24-04-16core` 自托管 runner。本仓库没有自托管 runner，因此该工作流一直排队，发布人员取消后已在 PR 说明。它未执行、未通过；该取消不计入主 CI 的 19 项成功作业。

[正式 GitHub Release](https://github.com/istarwyh/yourbuddy/releases/tag/yourbuddy-v0.3.4) 于 2026-09-07 14:01:40 UTC+08:00（`2026-09-07T06:01:40Z`）发布，既非 Draft 也非 Prerelease，含五个公开附件。[桌面工作流 34087526138](https://github.com/istarwyh/yourbuddy/actions/runs/34087526138) 已成功完成，GitHub 最新正式 Release 为 0.3.4。下方记录的独立完整下载、更新包密码学验签、公开运行时检查与隔离原生启动均已通过。

双语 0.3.4 官网更新作为不可变产品 Tag 之后的独立文档提交发布，部署已成功。验证 ZIP 已附到正式 Release，保留发布记录、公开审计摘要和七张历史图片，没有替换安装包或移动 Tag。

## 场景：公开产物独立核验

- 状态：完整文件、校验和一致性、更新元数据、密码学验签，以及五个公开网址的匿名访问均 passed；安装后运行时与启动在下方单独记录。
- 日期与时间：2026-09-07 14:17:13.068 UTC+08:00，Asia/Shanghai（`2026-09-07T06:17:13.068Z`）。
- 发布版本与构建：从 `yourbuddy-v0.3.4` 下载的附件，产品 Commit 为 `d4c3b8f08d4fb55ed0a3bf9d3930d60cf759813d`；这是公开文件证据，不是本地组合包替代品。
- 方法：独立审计完整下载五个附件，对照 GitHub API 摘要检查字节长度与 SHA-256，并通过 `SHA256SUMS.txt` 中全部三条校验。稳定与版本化 `latest.json` 字节相同；清单中的签名与签名附件一致。
- 密码学检查：`minisign-verify` 0.2.5 使用正式 Tag 配置中的公钥，验证了更新归档的预哈希签名和受信注释。这是真实验签，不仅是字符串相等。
- 证据：[原样脱敏阶段记录](evidence/public-artifact-stage.json)。其中启动和匿名可见性 pending 字段保留当时范围；没有模型请求。

| 公开附件 | 字节数 | 独立观测的 SHA-256 |
|---|---|---|
| `latest.json` | 3,954 | `e0d5aeb27b83a2463c1da83769ad0b4b823c6880ab538d44e8a20c0dd6f8eeb9` |
| `SHA256SUMS.txt` | 312 | `fdacdcf11bbb9971392434960b92dbb1f7a058d368c2094d965be72cbd164da0` |
| `yourbuddy-0.3.4-macos-arm64.app.tar.gz` | 570,358,486 | `d826075d26fe325dbc1278d9a2b69575290ae13cdb6da9d9ead8c18011d09fd5` |
| `yourbuddy-0.3.4-macos-arm64.app.tar.gz.sig` | 408 | `042eb3e911883a255da27046ee4c9cf9ae9c13d8a96abbdacc957eb1c044008c` |
| `yourbuddy-0.3.4-macos-arm64.dmg` | 568,345,182 | `3a8eeaf70602836280a48fe09f587f7ebf50c19366f9b209c0ede7054f0b4270` |

这些产物检查本身不能证明原生启动；下方单独观察已经覆盖隔离启动。它们仍不能证明从旧安装版实际更新、Apple 签名／公证、真实模型质量或完整 Harbor PRD 已验收。

## 场景：公开 App 检查与隔离原生启动

- 状态：App 身份、代码签名完整性、迁移 Python CLI／导入及隔离原生启动 passed；Gatekeeper 拒绝 ad-hoc App，可视窗口检查／截图仍未验证。
- 日期与时间：App／运行时检查为 2026-09-07 14:19 UTC+08:00；原生启动为 14:20:30 UTC+08:00，Asia/Shanghai。
- 受测构建：从完整下载的公开 DMG 原样复制的 App；未修改标识、可执行文件、资源或签名。`diff -qr` 确认 DMG 与更新归档中的 App 文件树完全相同。
- 数据与服务：使用自有隔离目录，不继承真实 Profile 或凭据，关闭遥测，没有付费模型请求。公开安装器使用内置 Node 22.19.0 与 pnpm 11.7.0 完成离线运行时准备。
- 证据：[脱敏 App／运行时记录](evidence/public-runtime-stage.json)，本地审计路径替换为 `{{auditRoot}}`，以及[原生启动／清理记录](evidence/public-native-startup.txt)；上方公开产物阶段仍作为较早的独立观察保留。

`hdiutil verify`、只读挂载、复制和卸载均通过。App 报告版本／构建号 0.3.4、标识 `io.github.istarwyh.yourbuddy`，可执行文件为 arm64。`codesign --deep --strict` 退出 0，但签名为 ad-hoc、没有 TeamIdentifier；`spctl` 退出 3 并拒绝。它未完成 Apple Developer 签名或公证。

公开组合包中检查的 17 个修改源码／CSS 文件均与正式 Tag 逐字节一致。复制后的运行时通过四项 CLI／导入检查，三个集成入口均可加载，报告 Python 3.12.14、Harbor 0.21.0 与适配器 0.9.4。下方公开组合包和离线存储摘要与本地候选不同，因此不宣称整个组合包逐字节可复现。有限比较在 1,183 个相关文件中只发现两个编译 Client 的 checkout 路径／CSS Hash 差异；两份存储索引包含相同的 587 个包与 integrity key，已检查的存储差异来自生成时间与归档属主／mtime 元数据。该比较没有逐字节检查全部展开后的存储文件。

| 公开组合包字段 | 观测到的 SHA-256 |
|---|---|
| Harness 源码 | `aa4b10f1695e96b3eb0815aa0b7d6565cb68042cc55c0b0d042f055c31fb84cb` |
| Harness 内容 | `102787b7b9359a1c247a9f5632256699405b9bf127102f84d0035e4bc9210096` |
| 离线存储，38,708 个文件 | `9652e85978d477bed2c5caf21a21ba4e6d3148ee4ab7a6ae87c505445a7744c6` |
| 离线存储归档 | `9020f06ead6f87e16193c3880150e503ee38dff3e4307a3f51aa2401b5a9b40a` |

原样公开 App 使用隔离数据启动。启动日志记录认证就绪、DSH Web 就绪、打开主窗口、启动完成，以及桌面更新服务报告当前版本 0.3.4。对该准确 App 路径执行原生窗口检查时，工具以 `-10005: codex app-server exited before returning a response` 失败。日志中的打开窗口标记不是可视确认；没有生成正式原生截图。此次隔离启动不验证 Finder 安装、更新已有安装、OAuth、真实提供方行为，或在已发布 WebView 中执行历史合成 AI 旅程。

## 场景：官网与验证归档交付

- 状态：部署及 HTTP／内容检查 passed；不据此推断原生可视验收。
- 日期与时间：2026-09-07 21:49 UTC+08:00，Asia/Shanghai。
- 官网源码：文档 Commit `e4514ce2d31d1481925c407e58dd220441c7ce42`，与产品 Commit `d4c3b8f08d4fb55ed0a3bf9d3930d60cf759813d` 及不可变产品 Tag 分开。
- 部署：[YourBuddy 官网运行 34129035171](https://github.com/istarwyh/yourbuddy/actions/runs/34129035171) 的构建与部署均成功。
- 实际观察：公开的[中文首页](https://istarwyh.github.io/yourbuddy/)、[英文首页](https://istarwyh.github.io/yourbuddy/en/)、[中文下载](https://istarwyh.github.io/yourbuddy/download/)、[英文下载](https://istarwyh.github.io/yourbuddy/en/download/)、[中文发布页](https://istarwyh.github.io/yourbuddy/releases/)和[英文发布页](https://istarwyh.github.io/yourbuddy/en/releases/)均返回 HTTP 200 并显示 0.3.4。两种语言的下载页包含准确 DMG 摘要和 Release 链接。中英文原始 Markdown、导航 JSON 和两个带 Hash 的搜索索引均返回 HTTP 200；JSON 可解析，搜索索引包含新版本与 Harbor 内容。
- 归档：版本目录使用相对路径打包为 ZIP，在新目录中解压并检查 PNG 文件头、JSON 语法和 Markdown 本地链接。Release 附件上传后再匿名下载，与本地 ZIP 比较一致，并重复解压检查。
- 边界：这些 HTTP 与静态内容检查不能替代原生 WebView 渲染、Finder 安装、更新包安装、OAuth 或真实提供方执行。

## 交付状态

- 产品发布状态：已发布并在记录范围内完成独立核验：五个附件、3/3 校验和、更新签名、公开 App 身份、迁移运行时和隔离原生启动均通过。可视窗口检查与实际已有安装升级仍未验证。
- 验证资料归档状态：完成；七张历史源码图、源码／准备证据、公开产物／运行时／原生观察及分离的产品／证据身份都在上方链接的可下载 ZIP 中。
- 站点同步状态：已部署并核验上方六个双语公开页面、原始 Markdown、导航、搜索索引及发布／下载链接。
- 未验证范围：上述历史、仅源码与受控模型限制；原生可视窗口检查、Finder 安装、实际应用内更新和真实提供方仍未验证。Apple Developer 签名／公证尚不存在，不是通过的检查。

## 交付清单

- [x] 发布标识与版本源符合既有桌面流程。
- [x] 用户说明回答改动、问题、使用位置与最短体验路径。
- [x] 已说明兼容性、私有存储影响、恢复限制与安装验证边界。
- [x] 历史证据记录日期、源码版本、环境、模型类型、步骤、结果与限制。
- [x] 已检查七张截图和复制的机器记录，并区分历史证据与通用插件证据。
- [x] 双语配对、相对链接、图片及本地文档和官网检查通过。
- [x] 公开发布页链接不可变证据 Commit 与已检查的可下载归档。
- [x] 已独立记录公开安装包、校验和、更新归档／签名／清单及隔离启动行为。
- [x] 两种语言的官网只展示已核验的可用状态，并完成线上下载与证据检查。
- [x] 分别报告产品、归档、官网与未验证范围，不移动公开 Tag 或替换安装包。
