# YourBuddy Desktop

[English](README.md) | 中文

这个 Tauri 应用承载现有的 `dsh web` 客户端，并加入包括 Pomodoro 在内的 YourBuddy 产品装配层。默认 Bootstrap DMG 只携带签名 Shell、固定 pnpm Package、组件 Manifest 与桌面 Overlay。不可变 Harness、Node、pnpm Store 与 Harbor Archive 随同一个 Release 发布；单独标注的 Offline DMG Seed 同一组 Archive，不创建第二套 Runtime 布局。

## 运行时布局

| 资源 | 运行时行为 |
|---|---|
| `component-channel` | 两种安装包都内嵌的签名 Release Manifest 与固定 pnpm 11.7.0 Package |
| `component-seeds` | 只在 Offline DMG 中出现的精确 Release Archive，导入共享组件 Cache |
| `YourBuddy/components` | 带 Staging 与 Active State 的签名、内容寻址 Harness、Store、Node 与按需 Harbor 组件 |
| `desktop-overlay` | 通过 `dsh web --patch` 选择 Codex Agent Preset，并注册通知、Codex Subagent Provider、Codex Auth/Search/Image、Better Sidebar、Ego Browser、Context Doctor、Plugin Marketplace、Personal Workbench、Oil Creator 与 Harbor Evolution；Web Bundle 挂载 Pomodoro |
| `YourBuddy/dsh-home` | 隔离保存会话、设置、凭据和 Web Profile |
| `YourBuddy/workspace` | 没有标准 Profile 实例时供 Harbor Workbench 使用的回退根目录 |

产品源码位于 `product/harbor-evolution`、`product/harbor-python`、`product/dsh-codex-auth`、`product/dsh-better-sidebar`、`product/ego-browser`、`product/context-doctor`、`product/plugin-marketplace`、`product/pomodoro`、`product/personal-workbench` 和 `product/oil-creator`。`scripts/bundle-harness-source.mjs` 把九个产品 Cordis Package 与 Harbor Skill 放进裁剪后的 workspace，并将它们和仓库内的 `@deepseek-ai/dsh-subagent-codex` Package 一起加入 CLI 依赖闭包，因此 Host 无需从 Registry 安装即可解析所有默认插件。生成的 Bundle Manifest 会单独记录 Codex Subagent Package 版本与产品 Agent Preset，不把它们混入由外部来源刷新的产品快照。Codex Auth、Better Sidebar、Plugin Marketplace 与 Pomodoro 固定到经过检查的 npm Tarball。Harbor 的 JavaScript 与 Python 快照来自同一个经过检查的 GitHub Release。Ego Browser、Context Doctor 与 Oil Creator 固定到经过检查的 GitHub 分支 Commit；Oil Creator 会先使用其声明的 Package Manager 构建，再冻结 npm Package 的文件选择结果。每个由外部来源刷新的快照都在 `YOURBUDDY_UPSTREAM.json` 中记录不可变来源、完整性 Hash、已提交 Tree Hash、上游许可证、精确版本的 Peer Metadata 覆盖以及经过评审的功能兼容补丁。`scripts/prepare-yourbuddy-runtime.mjs` 把已提交的 Python 快照安装进可迁移资源，也接受 `YOURBUDDY_HARBOR_PYTHON_SOURCE` 用于临时测试本地 Adapter。

## 默认插件交付策略

默认外部插件以经过检查的快照进入冻结 Workspace，不会在应用启动时通过 `dsh plugin add` 下载。如果命令使用用户的 `~/.dsh`，运行时 Git 安装会写入错误的主目录；它还会让冷启动依赖 GitHub 和本机构建，并允许可变分支在没有 YourBuddy 发版的情况下改变应用。内置依赖闭包保留离线启动，并把来源、兼容性 Metadata 与传递依赖解析固定到当前发行版。刷新兼容性会使用 SemVer 预发布排序，把内置 Release Candidate Package 与 Peer Range 进行比较；精确版本的 Metadata 修正仍需在产品更新策略中明确记录。

这种策略会把每个插件的打包文件和共享 Store 条目加入安装包，也让上游更新必须随 YourBuddy 发行。Ego Browser 贡献约 314 KB 的打包载荷，解压后约为 1.2 MB，其中包含按完整性固定的 SDK Runtime，但不含 Chromium 和按需下载的可选 FFmpeg。在 macOS 上，经过评审的兼容补丁会发现标准位置中的原生浏览器，并绕过 Linux X11/Xvfb 路径。每次更新 Ego Browser 或 Harness 都需要刷新来源记录、重新生成 Lockfile、验证兼容性并运行组装后的 Client Smoke。用户自行安装并启用的 Profile Bundle 会优先于名称唯一的内置 Fallback，因此仍可独立更新，但版本选择与兼容性也重新由用户负责。

Bundle Generator 会从随附的 Standard 组成派生一个 ID 为 `codex`、显示名为 **Codex** 的系统 Agent Preset，只启用其中已有的 `subagent_codex` 配置项，并保持其他随附 Preset 不变。桌面 Overlay 将 Codex 设为基础默认值，因此全新 Profile 以及没有显式选择 Preset 的新 Session 可以立即委派；用户明确选择的默认 Preset 仍然优先，已有 Session 继续使用启动时记录的组成。即使用户全局安装了 `codexhost-delegation` skill，Overlay 也会阻止模型自主路由到它，让普通 Codex 委派始终使用 Preset 原生、可追踪的 `subagent_codex` 工具；用户仍可通过显式输入 `/codexhost-delegation` 选择外部路径。加载 Provider 不会启动 Codex 进程。原生委派会在 Session Workspace 内启动 Package 自带的官方 Codex Runtime，并使用原生 Codex 配置和登录状态，而不是把凭据复制到 YourBuddy Settings。

Generator 还会从 Codex 派生 **内容创作** Agent Preset。它保留完整的 Standard 工具集与原生 Codex 委派，并把编码 Persona 换成内容工作台 Persona。Oil Creator 继续作为 Host Plugin 运行，因为同一个 Package 同时拥有 Sidebar、Settings、Remote、模型工具、Skills 与 System Prompt Section；这个 Preset 只专门化 Agent，不会重复挂载 Service。插件内置视频发布、视频转文章与微信公众号草稿 Skills，并提供统一的草稿准备工具；最终发表仍由用户完成。它的 Sidebar 会保留 Personal Workbench 名称、Logo 和桌面窗口控件。Codex 仍是默认 Preset。

桌面 Overlay 将 `danger-full-access`（**完全权限**）设为新 Session 的基础权限 Preset。该 Preset 不限制文件访问，也不会为工具调用请求审批。通用设置中已保存的显式默认值仍然优先，产品基础值不会改写已有 Session。

所有面向 Agent 的 Harbor Tool 都以调用方 Session 的绝对工作目录作为根目录。因此用户在 YourBuddy Session 中选择 `/Users/me/project` 后，初始化和后续由 Agent 创建的 Harbor 产物都会留在该项目内。桌面 Overlay 配置的应用数据 `projectRoot` 只作为全局 Web Workbench／非 Agent 场景的回退；Agent Tool 既不会使用它，也不会因为它与 Session 目录不同而拒绝执行。

Harbor 会在 Job 启动前通过 Host 的 `agentDefaultModel` 与 LLM Service 解析并冻结 Candidate 模型。仅绑定 Loopback 的 Host Broker 随后通过随机的 Job 级 URL 与 Bearer Capability，把这条准确的模型路由开放给 Docker 任务。Python Adapter 会先从容器内执行健康检查，再安装和启动 Candidate；它在 `.harbor-runtime` 下生成临时 Cordis Overlay，只把 Candidate ACP 的模型路由替换为 `yourbuddy-host/<frozen-model>`。原始 Candidate 保持不可变，Codex OAuth 凭据不会进入 Candidate 文件、配置或容器环境。模型绑定属于 Evaluation Context v2，因此更换 Provider、Model、Reasoning Effort、Transport 或 Protocol 后不能复用旧的比较 Baseline。

复用宿主 Node 时会同时检查受支持版本与原生 CPU 架构。YourBuddy 不接管全局 pnpm，而是安装应用内嵌的固定 pnpm Package。Bootstrap 先针对 pnpm 的正常用户 Store 执行冻结生产安装；只有内容缺失才激活签名 Store 组件，并通过显式 Store Path 重复同一个 Offline Install。宿主 Node 不兼容或缺失时同样只激活签名 Node 组件。Harbor 在没有 Python 时仍可发现；出现 `HARBOR_RUNTIME_NOT_READY` 时，错误卡片会就地安装签名 Harbor 组件，单独报告安装失败，并在成功后重新载入 Harbor。

应用会在 Host 进程树内前置其私有的 `dsh`、Node、pnpm 与 Capability Pack Shim。用户点击**启用终端命令**后，稳定的私有 Bin 目录会加入 Shell Profile，不需要全局 npm 安装。显式声明的 Capability Pack 通过同一个已安装 Package 提供其自有入口、Skill、Host/UI Bundle 与版本；协调过程会原子更新自有 Shim、报告外部同名命令冲突、在插件更新失败时保留旧 Package，并在卸载时只删除内容未被用户替换的自有 Shim。仓库 Workspace 与隔离 Web Profile 都设置 `dangerouslyAllowAllBuilds: true`，因此依赖 Lifecycle Script 无需单独经过 pnpm 审批；通用 DSH Profile 保留各自的构建策略。产品插件 Overlay 会按包名复用已激活的标准 Profile Bundle，仅在不存在先前挂载时启用名称唯一的内置 Fallback，因此用户安装的 Bundle 不会产生重复 Loader ID。升级时，原生启动链路会修复这项 Web Profile 策略，只重绑仍指向本应用旧内容寻址 Harness Tree 的 YourBuddy 托管 `link:` 依赖，并在任一操作改变托管状态时执行标准 Profile 安装；Registry 依赖以及 YourBuddy 应用数据目录之外的链接仍归用户所有，且不会被修改。

Plugin Marketplace 只把公开 GitHub `dsh-plugin` Topic 用于发现仓库。打开结果时会搜索 npm；仅当 Package 声明 `dsh.bundle.patch`，且 Metadata 通过 Repository 字段或与 GitHub Owner 同 Scope 的 DSH 上游元数据关联该仓库时才启用一键确认，因此能从同时发布 SDK、CLI 与其他 npm Package 的仓库中选出 DSH Bundle，也能解析 npm 名称不同于仓库 Basename 的 Scoped Package。Metadata 缺失、歧义或不完整时，一键确认保持禁用。用户确认后，安装流程会针对隔离的 Web Profile 执行 `dsh plugin add`，把进度或可操作的 pnpm 失败持续关联到该 Package，并授予安装代码与手动安装 DSH 插件相同的 Host 权限。仓库与 npm 链接使用固定的 iframe 消息协议；Shell 与 Rust Validator 只允许 HTTPS GitHub 仓库、npm 搜索或 npm Package 页面，再由系统浏览器打开。

桌面壳会通过 `dsh web --no-open` 启动私有 Host，并把 Loader 结算后打印的进程 Token URL 作为就绪信号。原生代码在不跟随重定向的情况下完成交换，写入返回的 Cookie，并在创建主 WebView 前丢弃 Token URL。具有原生权限的 Shell 由应用自有的随机 `127.0.0.1` 端口提供，运行时 Capability 只授权该精确 Origin 与 `main` Window。Tauri 为本地产品文档和这一个运行时 Shell 提供稳定的第一方命令入口；应用代码直接分派操作，不再维护产品级命令 ACL，因此新操作不会被过期 Capability 清单阻断。操作系统权限提示、代码签名以及用户主动安装或启用插件的边界仍然有效。Host iframe 不直接获得 Tauri Capability。它的 Origin 虽然不同，仍与 Shell 属于同一个 HTTP Site，因此原有 `HttpOnly; SameSite=Strict` Cookie 在 macOS WebKit 中保持有效。启动 URL 不会进入 Renderer、`boot.log`、面向用户的失败信息或操作系统默认浏览器。无边框主窗口把平台窗口控件投影到展开侧栏的标题行，并紧邻折叠按钮左侧；macOS 使用不带分隔线的横排红黄绿按钮。启动、重载与侧栏收起时，一个小型浮动 Shell 回退入口会继续提供这些动作，而不预留整行或整列。系统托盘仍可用于显示或退出应用。详见[桌面同站点认证说明](../../.agents/notes/implemented/bug-fix/2026-09-06-yourbuddy-desktop-same-site-authentication.zh.md)。

助手 Markdown 继续使用共享 Renderer 的 HTTP(S) 白名单。在桌面产品中，Personal Workbench Client 只拦截其中指向外部的 `_blank` Anchor，并请求父级 Shell 使用操作系统默认浏览器打开。悬停会显示目标地址，链接右键菜单可以打开或复制地址。Shell 只接受当前 Host iframe 从其精确 Origin 发出的固定版本请求；Shell 与 Rust Command 都要求有长度上限、不含凭据的 HTTP(S) URL。相对链接、同源路由、下载、文件引用以及 `javascript:`、`file:`、`data:` 等协议不会进入原生 Opener。

Release 构建读取 Tauri 内置的应用语义版本，并在主窗口打开后一次只执行一项带签名的更新检查。稳定的 `yourbuddy-updater` Manifest 必须声明更高版本，YourBuddy 才会下载内容；检查期限为 15 秒，失败时不改变正在运行的工作台。托盘会显示当前版本，并提供手动检查入口。工作台中的**设置 → 通用设置 → 应用生命周期**提供**检查并更新**、**安装 Harbor 运行时**、**启用终端命令**与**重启 YourBuddy**。Loopback Client 从当前工作台 iframe 发送固定且带版本的生命周期请求，Shell 再把它们映射到稳定的第一方入口。存在更新时，YourBuddy 会展示当前版本和目标版本，再交由 Tauri 验证并安装签名产物。手动重启和成功更新都会先停止私有 Host，再重新启动应用。这些用户操作不会执行本地发布准备或下载插件源码；内置产品插件只会随带签名的 YourBuddy Release 一起升级。

**设置 → 通用设置 → 网络代理**提供应用全局策略，而不是 Codex 专用的 Transport 开关。直连模式会移除环境中原有的代理变量；跟随系统模式通过 `/usr/sbin/scutil` 读取 macOS 固定的 HTTP 与 HTTPS Endpoint；自定义模式要求分别填写不含凭据的 HTTP 与 HTTPS URL，并可补充绕过主机。PAC、自动代理发现与只有 HTTP 的 macOS 配置会返回可操作的错误，因为它们无法被完整 Node 进程树准确复现。原生 reqwest Client 与签名更新器会让 rustls 使用平台验证器，所有应用自有 Node 进程都会收到 `--use-system-ca`。用户还可以通过原生文件选择器选择一个 PEM 编码的 `.pem` 或 `.crt` 企业 CA Bundle；YourBuddy 会校验并规范化该文件、保存其路径、把证书加入原生平台信任，并在创建 Node Host 与插件进程前设置 `NODE_EXTRA_CA_CERTS`。显式 CA Bundle 只补充系统信任，不会关闭证书校验。测试会分别检查桌面草稿链路与正在运行的 Node Host 全局 `fetch`，并独立标注两侧的 HTTP 状态或有界的证书与 Transport 错误码、代理模式及 CA 来源，避免一条链路成功掩盖另一条链路失败；草稿与 Host 当前策略不同时，结果会要求保存、重启并再次测试。保存操作只会调用固定的网络设置 Command，再调用固定的应用重启 Command；重启会先终止并等待私有 Host 退出，重新启动后的 Host、插件、Package 安装、Runtime 预配与签名更新器都会使用同一份解析结果。Loopback 地址始终绕过代理，已经运行的进程则保留上次激活的策略，直到应用重启。

桌面 Overlay 会给工作台页面注入 Content Security Policy 与 `no-referrer` 策略；Tauri 自有的启动页与 Loopback Shell 也配置了 CSP。Shell Server 只接受精确的 Loopback `Host`，以禁止缓存的方式提供三个内嵌资源，并随应用停止。Cordis 客户端插件需要动态求值，因此工作台保留 `unsafe-eval`，同时禁用 Object 与 Base URL 修改。

## 本地发布准备

检查并提交发行输入前，显式执行需要联网的产品刷新：

```sh
pnpm --dir apps/desktop-tauri run prepare:release
```

DSH 策略选择最高的官方正式 Release；仅在没有正式 Release 时回退到最高 RC，并排除 Alpha、Beta、其他预发布版本和 `master`。选中的 Tag 更新时，发布准备要求 Worktree 干净，抓取并验证该 Tag 的精确 Commit，留下未提交的上游 Merge 供评审，把来源写入 `product/DSH_UPSTREAM.json`，并在兼容性检查前重新绑定经过批准的产品 Peer Metadata。其余刷新策略会查询 npm 上 Codex Auth、Better Sidebar、Plugin Marketplace 与 Pomodoro 的最新稳定版、Harbor 最新稳定 GitHub Release 中配套的 Cordis 插件与 Python Adapter，以及 Context Doctor 的 `main` 分支 Head。Personal Workbench 是第一方插件，只同步选中的 DSH Peer 版本。GitHub API 读取会优先使用 `GITHUB_TOKEN` 或 `GH_TOKEN`，其次复用已有的 `gh auth` 登录；凭据不会写入来源记录。命令不会向后搜索较旧的兼容 Release；如果选中的候选不兼容，流程会失败，以便评审并调整策略或代码。只有 `product/plugin-update-policy.json` 明确列出上游精确版本时，流程才接受 Peer Metadata 覆盖；功能兼容补丁必须明确写入来源记录，并持续通过完整发布 Smoke。

任何受管理路径被复制或删除前，流程都会先验证策略：Destination 必须位于 `product/` 内，Source Path 必须位于下载的 Checkout 内，受管理路径必须唯一且互不重叠。所有归档都必须使用 HTTPS，并通过压缩与展开字节上限、Entry 数量上限和安全解压；npm 产物必须匹配 Registry SRI，每个归档都会记录绑定 Digest 的来源信息。整组候选会留在临时目录中，直到全部通过 Package Identity、受管理 Node 版本、DSH Peer、Bundle Patch、Host Entry、Client Entry 与 Injection、许可证和 Tree 检查。然后命令才会以一次操作替换受管理快照、使用与 Tag CI 相同的显式 Client 环境重新构建 Harness、重新生成 `product/harness-pnpm-lock.yaml`，并证明 Lockfile 与已安装 Tree 中每个产品 DSH/Cordis Peer 都指向内置 workspace，而不是第二份 Runtime。随后流程会准备绑定 Digest 的离线 Store，并执行真实的 `--prod --frozen-lockfile --offline` 安装。由于产品已经独立固定 pnpm 归档并校验 Store 与 Bundle Digest，发布验收和原生首次启动会禁止 pnpm 自动切换版本，并信任已提交的 Lockfile。Harbor 命令与完整 Host 会在已清除凭据的环境以及临时 Home、DSH 与临时目录中运行。Headless Chromium 必须收到九个产品 Client Bundle，让每个 Client Loader Entry 在没有 Page Error 或 Console Error 的情况下激活并挂载工作台，显示 Codex 作为默认 Agent Preset，显示 Plugin Marketplace 导航项，通过悬停、右键复制与系统浏览器命令验收安全助手链接的 DOM 约定，执行网络代理草稿测试与保存重启控件，显示应用生命周期中的更新与重启控件，在仓库只有非 DSH npm Package 时拒绝启用一键安装，在忽略同仓库 SDK Package 的同时选出名称不同的 Scoped DSH Bundle，只调用受限的通用与 Marketplace 外链、网络设置、签名更新与应用重启命令、启用安装确认，并渲染与 Package 关联的持久化失败；同一 Smoke 还会请求 Context Doctor API，并要求 Host 正常关闭。后续任何步骤失败都会还原所有受管理快照与产品 Lockfile。

默认要求受管理的产品路径保持干净。只有开发者已经检查准备由事务保留或替换的本地产品修改时，才显式使用 `pnpm --dir apps/desktop-tauri run prepare:release -- --allow-dirty`；它绝不会允许在脏 Worktree 中合并上游 DSH。成功后，DSH Merge、刷新的快照与 Lockfile 会留给人工检查并提交；`DSH_UPSTREAM.json` 记录官方 DSH Tag 与 Commit，每个 `YOURBUDDY_UPSTREAM.json` 记录外部组件的精确 Revision、归档 Hash 与 Tree Hash，生成的 `.bundle-manifest.json` 则记录这些输入与整个 Bundle 的 Hash。后续任何准备步骤失败都会中止由该流程创建的 DSH Merge，并还原受管理的产品输入。

如需仅刷新一个外部产品来源而不推进无关快照，请传入其策略 ID，例如 `pnpm --dir apps/desktop-tauri run refresh:product-plugins -- --only=harbor-evolution`。

Tag CI、普通 `prepare:dist` 与 `build` 命令都不会修改或重新解析上游输入。Tag 流水线只消费该 Tag 已提交的快照与冻结 Lockfile。手工 Workflow Dispatch 只用于在失败后重试尚未发布的已有 Tag。若该 Tag 已经存在 GitHub Release，流水线会拒绝继续，因此修正已发布字节时必须发布新版本，不能替换安装包。

在干净的 `master` 上运行 `pnpm release:yourbuddy:prepare -- X.Y.Z`，会在不联网的情况下更新全部桌面版本源、创建双语发布归档和索引条目、记录配对文件，并写入发布说明草稿。替换全部自动生成的 `TODO`，重新记录变更配对，检查并提交。随后，`pnpm release:yourbuddy -- X.Y.Z` 只校验已提交的版本归档与 Git 状态，不重复测试、产品刷新、文档检查或官网构建。它要求 `master` 能快进 `origin/master`，拒绝已有远端 Tag，只创建或复用指向同一 Commit 的 Annotated Tag，并原子推送分支与 Tag。桌面产物仍只由 Tag Workflow 发布。

## 发布文档与官网

每次发布使用 [dsh-doc](../../.agents/skills/dsh-doc/SKILL.md)准备[版本归档](../../docs/releases/README.zh.md)。产品官网的下载页和发行页使用 GitHub 稳定的 `releases/latest` 与 Release 历史 URL，因此普通桌面发布不需要后续修改或部署官网。只有产品指南或其他站点内容发生变化时才更新并部署官网。

## 命令

在仓库根目录执行：

```sh
pnpm install --frozen-lockfile
DSH_CLIENT_TITLE=YourBuddy pnpm run build
pnpm --dir apps/desktop-tauri run test:bundle
pnpm --dir apps/desktop-tauri run test:offline
pnpm --dir apps/desktop-tauri run test:overlay
pnpm --dir apps/desktop-tauri run test:update-manifest
pnpm --dir apps/desktop-tauri run test:release-version
pnpm --dir apps/desktop-tauri run sync:dsh -- --dry-run
pnpm --dir apps/desktop-tauri run prepare:release
pnpm --dir apps/desktop-tauri run prepare:product-runtime
pnpm --dir apps/desktop-tauri run build
pnpm release:yourbuddy:prepare -- X.Y.Z
pnpm release:yourbuddy -- X.Y.Z
```

当前目标固定为 `aarch64-apple-darwin`；发布流水线有意不包含 Windows、Intel macOS 或 Linux 矩阵。

macOS arm64 发布流水线会校验 Tag 与所有桌面版本真源的一致性，构建并签署一份组件 Manifest，再用同一组件集合生成 Bootstrap 与 Offline DMG，并随 Size Report 发布组件 Archive。Bootstrap DMG 超过 30,000,000 字节，或包含 Harness Tree、Node Archive、pnpm Store、Harbor Runtime、Offline Seed 时会直接拒绝发布。`latest.json` 只指向 Bootstrap Updater Payload。流水线还会搬移公开 Harbor 组件并运行两个 Entry Point，随后才为全部制品计算校验和并发布。
