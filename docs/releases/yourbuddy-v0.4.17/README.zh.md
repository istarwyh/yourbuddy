# YourBuddy 0.4.17

[English](README.md) | 中文

YourBuddy 0.4.17 已发布。本归档区分预检、发行产品验收和独立公开核验，并在下文保留尚未验证的范围。

- 发布标识：`yourbuddy-v0.4.17`
- 产品渠道：适用于 macOS Apple Silicon 的 YourBuddy 桌面应用。
- 归档状态：发行工作流与三次原生 Offline 启动通过；独立公开核验仅限于下文记录的范围。
- 发行源码：提交 `79fc43353f50f3dfaa313b02bc6342eb0429b9d4`，树为 `998fdbb01b4fead922e4e3a4ad506d03a8f67ff0`；见[发行工作流记录](evidence/release-workflow.json)。版本候选在已合并修复基线 `501770ca9f0857fc49695f2e8d2b1c89d1bf9959` 上仅修改版本元数据和文档。
- 证据画廊：[发行运行工作台](screenshots/released-workbench.png)与 [PR 预检工作台](screenshots/prepared-workbench.png)。两者均为已查看的合成 Chromium 数据，不是原生应用截图。
- 证据下载：[不可变标签源码归档](https://github.com/istarwyh/yourbuddy/archive/refs/tags/yourbuddy-v0.4.17.zip)包含原候选记录，不包含本次后续发行结果。已独立核验 CRC，并将全部 15 个候选变更文件与精确发行提交逐字节比对，见[源码核验](evidence/source-archive-verification.json)。最终证据保留于本次发布后的文档更新；标签保持不变。

## 用户发行说明

### 变更内容

内置 Claude Design 与 Claude Artifacts 2.11.1，并提供应用内托管编辑器（[PR #90](https://github.com/istarwyh/yourbuddy/pull/90)）。本版还包含有界 SDK 快照测试超时诊断（[#87](https://github.com/istarwyh/yourbuddy/pull/87)）、适用于 PATH 的组件目录（[#88](https://github.com/istarwyh/yourbuddy/pull/88)）、等价 Store 确定性归档（[#89](https://github.com/istarwyh/yourbuddy/pull/89)）以及 idle-watchdog 测试启动竞态修正（[#91](https://github.com/istarwyh/yourbuddy/pull/91)）。

未发布的 0.4.14 和 0.4.15 候选暴露出 fixture 补丁输入缺失与已安装 peer 清单过期。[PR #92](https://github.com/istarwyh/yourbuddy/pull/92)修正 fixture；[PR #93](https://github.com/istarwyh/yourbuddy/pull/93)覆盖每个实际产品 peer 与 Artifacts Client，并通过已提交设置及独立读取验证品牌重置。原有身份校验和渲染／重载品牌检查全部保留。[0.4.14](../yourbuddy-v0.4.14/README.zh.md)与 [0.4.15](../yourbuddy-v0.4.15/README.zh.md)失败记录仍可查阅；两个标签均未移动，均没有 GitHub Release 或安装包。

Settings 现在会在 onboarding 加载或跳过步骤时保持打开。只有真正可见的引导弹窗才接管面板，嵌套账号登录也遵循相同规则（[PR #94](https://github.com/istarwyh/yourbuddy/pull/94)）。未修改的品牌旅程在未发布的 [0.4.16 尝试](../yourbuddy-v0.4.16/README.zh.md)中暴露了此产品竞态；该标签同样保持不变。

### 解决的问题

Design 产物可在工作台内打开。在文件模式和工具相同的条件下，等价 Store 内容不再因输入顺序与时间戳不同而生成不同归档。SDK 快照测试仅在失败时输出阶段诊断，不记录请求内容；组件缓存路径不再向 PATH 引入冒号。watchdog 测试等待真实 SDK 请求后才推进假时钟。

### 使用位置

在所选工作区中使用 Artifacts。创建操作打开全新、未发送的 `/claude-design` 草稿，保留所选 Agent Preset，并使用 YourBuddy 已配置的默认模型。已有草稿不受影响。[适配器指南](../../../apps/desktop-tauri/product/claude-design-adapter/README.zh.md)负责详细行为与前置条件。

### 如何体验

打开 Artifacts，创建 Design 草稿并在发送前检查。模型写出项目并调用 `yourbuddy_design_open` 后，选择产物即可打开托管编辑器。已保存评论支持 Send to Agent；非评论页面按钮请求返回 HTTP 409。CI 用合成文件检查草稿／编辑器，不代表真实模型生成。

### 安装或升级

从 [0.4.17 发行页](https://github.com/istarwyh/yourbuddy/releases/tag/yourbuddy-v0.4.17)使用 Apple Silicon Bootstrap 或 Offline DMG，或使用现有签名更新器。Bootstrap DMG 为 11,127,135 字节，Offline DMG 为 614,073,515 字节；这是归档大小，不是网络流量或安装后占用。应用采用 ad-hoc 签名，构建明确跳过 Apple 公证。更新器／组件签名验证不能证明 Developer ID 签名或 Gatekeeper 接受。

### 兼容性、迁移与限制

Harness 版本保持 `0.2.0-rc.1`。PATH 安全缓存名称将 `:` 编码为 `%3A`；旧目录保留但不复用。即使内容标识相同，首次规范化 Store 归档仍可能因签名摘要变化而需要重新下载。这不是共享 CAS 或增量下载。相关 issue [#57](https://github.com/istarwyh/yourbuddy/issues/57)、[#83](https://github.com/istarwyh/yourbuddy/issues/83)、[#85](https://github.com/istarwyh/yourbuddy/issues/85) 和 [#86](https://github.com/istarwyh/yourbuddy/issues/86) 仍保持 open。原始 120 秒超时与历史 13 GB 占用的根因仍未确定。本版不含 [#80](https://github.com/istarwyh/yourbuddy/pull/80) 的 Agent 自升级。

托管 LAN Share 不受支持。真实模型生成、macOS 原生 Tauri/WebView Design 交互及 HTML/PDF/PNG 导出／保存、冷启动 Session/controller 恢复、Windows 编辑器归属、已安装应用升级与数据降级兼容性仍未验证。三次原生启动均使用 runner 提供的 Node 24.22.2；无系统 Node 的完整首次启动仍未验证。

### 来源与许可

[UPSTREAM.json](../../../apps/desktop-tauri/product/claude-design-adapter/UPSTREAM.json)固定上游修订、npm 2.11.1 完整性值和已审查的集成补丁。保留包 LICENSE、NOTICE.md 及编辑器第三方声明。这些是混合条款，并非整体 MIT。上游 NOTICE 指出 Anthropic 来源材料未公布许可；打包和固定来源不能解决或授予相关权利。

## 验证摘要

| 场景 | 状态 | 被测构建 | 证据与限制 |
|---|---|---|---|
| 完整 macOS 预备输入与产品验收 | 通过 | 版本升级前的 0.4.16 修复源码；PR #94 head `c88e737ac908699881b4e93c1e9a4e7cc296e3c8` | [运行 42362666422](https://github.com/istarwyh/yourbuddy/actions/runs/42362666422)；[保留证据](evidence/prepared-preflight.json) |
| 精确 Design 草稿／编辑器与离线恢复 | 通过 | 历史组合产品树 `b2f40dd` | [Bootstrap 42346920573](https://github.com/istarwyh/yourbuddy/actions/runs/42346920573)，4/4；真实 Chromium 与 570 包恢复，没有真实模型 |
| 完整组合源码 CI | 通过 | 历史 PR #90 组合源码 | [CI 42346920678](https://github.com/istarwyh/yourbuddy/actions/runs/42346920678)，16/16 |
| Settings 修复源码 CI | 通过 | PR #94 修复源码 | [CI 42362666398](https://github.com/istarwyh/yourbuddy/actions/runs/42362666398)，16/16；发布后核实 |
| Store 归档与 fixture 回归 | 通过 | 已包含的 #89 与 #92 源码 | [源码检查](../yourbuddy-v0.4.15/evidence/source-checks.json)、[fixture 修复](../yourbuddy-v0.4.15/evidence/fixture-repair.json)；49 项归档、63 项组件及 8 项 renderer 测试 |
| Peer／Artifacts 与重置回归 | 通过 | 已审查的 #93 源码 | [修复证据](evidence/verifier-repair.json)；49/49 聚焦测试，包含真实 Chromium 流生命周期回归；拒绝重复 peer、缺失 Client 和虚假重置成功 |
| Settings 接管回归 | 在本地范围内通过 | #94 产品修复 | [产品修复](../yourbuddy-v0.4.16/evidence/settings-race-repair.json)；50 项组件测试、可控真实 Host 从失败转为成功、568 输入的原样完整预备验收 |
| 本地预备运行 | 在输入限制下通过 | macOS 15.6.1 arm64、Node 22.22.3、pnpm 11.7.0 | 568 输入的完整 Host／Harbor／Chromium；缺少两个原生 optional 包，不是完整输入证据 |
| 版本候选检查 | 通过 | 本地 0.4.17 元数据候选 | [命令与结果](evidence/candidate-checks.json) |
| 发行打包与预备验收 | 通过 | 精确 0.4.17 标签 | [工作流](evidence/release-workflow.json)、[发行预备结果](evidence/released-prepared.json)；core 9／Harbor 10 个 Client、85 条 core peer、两阶段品牌／重置旅程 |
| 原生 Offline 启动 | 在记录范围内通过 | 已发行 Offline 应用，darwin-arm64 | [原生结果](evidence/native-offline.json)；三次经认证的工作台启动与干净退出，使用 runner Node |
| 独立公开附件 | 见记录范围 | 已发布 0.4.17 附件 | [公开元数据](evidence/public-release.json)、[限定范围核验](evidence/public-verification.json)；全部 17 个公开文件、两个更新包签名及 DMG 完整性检查通过 |
| 不可变标签源码 | 所选变更文件通过 | 精确 0.4.17 标签 | [源码核验](evidence/source-archive-verification.json)；ZIP CRC 与全部 15 个候选变更文件 |

## 场景：完整 macOS 预备检查

[PR job](https://github.com/istarwyh/yourbuddy/actions/runs/42362666422/job/128374114853)以只读仓库权限执行发行工作流原有预备验收步骤，不使用发布凭据。CI merge `b1f48f2ace661567fb9bb0685bb1f37bec05f371` 的树为 `94c2d0b412f1938a9bd9691e4c29dfa8ec6fa23c`，与已审查修复 head 完全一致。[记录](evidence/prepared-preflight.json)给出 UTC 时间、runner／runtime 版本、物理输入与实际结果。数据和模型交互均为合成／无密钥场景。

1. 冻结安装工具、构建源码并执行正常 `prepare:dist`。
2. 离线恢复冻结 Store 并检查每个实际包 manifest。要求全部 570 包，以及非空且可执行的 macOS Codex／Claude SDK 原生输入，不仅依赖安装日志数量。
3. 运行真实 core Host／Profile、浏览器文档预览与品牌持久化；向隔离 Profile 安装 Harbor，再检查组合 Host／Chromium 路径。

实测结果为 570/570 输入、无缺包、85 条匹配 core peer、9 个 core 与 10 个 Harbor 组合 Client、Harbor Python 0.10.3 就绪，以及完整 default／custom／reloaded／reset／reset-reloaded 品牌快照。实际结果单独记录，不将本地 568 输入运行视为等价证据。这是预备验收，不是原生打包 WebView 或模型生成测试。

[首次预检](https://github.com/istarwyh/yourbuddy/actions/runs/42353419140/job/128346222480)验证了 570 输入，但 Settings 关闭后等待 `Default restored` 失败。视频显示品牌已恢复；旧 helper 未观察重置持久化。修正后的 helper 检查精确 reset HTTP／RPC 结果及独立设置读取，并保留原有渲染与重载断言。六项回归在旧同步方式下失败，修改后通过。弹窗关闭原因仍未归因；这是验收同步修正，并非声称修复了产品生命周期问题。


[第二次预检](https://github.com/istarwyh/yourbuddy/actions/runs/42355415779/job/128352321356)验证了同样完整的原生输入，但品牌导航在重置 helper 执行前超时。本地诊断发现已完成的两个 bridge／proxy iframe 仍持有六条同源 Host 流。可控 Chromium fixture 重现原有 30 秒 `load` 超时；关闭已完成的 proxy 页面后，六条流全部释放，排队导航恢复。同一回归在资源清理修正后用时 189 毫秒通过。最终 verifier 仅在全部 proxy 断言后关闭该页面，保留 `load`、30 秒预算与每项产品断言，并保留有界、去敏的资源诊断。这证明了生命周期风险及修正；此前 CI 超时没有保留足够 pending 资源证据，仍不能直接归因。

可控真实 Host 回归将重载后的 Session 列表响应保持到 Settings 打开。产品修复前，释放响应会在没有可见 onboarding 弹窗时关闭 Settings；修复后，Settings 在 Session／model 就绪后仍保持打开，并完成原有重置／持久化旅程。[产品修复记录](../yourbuddy-v0.4.16/evidence/settings-race-repair.json)保留这一区别与本地 568 输入限制；本 PR 将 50 项组件回归加入完整输入 macOS 检查。

## 发行应用验收

[发行工作流](evidence/release-workflow.json)于 2026-11-07 11:03:12 UTC 成功完成；发布步骤于 11:01:51 UTC 完成。精确标签源码通过预备 Host／Profile／Chromium 验收，包含 9 个 core Client、10 个 Harbor 组合 Client、85 条匹配 core peer 及两阶段完整品牌／重置旅程。发行安装日志报告 570 个 registry 包；独立的物理 manifest 与可执行原生输入清单属于上文 PR 预检。发行[工作台截图](screenshots/released-workbench.png)仅包含合成数据。原 CI 附件于 2026-11-14 到期；此处保留其身份、哈希和必要结果摘要，不公开原始日志。

[原生 Offline 记录](evidence/native-offline.json)报告三次启动分别耗时 48.222、11.573 和 12.659 秒。每次均达到真实 Host 经认证就绪，在原生 WebView 中显示 Codex 与 Settings，并与其拥有的 Host 一起干净退出。这里的认证指 Host 就绪，不是账号登录或模型凭据。活动组件为 Harness 与签名离线 Store；全部启动选择 runner Node 24.22.2。首次空 Store 缺包经签名后备 Store 恢复，隔离代理拒绝了四次外部请求。这些启动不能验证无系统 Node 启动、原生 Design 交互／导出或冷启动 Session/controller 恢复。

Harbor 在复制 Python 可执行文件、将 `pyvenv` home 指向不存在的位置并移除 `PYTHONHOME` 后通过迁移运行检查。应用采用 ad-hoc 签名且跳过公证。独立 [Bootstrap 代码签名检查](evidence/bootstrap-codesign.json)确认磁盘上的 ad-hoc 签名有效；没有执行下载的应用，也不能证明 Developer ID、公证或 Gatekeeper 接受。

## 交付状态

- 产品发布：[0.4.17 已公开](https://github.com/istarwyh/yourbuddy/releases/tag/yourbuddy-v0.4.17)，包含 17 个附件；latest 与稳定更新源均指向 0.4.17。失败的 0.4.14、0.4.15 和 0.4.16 标签保持不变，均没有 Release 或安装包。
- 独立公开核验：全部 17 个公开文件已独立下载并核对 SHA-256；全部 68 项限定范围检查通过，包括两个更新包的密码签名、签名组件清单、稳定更新源及两个 DMG 的完整性。已下载 Harness 中所选 Design 2.11.1 固定版本／源码／许可与 Settings 源码均匹配发行提交。[公开 Offline 二进制及清单](evidence/offline-native-binding.json)也与原生 CI 证据精确一致。这不是完整 npm 许可审计，也没有执行下载的软件。
- 源码归档：[独立解压](evidence/source-archive-verification.json)核验了 55,966,712 字节 ZIP、全部 15 个候选变更文件及已查看的合成截图。不可变标签保留候选证据；后续发行结果记录于本页。
- 网站同步：[六个双语线上页面](evidence/website-live.json)均返回 HTTP 200，并包含预期内容和链接；latest 发行链接落到 0.4.17。未执行新的网站部署。
- 未验证范围：以上模型、原生 Design、冷恢复、升级及剩余 issue 限制仍适用。发布与这些检查均未解决上游许可缺口。

## 回滚

保留不可变的 [0.4.13](https://github.com/istarwyh/yourbuddy/releases/tag/yourbuddy-v0.4.13) 及其原始签名更新清单。撤回时可恢复此前 latest 发行标记与稳定更新源，无须移动标签或替换安装包字节。由于更新器只接受更新版本，已更新应用需手动重装旧 DMG。先退出应用并备份数据；数据降级兼容性尚未验证。

[独立下载的更新基线](../yourbuddy-v0.4.15/evidence/rollback-updater-0.4.13.json)为 1,971 字节，SHA-256 为 `098682e27e293fbca5122b23bf5519b1dde900c0cf1d282f4f2617658ac8947c`。这记录的是回滚准备，并非已执行回滚。
