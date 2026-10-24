# Better Sidebar

English | [中文](better-sidebar.zh.md)

Application snapshot version: `0.21.1`, recorded in the [bundled source manifest](../../../../apps/desktop-tauri/product/dsh-better-sidebar/YOURBUDDY_UPSTREAM.json). Source: [omdsh-dev/DSH-better-sidebar](https://github.com/omdsh-dev/DSH-better-sidebar).

## Problem addressed

Users can inspect a file tree, editor, image and Markdown previews, real terminals, Git differences, background tasks, and other plugin pages in the primary workbench beside the conversation instead of relying entirely on the assistant's description.

## Usage

At desktop width, the split-pane workbench stays visible to the left of the conversation even when its dock state was collapsed in an earlier session. Drag the divider to resize the two regions. File-tree clicks, **Open in new tab**, explorer reveal, and Changes-tab file actions open in the Session that owns the source tab. Use terminals or Git views to review code changes. The embedded Browser renders ordinary cross-origin sites without a sandbox by default; enable the restricted iframe sandbox in Side card settings when preferred. On a narrow window, the conversation remains primary and Better Sidebar opens through its overlay control. Recommended-plugin destinations, embedded-browser external actions, and terminal HTTP(S) links open in the system browser. In YourBuddy, run a recommended plugin's install command once; its isolated Web Profile runs dependency build scripts without a separate `pnpm approve-builds` step.

YourBuddy 0.3.10 records the file and Browser checks in its [verification record](../../../releases/yourbuddy-v0.3.10/README.md).

## Reason for default inclusion

It completes the path from requesting work to producing results and human inspection, while giving other plugins a stable primary region for pages and file viewers.

### Office previews without another plugin

Better Sidebar delegates PDF, Office and spreadsheet reading to DSH's existing document preview. YourBuddy reuses PDF.js, local LibreOffice conversion, and the FortuneSheet/ExcelJS/SheetJS workbook viewer rather than installing a second viewer. See the [file support matrix](../workspace.md#read-office-files), the [preview's dependencies](../../../../packages/client/ui-sidebar-documentpreview/package.json), and [third-party notices](../../../../THIRD_PARTY_NOTICES.md) for the maintained implementation and licensing details. PDF.js and SheetJS CE use Apache-2.0; FortuneSheet and ExcelJS use MIT; the LibreOffice kit retains MPL-2.0 and its corresponding-source obligations.

The [Office preview plugin's manifest](https://github.com/HuanLinOTO/dsh-plugin-better-sidebar-plugin-office/blob/master/package.json) declares version `0.1.2`, AGPL-3.0 and a Better Sidebar peer range of `^0.6.0`. The [Excel Panel manifest](https://github.com/Melody-max114/dsh-excel-panel/blob/main/package.json) declares version `0.6.1`, MIT and `^0.12.0`; its main additions are editing, recalculation and saving. Neither range includes the bundled `0.21.1`, and neither plugin is preinstalled. Marketplace discovery does not establish compatibility. Adding either requires a separate compatibility and license review; editing is outside the read-only preview scope.

[docx-preview](https://github.com/VolodymyrBaydalka/docxjs) is an Apache-2.0 browser alternative for DOCX, but its HTML layout and pagination limits do not replace the existing Word/PPT conversion path. [ONLYOFFICE Docs](https://github.com/ONLYOFFICE/DocumentServer) is an AGPL-3.0 server suite with deployment and integration costs, not an extra desktop viewer. Neither is required or installed for this workflow.

## Limits

Real terminal operations affect the actual working directory; a panel is not an isolation guarantee. Model-facing `terminal_*` and `sidebar_open` tools default to off and require explicit activation. The default unrestricted Browser gives embedded cross-origin pages normal iframe capabilities, including top-level navigation. The restricted setting keeps the GUI origin and unapproved loopback addresses opaque. Every mode remains subject to site iframe policies and browser rules, so some websites cannot be embedded. Side conversations remain a Beta capability. YourBuddy maintains these behaviors as replayable product patches while Better Sidebar keeps its upstream Portal presentation by default outside YourBuddy.
