# Agent Note: YourBuddy 应用全局网络代理

Status: implemented

[English](2026-08-30-yourbuddy-global-network-proxy.md) | 中文

## Problem

从 macOS Finder 启动的应用不会继承用户交互式 Shell 中的代理变量。因此，即使 macOS 已经配置可用的系统代理，Codex Auth 等插件创建的 Node HTTP Client 仍可能直接连接。只修复一个插件还会让 Package 安装、Marketplace Metadata、Runtime 预配与应用更新使用不同链路。

## Decision

YourBuddy 原生桌面设置持有一项应用全局的 `direct`、`system` 或 `custom` 代理选择。默认使用直连，并从所有应用自有进程中移除大小写形式的继承代理变量。跟随系统模式执行固定的 `/usr/sbin/scutil --proxy` 命令，接受 macOS 固定的 HTTP 与 HTTPS Endpoint。自定义模式要求分别填写不含凭据的 HTTP 与 HTTPS URL，并接受以逗号分隔的绕过列表。所有模式都会把 `localhost`、`127.0.0.1` 与 `::1` 加入绕过列表，使 Tauri WebView 与私有 Host 保持 Loopback 直连。

原生启动链路会在 Runtime 预配前解析已保存的选择。解析结果用于配置 Rust HTTP Client、签名更新器、原生 Host 与插件子进程、Profile Repair 与 Package 安装、Toolchain 下载以及 WSL 命令。所有通过这项策略创建的原生 reqwest Client 都会让 rustls 使用平台证书验证器，使 macOS Keychain 的信任关系适用于企业代理拦截的 HTTPS。额外信任遵循一项固定优先级：显式选择的 CA 路径，其次是启动进程或 macOS `launchctl` 中的 `NODE_EXTRA_CA_CERTS`，最后仅使用系统信任。原生所有者会规范化每个候选 `.pem` 或 `.crt` 路径，确认这个有界的普通文件包含有效的 X.509 证书且当前时间位于证书有效期内，并且只持久化显式选择的路径。注入环境时会先移除原有代理与 CA 值，再加入解析出的路径及其来源，显式启用 Node 的环境代理开关，通过 `NODE_OPTIONS` 加入 `--use-system-ca`，并在每个应用自有 Node 进程启动前设置已校验的 `NODE_EXTRA_CA_CERTS` 路径；WSL 命令会收到对应的挂载路径。由于 Node 只会在进程启动时读取额外 CA 变量，保存设置后会先终止并等待当前私有 Host 退出，再由 YourBuddy 重新启动它。由于安装包内的 Node 22.19 Runtime 早于环境代理开关，DSH CLI 还会先物化分层环境并把 Undici 的 `EnvHttpProxyAgent` 安装成进程全局 Dispatcher，然后才导入 Profile Boot 与已配置插件。Dispatcher 由 CLI 进程入口持有，而不是由产品插件持有，因此 Provider 初始化顺序不会让 Host 全局 `fetch` 保留默认直连 Dispatcher。运行中的应用会保持这份不可变的解析结果；修改已保存的草稿不会拆分仍在运行的 Host 进程树。

跟随系统模式拒绝 PAC、自动发现以及只有 HTTP 的 macOS 配置。PAC 求值不等同于导出静态 Node 代理变量，而只有 HTTP 的 macOS 配置会使 HTTPS Client 静默选择另一条链路。自定义代理 URL 拒绝嵌入凭据和非 HTTP Scheme，避免 Secret 进入明文桌面设置文件、进程参数或日志。两个自定义字段描述 HTTP 目标请求与 HTTPS 目标请求各自使用的代理，而不是代理服务器自身的 Transport；如果一组 `http://` 与 `https://` URL 指向相同的回环主机和端口，HTTPS 目标值会规范化为 `http://`，防止把本地 HTTP CONNECT 代理误认为 TLS 代理。远程 Endpoint 会保留显式 Scheme，并在配置错误时由预检拒绝。可选 CA 输入会拒绝相对路径、不存在、不可读、非普通文件、过大、只有 DER 编码、格式错误、尚未生效或已经过期的证书文件。它只补充平台信任，不会无差别信任 Keychain 中的每个条目，也不会替换系统根证书。需要认证的代理必须等待后续 Credential Store 集成，不能通过兼容回退实现。

Personal Workbench Client 会在通用设置中加入一张卡片，加载当前原生设置与检测到的 macOS Endpoint，打开受限的原生 CA 文件选择器，然后通过 `https://chatgpt.com/` 分别测试原生草稿链路、使用已安装 Runtime 与 Undici `EnvHttpProxyAgent` 的新托管 Node 进程，以及正在运行的 Node Host。保存会重复原生与托管 Node 预检，只有两项都通过才会持久化。运行中 Node Host 的测试会先要求当前进程提供 CLI 已安装 Dispatcher 的证明，再使用固定的同源 JSON POST 与全局 `fetch`。各项探测只返回是否成功、HTTP 状态、代理链路是否生效、解析后的代理模式、CA 来源（`system`、`environment` 或 `custom`）以及有界的 Transport 或证书错误码；设置卡会分别标注各项结果，包括 `UNKNOWN_ISSUER`、`UNABLE_TO_VERIFY_LEAF_SIGNATURE` 等错误码，不会把失败替换成笼统的代理进程诊断。所有测试都不要求或传输 ChatGPT 凭据，也不会向浏览器返回代理 URL、CA 路径或原始请求错误。证书失败会提示用户在 macOS Keychain 中信任企业根证书或选择对应的 PEM Bundle，并明确 YourBuddy 会保持证书校验开启。草稿与当前 Host 的代理模式或 CA 来源不同时，结果会要求保存、重启并再次测试。独立的 `dsh web` 没有受信任的原生所有者，因此只显示禁用的控件。

Loopback Client 使用独立且带版本的消息 Channel，包含 `get`、`select-ca`、`test` 与 `save` 四项 Action。Tauri Shell 要求消息来自精确的工作台 iframe Source 与 Host Origin，校验有界字段与已知 Key，把 Action 映射到四个字面量 Command，并只向该 Origin 回复。`select-ca` Action 会调用一个基于 Tauri 原生对话框的专用 Rust Command，而不是开放通用文件系统访问；Rust 会在返回路径前校验所选文件，并在测试、保存或启动前再次执行同一套设置校验。浏览器不能提供 Command Name、Executable、Destination URL、系统命令、任意文件路径或任意环境变量。

现有的 [YourBuddy 产品化 AI 工作台发行](2026-08-22-yourbuddy-product-workbench.zh.md)继续负责产品打包与发布验收；本记录只负责应用全局路由策略。较早的[桌面端主机工具链扫描与主目录匹配](2026-08-14-desktop-host-env-and-home-adoption.zh.md)仍适用于 Host Executable 发现与环境隔离；代理变量现在属于产品显式持有的环境子集，不再继承 Shell 状态。

## Alternatives considered

**只为 Codex 增加代理字段。** 不采用，因为同一 Node 进程树还负责插件发现、安装、Harbor Helper 与其他 Provider。每个插件各自配置代理会产生冲突链路，并重复处理凭据。

**继承 Finder 或 Shell 中的全部网络变量。** 不采用，因为 Finder 不会可靠接收交互式 Shell 的代理变量，环境代理值无法表达显式的直连选择，继承的凭据还可能泄漏给子进程。唯一接受的无凭据 `NODE_EXTRA_CA_CERTS` 路径只会在原生校验后作为启动时信任输入，并且会被显式桌面选择覆盖。

**把 PAC 或自动发现结果转换成单个静态 URL。** 不采用，因为这些机制会按请求选择链路，并可能执行平台策略。只导出一个 URL 却声称支持会产生错误行为。

**持久化带认证信息的代理 URL。** 不采用，因为桌面设置文件、进程环境、诊断信息与子进程都不是 Credential Store。

**关闭 TLS 证书校验。** 不采用，因为这会使应用自有的所有 HTTPS 请求都可被任意拦截。企业 HTTPS 拦截必须由平台已信任的根证书或用户显式选择的 Bundle 授权；YourBuddy 永远不会设置 `NODE_TLS_REJECT_UNAUTHORIZED=0`。

**把 macOS Keychain 中的所有证书导出给 Node。** 不采用，因为 Keychain 中证书的信任设置与用途不同。`--use-system-ca` 会采用操作系统的信任决定，而显式 Bundle 只在内置 Node Runtime 无法验证企业证书链时提供一项范围明确的补充。

## Consequences

一项可见设置会在重启后统一路由 Codex Auth、其他 Host 插件、Package 安装、Runtime 下载与签名更新。无需重新选择 CA，也能采用当前机器的固定 macOS 代理、Keychain 已信任的企业根证书与有效的启动时 `NODE_EXTRA_CA_CERTS`；直连仍是明确且确定的代理状态，显式 CA 选择也始终优先。使用 PAC、自动发现、只有 HTTP 的代理、代理认证或无效的拦截证书时，用户会收到具体失败并需要修正对应的代理或信任设置。显式或继承的 CA 路径都会成为应用启动依赖：文件被移动或删除后，策略解析会明确失败，而不是静默回退到另一种信任策略。WSL 使用的自定义 Endpoint 必须能从 WSL 网络命名空间访问，而且额外 CA 文件必须能通过转换后的 WSL 挂载路径读取。发布门禁会使用归档的 Node 22.19 Runtime 启动真实 CLI Node Host，要求其全局 `fetch` 经过本地 HTTP CONNECT 代理，证明未在启动前注入私有 CA 时失败，并证明相同 Host 在已校验 CA 路径存在时成功。产品 Release Smoke 会执行受信任选择器桥，展示原生草稿、托管 Node 草稿与运行中 Host 三项独立结果，以及证书指引、受保护保存与重启路径。Rust 测试覆盖系统解析、CA 优先级与当前有效期、本地代理规范化与绕过、替换并重新注入环境 CA、含额外根证书的平台验证器构造、Node 启动前注入、WSL 路径转换与有界证书错误码。
