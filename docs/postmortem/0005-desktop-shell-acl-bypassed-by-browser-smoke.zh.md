# 事故复盘（postmortem） 0005：发布 Smoke 绕过了桌面 Shell ACL

[English](0005-desktop-shell-acl-bypassed-by-browser-smoke.md) | 中文

状态：已解决

## 摘要

YourBuddy 的 Remote Desktop Shell 显示了设置 Control，但 Tauri 会在 Rust Handler 运行前拒绝每个应用 Command。动态 Capability 只复制了 Core 与 Plugin Permission，而发布 Browser Smoke 用必定成功的 JavaScript Stub 替换 Tauri Invoke，因此绕过了缺失的应用 Permission。显式应用 Permission、一致性 Command 清单门禁、真实 Tauri Runtime Authority 测试与打包后 WebView 发布证据规则，会让相同遗漏在发布前失败。

## 概述

应用从随机 Loopback HTTP Origin 提供具有原生权限的顶层 Shell，让内嵌 Host 对其严格认证 Cookie 保持同站点。Tauri 会正确地把该 `WebviewUrl::External` Document 视为 Remote。Shell 把经过校验的 iframe Message 映射为网络设置、应用生命周期与外链所需的字面量应用 Command，但动态 Capability 没有引用允许这些 Command 的应用 Permission。

最终表现为 `Command test_network_proxy_settings not allowed by ACL` 等授权失败。请求从未进入 `test_network_proxy_settings`，因此代理配置、证书信任与网络连通性都与该失败无关。[Issue 13](https://github.com/istarwyh/yourbuddy/issues/13)记录了用户可见的复现过程与源码路径证据。

## 影响

受影响的安装应用会渲染无法调用原生 Handler 的 Control。报告中的路径是网络代理测试与保存；CA 选择、更新、重启、关闭偏好与外链 Command 都经过同一项缺失的 Permission，因此面临同一种失败。

ACL 拒绝了访问而不是扩大权限，所以这是可用性缺陷，并非权限提升。用户无法依赖已交付的设置旅程，发布证据也夸大了使用 Stub 的 Browser Smoke 实际证明的范围。

## 时间线

- 同站点认证修复把具有原生权限的 Shell 移到应用自有的 Loopback `WebviewUrl::External` Origin，并添加了精确 Origin 的运行时 Capability。
- 产品 Browser Smoke 使用替代的 `window.__TAURI__.core.invoke` 操作设置与链接 Control，由该函数返回受控结果。它验证了 Message 校验与 Command 选择，但从未进入 Tauri Runtime Authority。
- YourBuddy 0.3.3 在没有应用 Permission 的情况下交付 Remote Shell。YourBuddy 0.3.4 保留了相同的 Capability 结构。
- 用户从安装后的 0.3.3 应用复现 ACL 拒绝；源码检查确认 Command 已注册，但没有获得授权。
- 负向对照一致性测试因为桌面 Shell 应用 Permission 文件不存在而失败。随后，Permission、更新后的动态 Capability、真实 Authority 测试、CI 门禁、发布工作流检查与证据规则被一并加入。

## 根因

流程把 Command 注册与 Command 授权当成了同一个条件。`generate_handler!` 让 Rust 函数可供 IPC Dispatcher 调用，但 Remote Origin 还需要 Capability 为每个 Command 解析出应用 Permission。复制 `capabilities/default.json` 只提供 Core 与 Plugin Permission，无法授权应用 Command。

主要发布 Smoke 停在 JavaScript Bridge 边界。它的 Invoke Stub 会记录正确的 Command 名称并返回成功，却不会查询生成的 Tauri Manifest、Origin、Window Label 或 Permission Resolver。既有 Rust 测试只断言动态 Capability 的 Remote URL 与 Window 字段，因此两种测试都无法因报告中的机制而失败。

发布验证记录了经过认证的原生启动，但没有完成可视 WebView 自动化。该限制被保留为未验证的截图覆盖，然而由于源码 Browser Smoke 已经点击这些 Control，说明仍把它们描述为经过操作。证据分类没有区分 Bridge 执行与原生授权。

## 已添加的防护措施

- [`desktop-shell.toml`](../../apps/desktop-tauri/src-tauri/permissions/desktop-shell.toml)定义一项具名应用 Permission，其 Allowlist 是完整的字面量 Shell Command 清单。
- 动态 Capability 保留既有 Shell Permission 并加入该应用 Permission，同时限制在运行时自有 Origin 与 `main` Window。内嵌 Host、Splash Window 与其他 Loopback Port 继续保持未授权。
- [`desktop-shell-permissions.test.mjs`](../../apps/desktop-tauri/scripts/desktop-shell-permissions.test.mjs)提取字面量 Shell Invoke、解析 Permission Manifest、检查精确集合相等性与唯一性、确认每个名称已经注册，并在常规顶层静态 CI 中运行。
- Rust Desktop Shell 测试把生成的应用 Manifest 加载进真实 Tauri Runtime Authority，为精确 Origin 与 Window 解析每个允许的 Command，同时检查负向 Origin 与 Window。
- [桌面发布工作流](../../.github/workflows/desktop-release.yml)在构建应用后，对发布源码运行一致性门禁与 Authority 测试。
- [测试策略](../testing.zh.md)与[发布证据规则](../releases/README.zh.md)把 JavaScript Invoke Stub 归类为仅验证 Bridge，并要求先为受影响 Control 提供打包后 WebView 证据，才能把安装包行为结论标为通过。

## 教训

- 已注册的 Tauri Command 并不等于已授权的 Command；测试必须携带交付的 Manifest、Origin 与 Window 进入 Resolver。
- 位于调查对象边界上的 Fake 无法验证该边界。Browser Smoke 对 iframe Message 与 UI 行为仍有价值，但不能承担 ACL 结论。
- 应用 Command Allowlist 需要机器派生的清单比较。只评审并行维护却没有相等性检查的手写列表，很容易遗漏。
- 已声明的限制仍然是发布限制。若打包后 UI 自动化不完整，源码 Browser 成功不能把缺失的安装包旅程升级为通过。
