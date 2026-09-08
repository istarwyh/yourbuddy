# dsh-personal-workbench

[English](README.md) | 中文

这个第一方 YourBuddy 产品插件负责三个通用设置卡片。用户可以在**设置 → 通用设置 → 我的工作台**中替换侧边栏工作台名称和 Logo、预览草稿并恢复 YourBuddy 默认值。**设置 → 通用设置 → 网络代理**用于配置应用全局的直连、跟随 macOS 系统代理或自定义代理策略，通过 ChatGPT 分别测试原生草稿链路、新启动的托管 Node 草稿链路与当前 Node Host 链路，并且只有两条草稿链路都通过时才持久化选择，再重启 YourBuddy。**设置 → 通用设置 → 应用生命周期**会请求受信任的桌面 Shell 运行带签名的应用更新器，或在停止私有 Host 后重启整个应用。重启会加载通过 Plugin Marketplace 安装的插件。桌面操作在独立的 `dsh web` 中保持可见但不可用；浏览器请求不能选择任意 Tauri Command，代理配置不接受凭据，更新操作也不会在最终用户机器上刷新插件源码，因为内置产品插件会随带签名的应用 Release 一起升级。

侧栏底部在展开和收起时都提供**帮助与指南**入口，包含快速开始、默认插件、扩展 Y8、故障排查和 GitHub 问题反馈五个目的地。中文语言打开中文产品站，其他语言使用英文站。桌面请求复用既有外链桥接，独立 Web 则打开单独的浏览器页面；打开请求失败时保留可选择、可复制的地址。帮助不会替换工作台当前页面。“我的工作台”卡片也提供使用说明链接。在线文档不提供离线缓存。

在 YourBuddy 桌面应用中，助手 Markdown 渲染出的安全外链会使用操作系统默认浏览器打开。Client 只处理共享 Markdown Renderer 标记为新浏览上下文的绝对、不含凭据的 HTTP 与 HTTPS Anchor；同源与相对链接仍保留既有 Web 行为。悬停会显示规范化后的目标地址，自定义右键菜单可打开或复制链接。iframe 协议、Shell Validator 与 Rust Command 会分别拒绝其他协议和意外消息字段。独立 `dsh web` 仍使用浏览器的普通链接行为。

工作台身份保存在当前 DSH Profile 的 `personal-workbench` 命名空间：

```yaml
personal-workbench:
  enabled: true
  name: My Workbench
  logo: data:image/png;base64,...
```

浏览器会把上传图片保存为当前 Profile 中的 data URL。修改名称与 Logo 不会改变浏览器标题、可执行文件名、应用图标、主题或其他 UI 文案。

网络代理保存在 YourBuddy 原生桌面设置中，不属于 DSH Profile。直连模式会从应用进程树中移除继承的代理变量。跟随系统模式通过 `/usr/sbin/scutil` 读取 macOS 固定的 HTTP 与 HTTPS 代理 Endpoint；PAC、自动发现与只有 HTTP 的配置会被拒绝，因为把这些设置转换给 Node 子进程后无法保持相同的路由语义。自定义模式要求分别填写用于 HTTP 目标请求与 HTTPS 目标请求的不含凭据 URL，并可补充绕过主机；YourBuddy 始终绕过自己的 Loopback Host。如果两个字段指向相同的回环主机和端口，HTTPS 目标字段中误填的 `https://` 会被规范化为本地代理实际使用的明文 `http://` CONNECT Endpoint。DSH CLI 会在加载启动环境后、导入 Profile Boot 前安装 Undici 环境代理 Dispatcher，使内置 Node 22.19 Host 的全局 `fetch` 路由不依赖后续 Node Flag 或已配置插件。YourBuddy 会启用 Node 的系统 CA Store，原生 reqwest Client 则使用平台验证器。额外信任遵循固定优先级：设置卡中显式选择的 CA，其次是从进程或 macOS `launchctl` 继承且有效的启动时 `NODE_EXTRA_CA_CERTS`，最后仅使用系统信任。YourBuddy 会规范化所选或继承的 `.pem` 或 `.crt` 路径，并在使用前拒绝不存在、不可读、格式错误、尚未生效或已经过期的证书；只有显式选择的路径会持久化。解析后的路径与来源会一致应用到原生 Client、更新器、Host、插件子进程与 WSL，证书校验始终开启。设置测试会分别标注原生草稿、新启动的托管 Node 草稿与运行中 Host 的结果，并且只返回可达性、HTTP 状态、是否使用代理、当前代理模式、CA 来源以及 `UNKNOWN_ISSUER`、`UNABLE_TO_VERIFY_LEAF_SIGNATURE` 等有界错误码；它不会返回请求错误、代理 URL、凭据或 CA 路径。保存会再次执行原生与托管 Node 草稿预检，任一失败都不会写入设置。所选策略会在用户确认的应用重启后生效；重启会先终止并等待当前私有 Host 退出，然后统一覆盖新 Host、插件子进程、Profile 安装、Runtime 预配与签名应用更新。

默认名称为 YourBuddy，默认 Logo 为随附的 Y8 图标。自定义值缺失或停用时恢复该产品身份；卸载插件后才恢复上游 Shell 的默认呈现。

## 模型体验

无，因为本包只改变浏览器呈现，不会向模型请求添加内容。

#### KV Cache 影响

无；修改工作台身份不会组装或发送 provider 请求。

## 已知限制与暂缓事项

- **一个 Profile 只有一个自定义身份** —— 插件不会按 Workspace 或 Session 选择不同品牌。
- **只修改已声明的品牌 slot** —— 浏览器标题、桌面图标、主题、字体、壁纸和全局文案仍由原有界面负责。
- **不存储代理认证信息，也不执行 PAC** —— 请使用应用进程可以访问且不含凭据的固定 Endpoint；WSL 目标还必须能从 WSL 网络命名空间访问。
- **额外 CA 必须是当前有效且可读的 PEM Bundle** —— 文件扩展名可为 `.pem` 或 `.crt`，但只有 DER 编码、格式错误、尚未生效或已经过期的证书会被拒绝；有效的启动时 `NODE_EXTRA_CA_CERTS` 会自动采用，直到显式选择将其覆盖，额外根证书始终与系统信任共同使用。
- **代理变更以重启为生效点** —— “测试连接”先测试原生与新启动的托管 Node 草稿，再与运行中的 Host 对比；保存本身会重复两项草稿预检并在失败时保持设置不变，已经运行的 Host 与更新器则保留上次激活的策略，直到应用完成重启。
- **应用生命周期操作仅限桌面端** —— 工作台 Client 只能请求固定的签名更新与重启流程；Shell 只接受当前 Host iframe 从其精确 Origin 发出的请求。
- **外链处理仅限桌面端** —— 只有安全的 HTTP(S) 助手链接会委托给系统浏览器；本地路由与文件引用仍由内嵌 Web 应用负责。
