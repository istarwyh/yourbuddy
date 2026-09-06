# Agent Note: YourBuddy 桌面同站点认证

Status: implemented

[English](2026-09-06-yourbuddy-desktop-same-site-authentication.md) | 中文

## 问题

YourBuddy 0.3.2 会在打开窗口前完成私有 Host 的启动 Token 交换，但安装后的 macOS 应用仍显示 `dsh web authentication required`。Tauri Shell 使用本地应用 URL，嵌入式 Host 则使用 `http://127.0.0.1:<port>`，因此 WebKit 把 Host iframe 视为跨站，并拒绝发送 Host 的 `SameSite=Strict` Cookie。发布 Smoke 从另一个 `127.0.0.1` 端口提供 Shell，意外地与 Host 同站点，所以没有复现安装应用的问题。

把 WebView 中的副本改为 `SameSite=None; Secure` 仍不能修复安装应用，因为 macOS WebKit 继续拦截该第三方 Cookie。弱化共享 Host Cookie 还会改变普通 `dsh web` 的浏览器认证，却无法解决 WebKit 的存储策略。

## 决策

原生启动链路完成 Token 交换，校验返回 Cookie 的名称、值长度、过期时间、`Path=/`、`HttpOnly` 与 `SameSite=Strict` 属性，并只保留该 Cookie，直到创建主 WebView。Token URL 会在 Renderer 创建前丢弃，绝不进入 Initialization Script。

具有原生权限的桌面 Shell 由最小化的应用自有 HTTP Server 从随机 `127.0.0.1` 端口提供。Tauri 只为该精确 Origin 添加运行时 Capability。Server 要求精确的 Loopback `Host`，只接受有界 `GET` 请求，以 No-store 和限制性响应 Header 提供内嵌 Shell、Locale Script 与图标，并在应用退出或重启前停止。

Shell 与 Host 现在共享 HTTP `127.0.0.1` Site，同时因为端口不同而保持不同 Origin。原生代码会安装经过校验的 Strict Host Cookie，确认保存的值和属性，再允许 Shell 在 iframe 中打开不含凭据的 Host 根地址。因此 Cookie 可以按同站点规则发送，不需要第三方 Cookie 例外。Host iframe 无法读取 Shell Document，也不匹配 Shell 的精确 Tauri Capability Origin，所以产品 Client 代码仍只能使用既有的允许列表 `postMessage` Bridge。

## 验证

负向对照只把发布 Smoke 的父页面从 `127.0.0.1` 改为 `localhost`；完整产品随后停在与安装应用报告一致的 401 响应。单元测试覆盖 Token 交换提取 Cookie、Strict 属性校验、精确 Loopback Shell URL、精确 Origin 运行时 Capability 与有界 HTTP Header Reader。产品 Smoke 会清除既有 Cookie、安装交换所得的 Strict Cookie、从不同 Loopback Port 提供 Shell 与 Host、加载干净 Host 根地址、执行产品 Client 与桌面 Bridge，并要求 Host 正常退出。

2026-09-06 UTC+08:00，从 `/Applications` 启动公开 0.3.2 应用复现了 401。随后把包含本变更的 Release-mode arm64 二进制放进同一 0.3.2 应用资源的副本，执行 Ad-hoc 签名，并使用隔离的应用数据目录在真实 macOS WebView 中启动。私有 Host 通过带认证的就绪检查，可见窗口渲染 YourBuddy 工作台而不再显示认证错误。该安装 Bundle 测试没有覆盖 Windows、WSL、Intel macOS、OAuth 或真实模型请求。

## 曾考虑的替代方案

**把 Host Cookie 全局改为 `SameSite=None; Secure`。** 普通 `dsh web` 使用 Loopback HTTP，并有意采用严格的 Host-only Cookie。该尝试没有通过 macOS WebKit 的第三方 Cookie 策略，还会为全部浏览器 Consumer 弱化共享安全设置。

**让 Host 页面直接获得顶层 Tauri 权限。** 直接加载产品 Host 可以让 Cookie 成为第一方，但 Community Client Plugin 也会在具有原生权限的 Document 中执行。独立 Origin 的 Shell 会继续把原生命令放在固定 Validator 后面。

**让 WebView 通过 Token URL 导航。** 这会把进程凭据暴露给 Renderer，并在重定向后仍留下跨站 iframe。原生交换与 Cookie 交接让 Token 保持在 Renderer State 之外。

**通过自定义 Protocol 代理 Host。** Web 应用还需要 Streaming 与 WebSocket 行为。局部原生 Proxy 会重复 Host Transport 行为，并新增一处认证面。

## 后果

主窗口存续期间，桌面进程会多持有一个临时 Loopback Listener 与一个精确 Origin 运行时 Capability。绑定、授权或提供 Shell 失败时，启动会明确失败，不会回退到未认证的 Host 页面。既有 Host Cookie 继续保持 Strict，HTTP Loopback 继续采用此前已说明的未加密方式，Renderer 可见的 Host 地址仍只有不含凭据的 URL。

源码浏览器 Smoke 现在必须显式模拟安装 Shell 的同站点关系。仅有同站点 Smoke 结果不构成安装产品证据，因此发布验证仍须在每个声称支持的桌面平台启动已打包应用。
