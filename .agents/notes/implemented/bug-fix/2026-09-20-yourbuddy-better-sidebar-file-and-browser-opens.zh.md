# Agent Note: YourBuddy Better Sidebar 文件与浏览器打开

Status: implemented

[English](2026-09-20-yourbuddy-better-sidebar-file-and-browser-opens.md) | 中文

## Problem

YourBuddy 通过原生右侧 Sidebar Tab 与底部工作区挂载 Better Sidebar。文件树动作把 `{ sessionId, cwd }` 传入插件 Service，但原生 Surface 随后丢弃该归属信息，并调用当前挂载的右侧 Sidebar Controller。全局面板可能在工作区与当前 Session 仍可见时卸载该 Controller，而可选的按 Session 方法不返回接受状态，因此点击可能被丢弃。浏览器 Tab 会提交地址，但受限 iframe 沙箱会让百度等普通网站显示空白，除非用户手动关闭沙箱。

## Decision

原生 Tab 内的文件动作使用该 Occurrence 的 `tab.actions.openResource`，该动作绑定所属 Session 与 Pane。文件树点击、右键菜单打开与 Changes Tab 打开因此会把 Session 归属保留到最终的 Host 导航。Editor 原位导航会替换其原生 Tab；显式新建 Tab 动作会显示已有文件 Tab，或在所属 Session 中打开一个文件 Tab；侧边打开会在 Host 的 Pane 数量与空间规则内创建原生 Pane。

底部工作区使用 Controller 的公开按 Session 方法。这些写入会报告已采用的 Session Store 是否接受操作；Better Sidebar 会按请求顺序保留被拒绝的操作，并在下次打开操作前、Session 列表变化时，或 Host 宣布目标 Store 已被采用时重试。

浏览器 Tab 将 `browserNoSandbox` 默认设为 `true`。用户可以在 Side Card 设置中选择受限 iframe 沙箱。启用后，普通跨源页面保留自身 Origin 与顶层导航能力以保持兼容，GUI 自身 Origin 与未获准的 Loopback 地址则继续使用不透明的受限 Token 集合。

YourBuddy 将两项决议记录为带摘要的 Better Sidebar 产品补丁。产品刷新在验证新快照前，把补丁重放到源码与分发 Bundle。

## Alternatives considered

**只通过插件 Service 转发 Session 字段。** 原生 Tab 已经收到绑定所属 Session 与 Pane 的 Occurrence Action。最终导航步骤若重新进入全局 Controller，就会再次引入已挂载 Seat 生命周期与当前 Session 启发式判断。

**默认保留受限沙箱并要求手动解锁。** 地址栏看似接受了导航，但常见网站显示空白，使 Browser Tab 在默认状态下无法完成主要任务。

**只维护快照内已物化的修改。** 产品刷新会替换 npm 快照。可重放补丁让分发 Bundle 与源码可复现，并在上游修改发生重叠时明确失败。

## Consequences

原生 Tab 的文件动作保留 Occurrence 所属的 Session 目标；Session Store 无法接受底部工作区打开动作时，该动作会保持待处理。默认安装后的浏览器导航无需逐 Tab 解锁；不受限的嵌入页面获得普通跨源 iframe 的正常能力，包括顶层导航，偏好受限模式的用户仍可显式启用。聚焦测试从两份分发 Client Bundle 执行普通、替换与侧边文件打开，验证已发布声明，覆盖按 Session 写入按先进先出顺序从拒绝到 Store 采用的过程，保留 GUI Origin 与 Loopback 例外，并断言 Browser 默认值；产品刷新测试验证补丁依次重放及快照 Hash。
