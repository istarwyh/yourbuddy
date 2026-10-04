---
description: "YourBuddy 小型 Bootstrap DMG、可复用运行时组件、按需 Harbor 激活与单 Tag 发布的完整技术方案。"
---

# YourBuddy Bootstrap 发布方案

[English](bootstrap-release-plan.md) | 中文

## 摘要

YourBuddy 将小型 Bootstrap DMG 作为默认 macOS 下载，同时保留单独标注的 Offline DMG 供离线安装。Bootstrap 应用包含已签名的 Tauri Shell、引导界面、桌面 Overlay、固定 pnpm 可执行文件、组件 Manifest 和更新配置；它不包含离线 pnpm Store、Node Archive、Harness Tree 或 Harbor Python Runtime。

原生组件管理器把 Release 中指定的精确组件解析到按内容寻址的应用数据目录。它在下载缺失组件之前复用兼容的 Host Node 和完整的本地 pnpm Store。普通工作不会下载 Harbor；首次 Harbor 操作通过用户可见且可取消的流程安装固定 Harbor 组件，然后用已经安装的 Runtime 重试原操作。

本文定义一次完整发布交付。Bootstrap 发布、Offline 发布、组件生成、Runtime 激活、迁移、Updater 行为、Release 证据和用户文档在同一个 Release 中落地；任何部分都不推迟到后续打包阶段。

状态：2026-10-01 采纳为 0.4.0 交付的实施约定。发布验收把 30,000,000 字节作为 Bootstrap DMG 的含上限。

## 目录

- [测量基线](#baseline)
- [交付结果](#outcome)
- [Release 制品](#artifacts)
- [组件 Manifest](#manifest)
- [Bootstrap 与依赖安装](#bootstrap)
- [按需 Harbor Runtime](#harbor)
- [组件存储与生命周期](#storage)
- [更新与 Offline 安装](#updates)
- [失败与恢复](#recovery)
- [代码职责与改动](#changes)
- [Release Workflow](#workflow)
- [验证与验收](#verification)
- [单次交付实施顺序](#order)
- [文档与运维](#operations)
- [Dev Note](#dev-note)

<a id="baseline"></a>
## 测量基线

当前检出的 0.3.23 准备目录包含以下未压缩资源。这些测量用于解释设计；Release 验收记录实现实际产出的体积，不把这些数值当成永久限制。

| 资源 | 测量体积 | 主要内容 |
|---|---:|---|
| `bundled/harness` | 636 MB | 412 MB 压缩离线 pnpm Store、200 MB Package 制品、21 MB 应用制品、Lockfile 与元数据 |
| `bundled/toolchain` | 50 MB | 46 MB Node Archive 与 4.4 MB pnpm Archive |
| `bundled/yourbuddy-runtime` | 301 MB | 85 MB Portable CPython 与 216 MB Harbor Virtual Environment |

Harbor Package 本身约 8.8 MB，DSH Adapter 约 1.4 MB。最大的 Python 依赖是约 85 MB 的 LiteLLM；它的通用 Provider 支持带入 botocore、tokenizers、Hugging Face Library、原生扩展、Proxy 资源和 Provider 元数据。Portable Python Tree 还保留 Tcl/Tk、Header、ensurepip、pip、源文件和编译字节码。Harness Tree 保留约 68 MB Source Map。

当前应用在运行时已经复用兼容的 Host Node，但每个 DMG 仍然传输 Node Archive、固定 pnpm、离线 Store 和 Harbor Runtime。首次启动成功后还会展开 Store，并在应用数据目录构建另一份 `node_modules` Tree。因此，即使机器已有兼容工具或 Package 内容，下载和安装磁盘成本仍然存在。

<a id="outcome"></a>
## 交付结果

Release 使用一个已签名应用身份，提供两种安装体验。

| 体验 | 使用场景 | 安装包内容 | 网络要求 |
|---|---|---|---|
| Bootstrap DMG | 默认下载 | Shell、引导界面、固定 pnpm、Manifest、Overlay、图标和声音 | 仅缺少 Release 组件时需要网络 |
| Offline DMG | 离线或受控环境安装 | Bootstrap 应用以及与 Release 匹配的组件 Seed Archive | 首次启动不需要网络 |

两种安装最终产生相同的活跃组件身份和 Host 命令行。Offline DMG 向 Bootstrap 下载所用的同一 Cache 写入 Seed，不安装第二套 Runtime 布局。自动更新安装 Offline 应用 Archive，确保更新后的应用在重启前已包含该 Release 的全部 Seed。

只有以下行为在同一版本中全部交付，Bootstrap DMG 才算完成：

- 应用可在干净机器上从原生引导界面启动，无需现有 DSH 进程。
- 复用兼容 Host Node 和完整 pnpm Package 内容，但不采用全局 pnpm 可执行文件或任意 `node_modules` Tree。
- 缺失的核心组件遵循应用网络策略下载并原子安装。
- Harbor 在不要求普通启动安装 Python Runtime 的情况下仍作为可用产品能力出现。
- 首次 Harbor 使用展示下载大小和进度，支持取消和重试，并在安装完成后激活原请求操作。
- 组件更新失败不会改变上一个可启动 Harness 和 Harbor 组件。
- 一个 Tag 发布 Bootstrap、Offline、组件制品、Hash、签名、Manifest、Release Notes 和 Updater Manifest。

<a id="artifacts"></a>
## Release 制品

Tag Workflow 发布以下不可变制品。文件名在方便人工识别处包含应用版本，在 Cache 身份需要时包含 Digest 或组件版本。

| 制品 | 用途 |
|---|---|
| `yourbuddy-<version>-bootstrap-macos-arm64.dmg` | 默认交互式安装包 |
| `yourbuddy-<version>-bootstrap-macos-arm64.app.tar.gz` 与 `.sig` | 已签名 Bootstrap 应用 Archive；不进入更新频道 |
| `yourbuddy-<version>-offline-macos-arm64.dmg` | Bootstrap 应用以及全部 Release Seed 组件 |
| `yourbuddy-<version>-offline-macos-arm64.app.tar.gz` 与 `.sig` | 包含全部 Release Seed 组件的已签名自动更新 Payload |
| `yourbuddy-components-<version>.json` 与 `.sig` | 已签名组件选择和下载元数据 |
| `yourbuddy-harness-<bundle-id>-macos-arm64.tar.zst` | 不含 `node_modules` 和 Source Map 的已裁剪、已构建 Harness 与产品插件 Tree |
| `yourbuddy-pnpm-store-<lock-id>-macos-arm64.tar.zst` | 本机缺少完整 Package 内容时使用的精确生产 Store Fallback |
| `yourbuddy-node-<node-version>-darwin-arm64.tar.zst` | Host Node 不兼容或缺失时使用的固定 Node Fallback |
| `yourbuddy-harbor-<runtime-id>-darwin-arm64.tar.zst` | 可搬移 Python 与 Harbor Runtime |
| `yourbuddy-debug-<version>.tar.zst` | 可选 Harness Source Map 与原生诊断文件，不进入 Runtime 组件 |
| `SHA256SUMS.txt` | 全部公开 Release 制品的 Hash |
| `latest.json` | 只指向 Offline Updater Payload 的稳定更新 Manifest |

固定 pnpm Archive 保留在 Bootstrap 应用内，因为它很小并负责 Store Format 和安装行为。YourBuddy 从不采用全局 pnpm 可执行文件。组件管理器可以使用固定 pnpm 为当前用户正常解析出的 Store 目录，但只调用内置 pnpm，也只安装已提交的生产 Lockfile。

GitHub Release 把 Bootstrap DMG 标为默认下载，并用较大体积和离线用途标注 Offline DMG。稳定网站下载链接继续指向 Latest Release；Release 页面和产品下载页必须区分两个文件名，不能展示两个没有标签的 DMG。

<a id="manifest"></a>
## 组件 Manifest

`yourbuddy-components-<version>.json` 是该 Release 唯一的组件选择来源。应用内嵌预期 Manifest URL、Manifest 签名、Release Tag 和签名公钥。Updater Payload 和两个 DMG 使用相同值。

```json
{
  "schemaVersion": 1,
  "appVersion": "0.4.0",
  "releaseTag": "yourbuddy-v0.4.0",
  "platform": "darwin",
  "arch": "arm64",
  "components": {
    "harness": {
      "id": "sha256:<bundle-id>",
      "archive": "yourbuddy-harness-<bundle-id>-macos-arm64.tar.zst",
      "sha256": "<archive-sha256>",
      "bytes": 0,
      "activation": "startup"
    },
    "pnpmStore": {
      "id": "sha256:<lock-id>",
      "archive": "yourbuddy-pnpm-store-<lock-id>-macos-arm64.tar.zst",
      "sha256": "<archive-sha256>",
      "bytes": 0,
      "activation": "startup-fallback"
    },
    "node": {
      "id": "node:22.19.0:darwin-arm64",
      "archive": "yourbuddy-node-22.19.0-darwin-arm64.tar.zst",
      "sha256": "<archive-sha256>",
      "bytes": 0,
      "activation": "startup-fallback"
    },
    "harbor": {
      "id": "sha256:<runtime-id>",
      "archive": "yourbuddy-harbor-<runtime-id>-darwin-arm64.tar.zst",
      "sha256": "<archive-sha256>",
      "bytes": 0,
      "activation": "on-demand"
    }
  }
}
```

Manifest Parser 只接受支持的 Schema Version、当前 Platform 与 Architecture、根据 `releaseTag` 和 `archive` 推导的固定 HTTPS GitHub Release Asset URL、非负字节数和 SHA-256 Digest。Archive 解压保留现有 Entry Count、展开字节、Path Containment 和 Symlink 规则。完成这些 Wire 与 Filesystem 检查后，组件管理器信任第一方 Manifest 字段；它不重复 Release 生成过程已经完成的 Package 级校验。

Release Script 在所有 Archive 存在后生成 Manifest，使用现有 Updater 签名身份签署其精确字节，把签名器输出转换为原生验证器直接消费的原始 minisign 文档，并在打包前用该验证器检查暂存的 `components.json` 与 `components.json.sig`。它重新生成 `SHA256SUMS.txt`，并在任何 Manifest Size 或 Digest 与暂存制品不同时拒绝发布。公开制品发布后不可变；修正使用新的应用版本和 Tag。

<a id="bootstrap"></a>
## Bootstrap 与依赖安装

原生 Splash 扩展为完整引导界面。它可展示所需下载、当前组件、已传输与总字节数、安装活动、网络错误、重试、取消和 `boot.log` 位置。它在任何组件请求前读取保存的 Direct/System/Custom Proxy 与企业 CA 策略；没有已保存策略时使用当前系统策略，并在不启动 Node Host 的情况下提供现有网络设置输入。

启动按以下顺序执行：

1. 获取应用级组件锁并读取内嵌 Release 坐标。
2. 复用 id 与 Manifest 相同的已完成 Harness 组件；否则下载 Harness Archive 并安装到 Staging。
3. 用现有版本和 CPU 检查扫描应用管理路径与 Host Node 路径。复用兼容 Host Node；否则安装 Manifest 指定的 Node 组件。
4. 在全新 Staging Harness Tree 中调用内置 pnpm，使用其正常用户 Store 路径执行 `--prod --frozen-lockfile --offline --trust-lockfile`。成功表示机器已有全部所需 Package，不下载 Store 组件。
5. 如果 Offline Install 报告 Package 内容缺失，丢弃部分 `node_modules`，把 Manifest 指定的 pnpm Store 安装到 YourBuddy 自有的内容寻址 Store 目录，并用 `--store-dir` 指向该目录重复完全相同的 Offline Install。
6. 对 Staging 执行现有 CLI Entry 与组装 Host 检查。仅在全部检查通过后写入 Runtime Manifest，并原子激活 Harness 目录。
7. 通过现有私有 Node Process Tree 启动 `dsh web --no-open`，继续使用不变的鉴权 Workbench 交换。

首次 Offline 尝试是能力检查，不是向用户显示的错误。选定 Fallback 后出现的鉴权、Proxy、Certificate、HTTP、Digest、解压、磁盘和安装失败会终止该次尝试，并提供可见重试操作。取消会停止网络与子进程工作、移除 Staging 数据，并保留此前活跃 Runtime。

Harness 组件生成器移除 Runtime 不需要的 Source Map，并把它们发布到 Debug Archive。它保留生产 Lockfile、Raw/Web Resolver Manifest 所需的全部 `lib/`、Package Manifest、License、Patch、Native Package、Web Asset、产品 Snapshot、Skill 和 Loader Dependency。Clean-tree Assembly Test 必须拒绝移除任何已构建启动过程或 Plugin Loader 会读取的文件。

<a id="harbor"></a>
## 按需 Harbor Runtime

桌面端启动时不再从 Tauri Resource 解析 `yourbuddy-runtime`。产品 Overlay 向 Harbor 配置组件 id 和小型 YourBuddy 组件 Helper 的绝对路径，不再配置固定 `harbor` 与 `harbor-dsh` 可执行文件路径。

Tauri 可执行文件提供只供应用自有 Host 进程调用的 Headless Component-helper Mode。Helper 接受字面量组件名，读取内嵌 Channel 坐标，复用 Bootstrap 的组件锁与网络策略，在 stdout 输出有界 JSON 进度，并返回已激活组件根目录。它不接受任意 URL、Archive Path、Command 或 Destination。

Harbor Node Plugin 增加一个 Runtime Provider，拥有共享的 `ensureHarborRuntime()` Promise。Harbor View 可以读取组件状态而不启动安装。以下操作在启动 Python 前调用 Provider：

- 打开需要实时 Harbor 数据的 Harbor Workbench 操作；
- 从 Agent Tool 调用 `harbor` 或 `harbor-dsh`；
- 启动 Evaluation、Initialization、Diagnostics 或 Historical-generation 工作；
- 在 Harbor Settings 中执行显式的 **Install Harbor runtime** 操作。

首次交互操作展示 Archive 大小并要求用户安装。确认后，全部并发调用者观察同一次安装和进度。取消使 Harbor 回到 `not-installed`；重试启动新的 Staging 尝试。安装成功后解析组件 Manifest 中的两个 Entry Point，运行搬移后的 `harbor --version` 和 `harbor-dsh --help` Smoke，发布 `ready`，并继续触发安装的 UI 操作。Agent Tool 不会启动未经确认的后台下载；它返回 `HARBOR_RUNTIME_NOT_READY` 和所需用户操作，该失败通过普通 Tool Result 保持模型可见。

Harbor 的 Node Plugin、Client UI、Skill 和配置继续位于 Harness 组件内，因此用户可在安装 Python 之前发现能力和阅读指南。Python 组件不包含用户 Project、Job、Credential、Model Route 或可变 Harbor 数据；这些数据继续位于所选 Workspace 和现有 YourBuddy 数据根目录。

同一次交付还会缩减 Harbor 组件的安装字节。Harbor 上游为 Host-broker/OpenAI-compatible 路径提供独立 Runtime Dependency Set，不再强制完整 LiteLLM Provider 与 Proxy Feature。Release 安装该集合，并排除未使用的 Proxy UI、Swagger Snapshot、Provider Extra、开发 Header、Tcl/Tk、idle、ensurepip、pip、Test、Cache 和重复 Source/Bytecode 表示。可搬移可执行文件 Smoke 与代表性 Evaluation 验收决定可删除内容；打包脚本不能仅因 Size Scan 把已安装模块标为较大就将其删除。

<a id="storage"></a>
## 组件存储与生命周期

全部可变组件状态位于现有 YourBuddy 应用数据根目录下。

```text
components/
  manifests/<app-version>/components.json
  harness/<bundle-id>/
  stores/<lock-id>/
  node/<node-version>-darwin-arm64/
  harbor/<runtime-id>/
  downloads/<asset>.partial
  staging/<operation-id>/
  active.json
  component.lock
```

`active.json` 记录活跃 id、解析后的 Host Node Path、Harness CLI Entry、Harbor 状态和最后成功的 Manifest Version。它不包含 Credential 或带 Credential 的 URL。只有 Archive Digest、解压、组件 Manifest、可执行文件存在性和组件 Smoke 全部完成后，目录才有资格激活。

下载使用 `.partial` 文件，记录预期 Digest、字节数、URL、ETag 和已传输长度。仅当 Server 确认相同 ETag 与 Range 时，重试才执行 HTTP Range 续传；否则删除 Partial File 并重新开始。解压发生在 `staging` 下；激活使用同一 Volume Rename。应用绝不原地编辑活跃组件。

垃圾回收保留活跃组件、每种类型一个 Last-known-good 组件，以及运行中 Host 或进行中操作引用的所有组件。它在成功启动后移除更旧且未引用的目录，不在下载或恢复期间删除。Offline Seed Importer 复用同一 Staging 与激活函数，不覆盖相同的已完成组件。

组件 Cache 跨应用版本共享，但不跨 macOS 用户共享。它不使用项目本地 `node_modules`、Python Environment、Shell Profile 或另一个 DSH Home。固定 pnpm 只能通过一次成功的 Frozen Offline Install 复用正常 Per-user Store 内容；它绝不从任意现有 `node_modules` Tree 解析应用 Package。

<a id="updates"></a>
## 更新与 Offline 安装

`latest.json` 指向 Offline Updater Archive。更新会用包含全部 Release Seed 的已签名应用 Bundle 替换原 Bundle；组件 Cache 保留在应用数据中。更新后首次启动时，新内嵌组件 Manifest 选择精确组件 id，并在 Host 启动前从内置 Seed 安装缺失的必需组件。Harbor 仍推迟到首次使用时激活，但无需后续下载即可取得该 Release 的 Seed。

Offline DMG 和 Offline Updater Archive 都在专用 Tauri Resource 目录中包含 Seed Archive 与已签名组件 Manifest。二者都向同一 Cache 导入 Seed，然后在无需网络的情况下走普通 Bootstrap 路径。安装后的应用身份和 Updater 配置与 Bootstrap 相同。

现有自包含 YourBuddy 安装可通过 Offline Updater Archive 直接升级。现有 `harness-versions`、Managed Node、DSH Home、Session、Settings、Credential 和 Workspace 保持原位。Bootstrap Resolver 识别 Bundle Digest 与新 Manifest 匹配的可启动 Harness Tree，并在不复制的情况下登记。发生变化的组件和延迟激活的 Harbor Runtime 都可从更新后应用的 Seed 取得，无需网络。

Bootstrap 与 Offline 使用相同 Bundle Identifier、数据根目录、Session Format 和 Updater Channel。它们是发行选择，不是不同 Edition、Feature Tier 或 License State。

<a id="recovery"></a>
## 失败与恢复

| 失败 | 用户可见结果 | 恢复方式 |
|---|---|---|
| Manifest 不可用但必需组件已有 Cache | 用最后一次成功签名 Manifest 选择的 Cached Component 启动 | 启动后重试 Manifest 刷新 |
| Manifest 不可用且没有必需组件 Cache | Bootstrap 展示网络失败，不启动不完整 Host | 修改网络设置、重试或安装 Offline DMG |
| 下载取消或中断 | 仅在存在安全续传元数据时保留 `.partial`；活跃组件不变 | 从 Bootstrap 续传或重新开始 |
| Digest、签名或 Archive 检查失败 | 拒绝 Staging 并指出失败制品 | 公开制品错误时发布新版本；只有本地损坏时重试 |
| 磁盘不足 | 解压前展示所需和可用字节 | 释放空间；只有产品以后明确支持时才可选择其他 Volume 进行 Offline 安装 |
| Frozen Install 无法使用 Host Store | 选择 Release pnpm Store 组件，不把 Miss 当作损坏 | 下载或导入 Store 后重试 Offline Install |
| 新 Harness Smoke 失败 | 有可用 Last-known-good Harness 时保留并启动；把新组件标为失败 | 报告诊断并等待新 Release |
| Harbor 安装失败 | 普通 YourBuddy 仍可使用；Harbor 展示失败状态和重试 | 修正网络或磁盘问题后重试 |
| 更新安装成功但组件激活失败 | 与新应用兼容时启动 Last-known-good 必需组件；否则留在 Bootstrap | 安装匹配的 Offline DMG 或已修正的新版本 |

应用绝不静默切换到 Registry Version、不同 Harbor Runtime、网络选择的旧 Manifest 或用户 Python Environment。恢复只能复用本地记录的已完成组件和现有可启动 Harness Tree。诊断报告 Component id、Release Tag、Path、Byte Count 和 Failure Category，不包含 Credential、Proxy Password、Session Content 或带签名下载 Query Parameter。

<a id="changes"></a>
## 代码职责与改动

| Owner | 必需改动 |
|---|---|
| [`src-tauri/src/runtime/provision.rs`](../../../apps/desktop-tauri/src-tauri/src/runtime/provision.rs) | 把 Provisioning 拆分为组件解析、Node 选择、Store 复用/Fallback、Staged Frozen Install、激活和恢复，同时保留唯一 Startup State Owner |
| `src-tauri/src/runtime/components/` | 新增 Manifest Type、Signed-manifest Loader、Downloader、可续传 Partial、Archive 解压、Component Lock、激活、Seed Import、垃圾回收和 Helper-mode Output |
| [`src-tauri/src/product.rs`](../../../apps/desktop-tauri/src-tauri/src/product.rs) | 用组件身份和状态替换强制 Bundled Harbor Resolution；只在激活后解析可执行文件路径 |
| [`src-tauri/src/overlay.rs`](../../../apps/desktop-tauri/src-tauri/src/overlay.rs) | 传入 Component Helper 与 Harbor Component id，不再传应用 Resource 可执行文件路径 |
| 原生 Bootstrap UI 与 Locale Dictionary | 新增下载决策、组件进度、取消、重试、网络设置恢复、Offline 状态和磁盘诊断 |
| Harbor Evolution 产品插件 | 新增共享 Runtime Provider、状态/安装 UI、显式安装操作、Tool-not-ready Result、激活重试和 Entry-point Resolution |
| [`bundle-harness-source.mjs`](../../../apps/desktop-tauri/scripts/bundle-harness-source.mjs) | 生成不带 Source Map 的 Harness 组件和可选 Debug Archive，并保持精确 Runtime File Ownership |
| Packaging Script | 生成压缩组件、确定性 Manifest、签名、Offline Seed、两种 Tauri Resource Config、Size Report 和 Release Notes |
| [`desktop-release.yml`](../../../.github/workflows/desktop-release.yml) | 一次构建组件，构建 Bootstrap 与 Offline DMG，校验两种应用 Archive，发布完整制品集，并只把 Offline 提升到 `latest.json` |
| Desktop README 与产品指南 | 描述安装选择、首次启动网络和磁盘行为、Harbor 安装、Cache 清理、Proxy/CA 恢复和 Offline 使用 |

组件管理器继续由 Desktop 拥有，因为它必须在 Node Host 之前运行。Harbor 专属 Readiness 继续由 Harbor 产品插件拥有，因为只有该插件知道哪些操作需要 Python 以及如何展示状态。Component Helper 是两个 Owner 之间的狭窄 Process Interface；双方都不重复 Download 或 Activation Logic。

实现会在同一次改动中更新 `ProductRuntime` 和 Overlay 的全部 Consumer。它不增加第二个桌面 Launcher、替代 DSH Home、直接 Package Bin 或 Public SDK Argument Escape。

<a id="workflow"></a>
## Release Workflow

Tag Workflow 在一个 Job 中执行以下操作；如果独立 Build Job 通过 GitHub Actions 传递组件制品，则必须在应用签名前固定其 Hash：

1. 校验 Release Tag 与全部 Version Source，并拒绝已存在的 GitHub Release。
2. 安装 Workspace Dependency，从 Tag Source 构建 Harness。
3. 生成裁剪 Harness Archive、生产 Store Archive、Node Fallback Archive、最小 Harbor Archive 和 Debug Archive。
4. 运行 Archive-local Smoke，计算 id、Size 和 SHA-256，并生成组件 Manifest。
5. 使用桌面 Updater 使用的 Release 签名身份签署 Manifest 与组件 Archive。
6. 仅使用 Bootstrap Resource 构建 Bootstrap App、Updater Archive 和 DMG。
7. 从相同 App Source 加上精确 Seed Archive 构建 Offline DMG 和 Updater Archive。
8. 执行 Clean Bootstrap、Store 复用、Node Fallback、Harbor 未安装、首次 Harbor 安装、搬移 Harbor 和 Offline No-network 路径。
9. 暂存全部制品，重新生成 `SHA256SUMS.txt`，检查每个 Hash 与签名，并只为 Offline Updater 生成 `latest.json`。
10. 创建一个 GitHub Release，在 Release Notes 中把 Bootstrap 标为主要下载，上传稳定 Updater Manifest，并保持全部字节不可变。

Workflow 输出机器可读 Size Report，包含每个组件和两个 DMG 的压缩与展开字节。Release Archive 记录该 Report，不在 Standing Documentation 中复制手工维护的 Size Table。

现有 `pnpm release:yourbuddy -- X.Y.Z` Entry 仍是唯一 Tag Publisher。本地准备更新两种发行说明和 Component Schema Release Notes，但不上传组件。失败的 Tag Workflow 只能重试同一个未发布 Tag；已发布修正必须使用新版本。

<a id="verification"></a>
## 验证与验收

聚焦 Unit 与 Integration Coverage 负责确定性组件行为：

- Manifest Parsing、Platform Selection、派生 Asset URL、签名和 Digest 失败；
- Partial Download Resume、ETag 不匹配重启、取消、Proxy 与 Enterprise CA 应用；
- Archive Path 与 Expanded-size Limit、Staging Cleanup、Same-volume Activation 和并发 Component Lock；
- 兼容 Host Node 复用和不兼容 Node Component Fallback；
- 从已有完整 User Store 成功 Frozen Install，且不下载 Store Component；
- Store Miss 后下载 Release Store 并成功 Offline Install；
- Last-known-good Harness 恢复，以及保留活跃进程引用的 Garbage Collection；
- Harbor 未安装时的状态、共享并发安装、取消/重试、Tool-not-ready Result、搬移 Entry Point，以及不下载 Harbor 的普通 Chat；
- 下载 Updater Payload 后禁用网络，验证任一安装来源都能导入 Offline Seed 并完成自动更新。

Packaged Acceptance 使用真实 Signed-candidate Layout，而不是 Source-only Mock：

| 场景 | 必需观察结果 |
|---|---|
| Clean Bootstrap | DMG 排除全部四类重量级 Resource，下载必需启动组件并打开 Workbench |
| Warm Bootstrap | 第二次启动不下载组件，并启动相同 Component id |
| 已有依赖 | 完整固定 pnpm Store 内容的机器既不下载 Store 也不下载 Node，并产出可启动 Harness |
| 缺失依赖 | Store Fallback 只下载一次、保持 Cache，并支持下一次 Harness Install |
| 普通任务 | 用户完成普通任务而不下载 Harbor |
| 首次 Harbor 使用 | UI 披露字节，取消有效，重试成功，搬移 Smoke 后原操作继续 |
| Offline 安装 | 禁用出站网络时，Seed Import 打开 Workbench 且 Harbor 可运行 |
| 中断更新 | 旧 Harness 保持可启动，没有 Staging Directory 变成 Active |
| 公开 Release | 匿名下载与 `SHA256SUMS.txt` 一致；Manifest URL、签名、Updater Metadata、Tag Commit 和 Release Notes 一致 |

出现以下任一情况即验收失败：Bootstrap 应用包含 `yourbuddy-pnpm-store`、Node Archive、`harness-source` 或 `yourbuddy-runtime`；Offline Updater 缺少任一 Release Seed；普通启动激活 Harbor；Store Miss 回退到可变 Dependency Resolution；`latest.json` 指向 Bootstrap Payload；或两个安装包为同一 Tag 产出不同的 Active Component Set。

运行相关 Desktop Script Test、Rust Test、Product Release Smoke、Build Check、Documentation Check 和上述 Packaged Scenario。根据[测试策略](../../testing.zh.md)选择最小源码覆盖，并保留 Packaged Test，因为组件正确性取决于最终 Resource Layout、Signature、Relocation 和 Public URL。

<a id="order"></a>
## 单次交付实施顺序

此顺序是一个实现依赖图，不是分阶段产品发布。在每一行完成前，Release 都不具备发布资格。

| 顺序 | 交付物 | 完成条件 |
|---:|---|---|
| 1 | 组件格式与 Builder | 确定性 Harness、Store、Node、Harbor 和 Debug Archive 产出稳定 id、Manifest 与 Size Report |
| 2 | 原生组件管理器 | 启动组件支持 Cache 复用、网络策略、取消、激活、Fallback 和清理 |
| 3 | Bootstrap Resource 配置 | 已签名 Bootstrap App 与 Archive 排除重量级 Resource，并通过下载或 Cached Component 启动 |
| 4 | Harbor 按需集成 | 无 Python 时仍可发现；显式安装、Tool 行为、进度、取消和重试复用共享 Manager |
| 5 | Offline Seed 配置 | Offline DMG 导入精确 Release Component，并在禁用网络时工作 |
| 6 | Updater 与迁移 | Offline 是稳定 Updater Payload；现有数据和 Cached Harness 在直接升级中保留 |
| 7 | CI 与 Release 发布 | 一个 Tag 构建、检查并发布全部制品以及公开 Hash、签名和 Updater Metadata |
| 8 | 产品文档 | 下载选择、网络/磁盘要求、Harbor 激活、恢复和 Cache 行为双语且已上线 |

实现可以使用独立 Commit 或依赖 PR，但公开 Release 包含完整集合。只有源码组件管理器、未发布 Offline 路径或仍然阻塞启动的 Harbor 均不满足本方案。

<a id="operations"></a>
## 文档与运维

更新作为 Runtime Owner 的[桌面 README](../../../apps/desktop-tauri/README.zh.md)，并更新面向用户的产品安装、Settings、Harbor、Troubleshooting 和 Release 页面。网站下载页把 Bootstrap 标为推荐，把 Offline 标为更大但自包含。Application Lifecycle Settings 展示 Application Version、Component Manifest Version、Active Component id、Component 总磁盘使用量、**Install Harbor runtime**、**Retry failed component** 和 **Remove unused components**，但不允许破坏性移除 Active 或 Fallback Component。

Release Notes 分开报告 Application Change 与 Component Change。[Release Archive](../../releases/README.zh.md)记录两个 DMG、Component Asset、Hash、Signature、Public Anonymous Download、Updater Selection、压缩与展开大小、Store 复用观察、Offline No-network 结果、Harbor Lazy-install 结果、Website 状态和未验证范围。CI 成功本身不能证明公开可用。

运维诊断保留 `boot.log`，并增加有界 Component Event Log，记录 Timestamp、Component id、Byte Count 与 Status Transition。支持说明要求提供这些已清理 Log 和 Active id，而不是用户的 Package Store、Credential、Session 或完整 Application-data Directory。

<a id="dev-note"></a>
## Dev Note

体积测量是 2026-09-30 Checkout 的本地观察，不是 Release 声明。本方案在从默认 DMG 移除重量级字节的同时，刻意保留固定 pnpm 和精确 Release Component。Harbor Dependency 最小化需要上游为真实 Host-broker 路径提供可安装依赖集合；实现不能在没有完成上述 Packaged Harbor Acceptance 的情况下，于安装后裁剪 Imported Python Module。
