# Better Sidebar

[English](better-sidebar.md) | 中文

随应用集成的快照版本：`0.21.1`，记录于[随包来源清单](../../../../apps/desktop-tauri/product/dsh-better-sidebar/YOURBUDDY_UPSTREAM.json)。来源：[omdsh-dev/DSH-better-sidebar](https://github.com/omdsh-dev/DSH-better-sidebar)。

## 解决的问题

用户不必只依据助手描述判断完成情况，可以在对话旁的主工作区查看文件树、编辑器、图片与 Markdown 等预览、真实终端、Git 差异、后台任务及其他插件页面。

## 使用方式

桌面宽度下，即使早先会话保存的 Dock 状态为折叠，Split Pane 工作台仍会显示在对话左侧。拖动分隔条调整两侧宽度。文件树点击、**在新标签页中打开**、Explorer Reveal 与 Changes Tab 文件动作都会在来源 Tab 所属的 Session 中打开。通过终端或 Git 面板检查代码变化。内嵌浏览器默认不使用沙箱，可以渲染普通跨源网站；如有需要，可在 Side Card 设置中启用受限 iframe 沙箱。窗口较窄时，对话仍是主界面，Better Sidebar 通过 Overlay 控件打开。推荐插件目标、内嵌浏览器的外部打开操作以及终端中的 HTTP(S) 链接会在系统浏览器中打开。在 YourBuddy 中，只需运行一次推荐插件的安装命令；其隔离 Web Profile 会执行依赖构建脚本，无需另行运行 `pnpm approve-builds`。

YourBuddy 0.3.10 在[验证记录](../../../releases/yourbuddy-v0.3.10/README.zh.md)中记录文件与浏览器检查。

## 默认集成的理由

它补全“提出任务 → 产生结果 → 人工检查”的最后一步，也为其他插件页面和文件预览器提供稳定的主区域。

### 无需额外插件的 Office 预览

Better Sidebar 将 PDF、Office 与表格阅读交给 DSH 已有的文档预览。YourBuddy 复用 PDF.js、本地 LibreOffice 转换，以及 FortuneSheet/ExcelJS/SheetJS 工作簿查看器，不另装一套查看器。当前实现与许可证详情见[文件支持矩阵](../workspace.zh.md#read-office-files)、[预览依赖](../../../../packages/client/ui-sidebar-documentpreview/package.json)及[第三方声明](../../../../THIRD_PARTY_NOTICES.md)。PDF.js 与 SheetJS CE 使用 Apache-2.0；FortuneSheet 与 ExcelJS 使用 MIT；LibreOffice kit 保留 MPL-2.0 及其对应源代码义务。

[Office 预览插件清单](https://github.com/HuanLinOTO/dsh-plugin-better-sidebar-plugin-office/blob/master/package.json)声明版本 `0.1.2`、AGPL-3.0，以及 Better Sidebar peer 范围 `^0.6.0`。[Excel Panel 清单](https://github.com/Melody-max114/dsh-excel-panel/blob/main/package.json)声明版本 `0.6.1`、MIT 与 `^0.12.0`；其主要增量是编辑、重算和保存。两个范围都不包含随包的 `0.21.1`，两个插件都没有预装。能在市场发现并不代表兼容。添加任何一个都需要单独的兼容性与许可证审查；编辑不属于只读预览的范围。

[docx-preview](https://github.com/VolodymyrBaydalka/docxjs) 是采用 Apache-2.0 的浏览器端 DOCX 替代方案，但其 HTML 排版与分页限制不能取代已有的 Word/PPT 转换路径。[ONLYOFFICE Docs](https://github.com/ONLYOFFICE/DocumentServer) 是采用 AGPL-3.0 的服务端套件，带来部署与集成成本，并非额外的桌面查看器。此流程不依赖也不安装两者。

## 限制

真实终端操作会影响实际工作目录；面板不是隔离环境的保证。面向模型的 `terminal_*` 与 `sidebar_open` 工具默认关闭，需要用户显式开启。浏览器默认不受限，内嵌跨源页面因此获得普通 iframe 能力，包括顶层导航。受限设置会让 GUI Origin 与未获准的 Loopback 地址保持不透明。所有模式仍受目标站点 iframe 策略与浏览器规则限制，部分网站无法嵌入；侧边对话仍属 Beta 能力。YourBuddy 以可重放产品补丁维护这些行为；在 YourBuddy 之外，Better Sidebar 仍默认使用上游 Portal 展示方式。
