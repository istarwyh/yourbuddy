---
description: "Y8 文档、官网和应用内 Help 的实施范围、页面改动、现有能力复用与验收。"
---

# YourBuddy 文档、官网与应用内帮助方案

[English](implementation-plan.md) | 中文

## 摘要

本方案让用户先用 Y8 完成工作，在遇到专业需求时找到合适的扩展方式，并借助现有 DSH 能力开发插件。本轮交付是使用说明、官网导航和应用内帮助；Y8 的产品定位是可定制的 AI 工作台。

状态：文档、官网导航和 Help 已在源码中实现，验证结果见[实施记录](verification.zh.md)。编制日期：2026-09-06。本文保留已确认的实施范围；安装包验收与公开发布单独记录。

## 目录

- [具体改什么](#changes)
- [文档：从使用到扩展](#docs)
- [官网：让两条路径可找到](#website)
- [应用：加入帮助与指南](#help)
- [DSH 与 Y8 的职责](#responsibilities)
- [实施顺序与验收](#acceptance)
- [后续演进](#future)
- [开发备注](#dev-note)

<a id="changes"></a>
## 具体改什么

| 位置 | 拟议改动 | 用户能得到什么 |
|---|---|---|
| 产品文档 | 整理基础使用、默认插件、扩展选择、插件开发与 Harbor 案例 | 知道如何开始、已有能力为什么存在、专业需求应从哪里入手 |
| 官网 | 在现有首页、导航和文档目录中呈现“开始使用”和“扩展 Y8” | 从官网进入完整说明，无需先浏览源码树 |
| Y8 应用 | 在侧栏底部增加“帮助与指南”菜单 | 工作时直接打开快速开始、默认插件、开发指南、排障和反馈入口 |

本轮不增加插件项目管理器、独立开发实例、构建监听平台、模板生成器、动态代码转包、自动打包升级、另一套插件市场或新的 SDK；不修改 DSH Agent Loop。上述工具设计保留在[未采用的研究方案](deferred-research.zh.md)，不属于当前任务或验收前提。

<a id="docs"></a>
## 文档：从使用到扩展

以[产品文档](../../user/product/index.zh.md)为正文来源。基础使用先教用户完成任务，开发入口再逐步介绍配置、Skill 和插件，接口细节链接到已有教程及包文档。

### 基础使用与默认插件

| 现有页面 | 拟议修改 |
|---|---|
| [产品理念](../../user/product/about.zh.md) | 说明默认组合、用户可选模型与工作目录，以及通过 DSH 插件适配专业工作；小团队共享工作方法和扩展，不承诺云端协作 |
| [快速开始](../../user/product/start.zh.md) | 保留“接入模型 → 选择工作区 → 生成 hello-yourbuddy.md → 打开检查”的任务；补齐常见卡点与对应排障链接，不把开发或评测准备加入首次使用 |
| [默认插件总览](../../user/product/plugins/index.zh.md)及子页 | 每个插件明确解决的问题、默认集成理由、使用入口、额外前提和来源；区分预装、已配置和可实际使用 |
| [设置](../../user/product/settings.zh.md)与[排障](../../user/product/troubleshooting.zh.md) | 对应应用里真实的设置名称；从账号、工作区、插件前提和外链问题指向可执行的恢复步骤 |
| [文档目录](../../user/product/index.zh.md) | 分成“开始使用”“已有能力”“按需扩展”，给每个入口一句用途说明 |

保留现有五个外部默认插件：Codex Auth 解释账号接入，Better Sidebar 解释文件与改动检查，Context Doctor 解释上下文诊断，Plugin Marketplace 解释寻找和安装扩展，Harbor Evolution 解释评测与改进。各插件的具体版本和操作仍由其页面维护，不在首页重复维护版本清单。

[Harbor 页面](../../user/product/plugins/harbor-evolution.zh.md)注明 Harbor Self Evolving 是 Y8 维护者本人深度开发的独立项目。新增简短的开发案例部分，说明它如何组合插件、Skill 和 Python Adapter，以及使用者在哪里查看结果、配置依赖和排查失败；以核对后的项目文档为依据。它展示专业扩展的可能性，首个插件教程使用更小的例子。

### 重写“开发者入口”

将[开发者入口](../../user/product/develop.zh.md)改为“扩展 Y8”，保留现有路径。页面先回答用户的需求，再链接技术材料；桌面源码构建和站点维护放到末尾的贡献者入口。

| 用户的问题 | 页面给出的引导 | 深入材料 |
|---|---|---|
| 现有能力能否满足需求？ | 先查默认插件、插件市场与现有设置；给出适用场景 | 默认插件页与设置页 |
| 我只是想固定一种做事方式 | 用 Skill 描述流程、材料和输出标准；需要组合能力时再介绍 Preset／Bundle | 工作区指南及已核对的相关说明 |
| 我需要接入新服务或增加操作／界面 | 先判断已有 MCP 或配置是否足够，再进入原生插件开发 | [第一个插件](../../user/develop/basic/index.zh.md)、[工具](../../user/develop/basic/tool.zh.md)、[配置](../../user/develop/basic/config.zh.md) |
| 怎样借助 AI 开发？ | 描述一个有验收样例的小需求，引导 Creator 查询实际接口后修改源码 | Creator 使用指南与开发 Skill |
| 怎样保存和交给同事？ | 按现有项目和打包教程准备源码、配置、依赖与使用说明，接收者独立验证 | [打包与发布](../../user/develop/basic/publish.zh.md)及项目 README |

页面提供一段可复制的需求说明：要解决的任务、输入及来源、期望输出、可修改的范围、所需账号／配置、一个验收样例。示例可以是“只读查询团队构建服务的失败任务，返回失败原因和链接，不触发重跑；用脱敏响应验证结果”。这是如何定义需求的示例，不表示 Y8 已集成该服务。

### 串起现有开发教程

保留[第一个插件](../../user/develop/basic/index.zh.md)作为技术教程来源，核对并补全准备、加载、修改、观察结果、停止和下一步。它目前要求准备好的源码 checkout，说明中必须写清这个起点；不能把它描述成仅安装 Y8 即可完成的流程。

将首个插件、工具、配置、打包四篇入门页发布到产品站，拟议路径为 `docs/develop/first-plugin`、`docs/develop/tool`、`docs/develop/config`、`docs/develop/publish`。复用这些 Markdown，不复制另一套 Y8 教程。框架、事件、服务与复杂界面材料继续通过明确的深入阅读链接提供。

新增一篇简短的 Creator 使用指南，拟议源文件为 `docs/user/product/creator.md` 及中文配对，站点路径为 `docs/develop/creator`。内容依次为：适用需求、实际可用入口及前提、描述需求、查询当前接口、试验与检查、保存源码及继续阅读。先在目标 Y8 安装版本核对入口；若未提供该入口，就如实给出已验证的 DSH 源码使用路径，不新增产品运行时。

[Creator 组合](../../../packages/preset/agent-presets/presets/cordis/agent.cordis.yml)和[开发 Skill](../../../packages/preset/agent-presets/presets/cordis/skills/cordis-plugin-development/SKILL.md)是已有复用点。开发指南解释临时动态试验与持久化源码的区别，并链接[动态工具说明](../../../packages/extensions/tool-cordis/README.zh.md)。本轮不提供“自动保存为插件项目”按钮，不把临时成功当成可分发插件。

<a id="website"></a>
## 官网：让两条路径可找到

沿用现有 OINK 站点和视觉风格，改动集中在信息组织与链接。首页主入口保留“从第一个任务开始”；扩展入口使用“按你的需要扩展”，链接到开发入口，并配一句具体说明：使用现有插件，或借助 DSH 开发自己的能力。

| 维护位置 | 拟议改动 |
|---|---|
| [首页中文数据](../../user/product/home-data/zh.json)与[英文数据](../../user/product/home-data/en.json) | 调整已有次级行动入口和插件区短文案，指向使用与扩展；不另加一组空泛宣传卡片 |
| [站点配置](../../../website/product/hugo.yaml) | 导航增加“扩展 Y8”，目标为 `docs/develop`，同步英文名称与路由 |
| [页面映射](../../../website/product-pages.json) | 将 `docs/develop` 设为栏目（`section: true`），注册 Creator 指南与四篇已有入门教程，保持双语、锚点与跳转 |
| [产品文档目录](../../user/product/index.zh.md)与[路线图](../../user/product/roadmap.zh.md) | 显示基础使用与扩展路径；路线图说明引导、案例和已发现问题，不把开发平台列为确定交付 |

正文继续维护在 `docs/`；主题模板只承担呈现。基础教程在产品站内连续阅读，确需进入 GitHub 的贡献者或参考材料明确标注目的地。网站页面、搜索结果和 Markdown 导出使用同一正文。

构建与发布遵循[站点维护指南](../../product-website.zh.md)。用 GitHub Pages 的实际子路径验证中英文导航和 Help 目的地址；不把本地开发端口写进安装包。发布前不凭源码推断安装包或插件已经可用。

<a id="help"></a>
## 应用：加入帮助与指南

在侧栏底部增加一个常驻帮助入口。展开时显示“帮助与指南”，收起时显示图标并提供同名提示与可访问名称。首版使用一个简短菜单，不新增工作台主页面，也不让用户先创建会话或接入模型才能阅读帮助。

| 菜单项 | 内容 | 目的地（中文站内相对路径） |
|---|---|---|
| 快速开始 | 模型、工作区、第一个任务 | `docs/start/` |
| 默认插件 | 预装能力、理由和使用前提 | `plugins/` |
| 扩展 Y8 | 选择扩展方式、定义需求、开发与 Creator 教程 | `docs/develop/` |
| 故障排查 | 常见问题与恢复步骤 | `docs/troubleshooting/` |
| 反馈问题 | 用户自行描述问题 | 项目 GitHub Issues |

中文路径拼接实际站点基址，英文使用对应的 `en/` 路径。Help 展示“使用指南在浏览器中打开”这一简短说明；本地菜单本身不依赖文档服务器响应。打开链接不能替换工作台会话页面。外部网页离线或不可达时不承诺离线正文；应用打开请求失败时给出提示并允许复制地址，不增加后台网络探测。

### 代码改动位置

复用自有[Personal Workbench 客户端入口](../../../apps/desktop-tauri/product/personal-workbench/src/client/index.tsx)，通过已有 `sidebar.footer.action` 槽位注册 Help。该槽位及展开状态由[侧栏公开类型](../../../packages/client/ui-sidebar/src/client/contract/slots.ts)定义，当前方案无需修改 DSH 侧栏内部实现。

拟议新增 `HelpMenu.tsx` 承担菜单和打开失败提示，新增 `help-links.ts` 集中维护站点基址与目的地；两者位于 Personal Workbench 的 `src/client/`。文案进入现有[语言字典](../../../apps/desktop-tauri/product/personal-workbench/src/client/locales.ts)，样式复用现有组件。只为实际需要补充的视觉规则更新[样式文件](../../../apps/desktop-tauri/product/personal-workbench/src/client/styles.ts)。

复用[桌面外链模块](../../../apps/desktop-tauri/product/personal-workbench/src/client/desktop-external-links.ts)的 URL 校验与 `requestDesktopExternalLinkOpen` 请求。当前点击拦截针对 Markdown 外链，Help 必须主动调用该请求，不能假设普通链接会自动进入桌面桥接。保持现有来源校验与 HTTP(S) 限制；不为 Help 新增 Rust 命令或改写认证流程。

首版的场景帮助限定在 Y8 自有设置卡片：需要时增加“查看使用说明”链接，指向设置页相应部分。插件市场等外部快照先通过全局 Help 获得说明，不为加一个链接修改每个外部插件。反馈入口只打开问题页面，不自动上传会话或配置。

<a id="responsibilities"></a>
## DSH 与 Y8 的职责

DSH 继续负责插件运行、公开服务／事件／UI 槽位、Creator、动态试验和原生组合机制。Y8 负责选择默认组合，把可用能力讲清楚，提供可找到的帮助，并用实际产品验证相关教程。专业用户仍使用普通源码、已有工具与自己的编辑器开发插件。

对 Creator 开发 Skill，本轮先核对其现有指引与教程是否一致，仅修正实际错误或缺失引用。Y8 特有安装说明留在产品指南，不向通用 DSH Skill 塞入产品专属流程，也不让普通会话默认加载整套开发说明。若教程暴露出缺少可独立获取的依赖或公开接口，记录具体阻碍和受影响步骤，另行界定修复，不通过文案承诺掩盖缺口。

<a id="acceptance"></a>
## 实施顺序与验收

| 顺序 | 交付范围 | 完成证据 |
|---|---|---|
| 1. 文档 | 更新产品页、重写扩展入口、增加 Creator 指南，核对现有开发教程与 Skill | 一位未参与实现的读者能找到第一步；维护者在声明环境执行教程，记录产物、前提和失败修正 |
| 2. 官网 | 更新首页入口、导航和页面映射 | 中英文两条路径可连续阅读；搜索、锚点、Markdown 和子路径链接正确；页面就绪后才供 Help 使用 |
| 3. 应用 Help | 注册菜单、集中链接、国际化、外链失败提示及有限场景帮助 | 实际 Y8 中打开每个目的地，键盘与折叠侧栏可用，打开帮助后会话保持原状 |
| 4. 集成与发布准备 | 验证默认任务未受影响，更新受影响说明及发布记录 | 分别记录文档检查、站点检查、应用验收和未验证范围；实际发布沿用现有同步流程 |

文档执行 `pnpm run test:docs`、`pnpm run doc-sync` 和适用的 `pnpm run lint`；官网输入变更执行 `pnpm run website:check`。若修改 SDK 站点映射，再执行对应 SDK 站点检查。执行结果以实施记录为准。

Help 实现遵循[测试政策](../../testing.zh.md)：增加经真实可运行示例装配的无密钥快照，覆盖中英文菜单及打开失败；验证有效目的地、无效 URL 拒绝和语言路径映射。浏览器／桌面验收覆盖键盘打开与关闭、侧栏展开与收起、深浅主题、外链成功与失败，以及打开后返回原会话。构建成功不能替代这些可见结果。

验收不以页面数量、插件数量或预设提速比例判断完成。核心是三件事：新用户按指南完成一个实际任务；专业用户能选择扩展方式并按声明环境跑通一个小插件；应用用户能直接找到对应帮助。Harbor 作为深入案例，不要求每位新用户准备它的评测环境。

<a id="future"></a>
## 后续演进

第一步交付本方案中的文档、官网与 Help。之后根据实际开发中卡住的具体步骤补齐案例或接口说明。只有出现说明无法解决、可复现且重复发生的问题时，再讨论对应的小工具；不预先排期整套插件开发平台。团队复用首先讲清项目、配置与使用说明的交付，协作产品能力另行定义。

<a id="dev-note"></a>
## 开发备注

本文维护已确认的实施范围；[决策记录](../../../.agents/notes/implemented/feature/2026-09-06-yourbuddy-docs-and-help.zh.md)维护取舍。[实施记录](verification.zh.md)说明实际运行结果和剩余验证范围。当前工作不包含产品发布。
