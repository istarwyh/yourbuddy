# Agent Note: YourBuddy Better Sidebar 文件与浏览器打开

Status: implemented

[English](2026-09-20-yourbuddy-better-sidebar-file-and-browser-opens.md) | 中文

## Problem

YourBuddy 通过原生桌面 Slot 挂载 Better Sidebar 工作区，此时插件自有面板 Store 不一定带有活动 Session。文件树点击与右键菜单的新标签页动作调用未指定 Scope 的 `openTab`，导致原生 Sidebar 无法选择目标并静默不打开任何内容。浏览器 Tab 会提交地址，但受限 iframe 沙箱会让百度等普通网站显示空白，除非用户手动关闭沙箱。

## Decision

Better Sidebar 文件打开调用原生 Sidebar Service 时显式指定所属 `{ sessionId, cwd }`。文件树点击、右键菜单打开、Changes Tab 打开与 Explorer Reveal 因此使用来源 Tab 所属的 Session 解析，而不依赖偶然存在的插件面板状态。

浏览器 Tab 将 `browserNoSandbox` 默认设为 `true`。用户可以在 Side Card 设置中选择受限 iframe 沙箱。启用后，普通跨源页面保留自身 Origin 与顶层导航能力以保持兼容，GUI 自身 Origin 与未获准的 Loopback 地址则继续使用不透明的受限 Token 集合。

YourBuddy 将两项决议记录为带摘要的 Better Sidebar 产品补丁。产品刷新在验证新快照前，把补丁重放到源码与分发 Bundle。

## Alternatives considered

**保留隐式 Session 选择。** 原生 Slot Tab 可以绕过插件面板状态或比它存活更久，因此 Store 不是目标 Session 的权威来源。

**默认保留受限沙箱并要求手动解锁。** 地址栏看似接受了导航，但常见网站显示空白，使 Browser Tab 在默认状态下无法完成主要任务。

**只维护快照内已物化的修改。** 产品刷新会替换 npm 快照。可重放补丁让分发 Bundle 与源码可复现，并在上游修改发生重叠时明确失败。

## Consequences

原生 Sidebar 展示下的文件动作拥有稳定的 Session 目标。默认安装后的浏览器导航无需逐 Tab 解锁；不受限的嵌入页面获得普通跨源 iframe 的正常能力，包括顶层导航，偏好受限模式的用户仍可显式启用。聚焦测试执行两份分发 Client Bundle，保留 GUI Origin 与 Loopback 例外，并断言新默认值；产品刷新测试验证补丁依次重放及快照 Hash。
