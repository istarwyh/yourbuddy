# YourBuddy 0.4.13

PDF, Word, PowerPoint and Excel opened from the default middle Files workbench now reuse the existing DSH readers. Files state and native identity are retained. No new viewer dependencies are added.

默认中间 Files 工作台的 PDF、Word、PPT 和 Excel 复用现有 DSH 阅读器，保留文件树状态与原生文档身份，没有新增查看器依赖。

Prepared Chromium verifies four formats and close/reopen; native Tauri window acceptance remains unverified and was explicitly waived. Native Office conversion may report missing Liberation Sans; the earlier WASM check reported missing 宋体. Existing download-only tabs need closing and reopening. Separate repeated-open, narrow-screen background and missing-dependency UI cases remain unverified.

预准备 Chromium 已验证四格式与关闭重开；原生 Tauri 窗口未验收，用户已明确豁免。原生 Office 转换可能报告缺少 Liberation Sans，此前 WASM 检查报告缺少宋体。已有仅下载标签需关闭重开；独立重复打开、窄屏后台和缺依赖 UI 场景仍未验证。

Verification archive / 验证归档: https://github.com/istarwyh/yourbuddy/tree/yourbuddy-v0.4.13/docs/releases/yourbuddy-v0.4.13
