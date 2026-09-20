# Agent Note：YourBuddy GPT Auth 兼容性

状态：已实现

[English](2026-09-20-yourbuddy-codex-auth-rpc-registration.md) | 中文

## 问题

GPT Auth 客户端通过专用的 `/codex-auth` Connection 通道调用登录状态、用量和登录流程。其 Host 注册只注入 `connection`，但 `connection.rpc.handle()` 会通过调用方 Context 的 `webServer` 服务注册物理路由。Cordis 可追踪服务调用会跨越嵌套可选注入保留该功能的外层生命周期 Context，所以即使只有嵌套 Fiber 声明该服务，直接读取 `owner.webServer` 也会失败。可选插件 Fiber 的其余部分仍会继续启动。状态请求最终落入 Web 应用的静态处理器并得到 HTTP 405，所以即使官方 Codex 登录文件仍已配置，设置页也会显示红色状态。

组装产品冒烟测试会证明 Codex Auth 客户端 Bundle 已加载，但不会调用该专用通道，也不会打开 GPT Auth 设置区。因此缺失的 Host 路由仍可通过发布验证。

同一个外部快照仍按旧版 `dsh-llm-pi-ai` Contract 构造 `ResolvedPiAiProviderProfile`。Bundle 中的适配器现在会在解析精确模型前读取逐模型诊断 Map，但该快照未提供 `modelErrors`。Provider Discovery 可以列出 Codex 模型，Catalog 解析和每次 Codex 调用准备却会在 Provider I/O 前执行 `profile.modelErrors.get(model)`，并因 `Cannot read properties of undefined (reading 'get')` 失败。

## 决策

YourBuddy Codex Auth 快照携带一个实体化兼容补丁，在调用 `connection.rpc.handle()` 前同时注入 `connection` 和 `webServer`。Connection 服务通过严格的 `owner.get('webServer')` 解析活动 Web Server，同时让路由 Effect 留在调用方 Context。这样，可选 Fiber 会同时管控服务可用性和清理，而完整 Codex LLM 适配器无需强制要求 Web 载体。同一补丁还提供空的 `modelErrors` Map；固定的 Codex Profile 不存在由配置产生的模型诊断，因此这能满足当前 `ResolvedPiAiProviderProfile` Contract，同时不改变模型成员或请求行为。刷新流程会对已审查的上游制品重放由摘要锁定的产品补丁。

组装桌面浏览器冒烟测试会通过真实模型选择器解析 Codex 模型组，但不会分派模型请求。它还会通过 `/codex-auth/status` 发送真实的 `status` 请求，验证 Connection 响应信封和公开状态字段，打开 GPT Auth 设置区，并要求在不出现传输失败的情况下渲染 CLI 不可用状态。隔离的发布环境有意不包含 Codex 可执行文件或登录凭据，所以这些检查无需读取或复制用户认证数据即可证明适配器兼容性与路由可用性。

## 考虑过的替代方案

**将 HTTP 405 视为已退出状态。** 不采用，因为登录、用量和刷新操作仍然没有 Host 路由，隐藏传输失败会报告错误的认证状态。

**将 GPT Auth 移到共享 `/api` 通道。** 不采用，因为插件已经拥有专用且经过认证的 Connection 通道，没有必要更改其客户端协议。

**将每个 Connection RPC 注册绑定到提供方 Context。** 不采用，因为由调用方限定的 Effect 允许每个消费者随其插件生命周期持有并清理路由。GPT Auth 会声明其可选路由注册所使用的服务，而 Connection 会在可追踪调用内部执行不依赖拓扑的活动服务查询。

## 后果

GPT Auth 状态、用量和登录路由只会在 Connection 与 Web Server 均可用后挂载。设置页可以区分 Codex 可执行文件缺失、账号已退出和登录已配置，而不会报告无关的传输错误。Codex 模型组也会在 Turn 启动前成功解析精确模型元数据，因此模型选择和 `prepareCall()` 不再因缺失诊断 Map 而失败。后续上游刷新必须保留、更新或明确移除该实体化补丁；如果专用路由或 Codex Catalog Contract 再次失效，发布验证现在都会失败。
