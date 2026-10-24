# Work with files and results

English | [中文](workspace.zh.md)

Keep the conversation beside the work it produces.

## Select the right directory

Add and select a workspace before starting. Agent file operations and Harbor tool requests use the session's working directory. Use a practice folder for unfamiliar tasks and confirm the paths reported by tools.

## Inspect outputs

Better Sidebar provides a file tree, editor, previews, terminals, Git views, and background tasks. Open generated Markdown or code, compare it with your request, and inspect command results. Git operations and real terminals affect your actual workspace.

<a id="read-office-files"></a>
## Read office files

Open a PDF, Word document, presentation, or workbook from the file tree beside the conversation. These formats use the existing document preview in the right Sidebar, rather than the workbench's code editor. Session file links use the same preview when opened inside YourBuddy. Scroll through document pages or slides, use the floating zoom controls, and select or copy available text. For spreadsheets, switch worksheet tabs and scroll the grid. Close the preview tab when finished; opening the file again creates a fresh view.

| Files | Read-only preview | Important limits |
|---|---|---|
| `.pdf` | Pages, zoom, text selection | Scanned pages have no selectable text without OCR; OCR is not included |
| `.docx`, `.doc` | Local conversion to PDF pages | Fonts and layout can differ from Word; missing-font warnings cover DOCX, not binary DOC |
| `.pptx`, `.ppt` | Local conversion to static PDF pages | No animation playback; missing-font warnings cover PPTX, not binary PPT |
| `.xlsx` | Worksheets, scrolling, selection and copying | Saved formula results only; charts, images, shapes, pivot tables and conditional formatting are not rendered |
| `.xls` | Worksheets and saved cell values | Less formatting fidelity than XLSX; fonts, borders and frozen panes are unsupported |
| `.csv`, `.tsv` | Scrollable tables | Values remain literal text, including formula-looking text |

Workbook previews do not recalculate formulas. A missing saved result stays blank; a warning identifies results that may be incomplete or inaccurate. XLSX previews also identify detected drawings and conditional formatting that are omitted. Read these notices before relying on a preview for a report or calculation.

### When a preview is incomplete

For a missing-font warning, inspect its details and compare important pagination or Chinese text in the original application. For an unsupported, oversized, or failed preview, use the document header's **Open** menu to choose an installed application or **Show file location**. Unsupported and oversized files also offer this recovery action in the preview area. Size and conversion limits reject the preview rather than silently showing a truncated file; the [preview reference](../../../packages/client/ui-sidebar-documentpreview/README.md) and [conversion reference](../../../packages/document/office-to-pdf/README.md) describe the limits.

### Offline use and privacy

The preview components belong to the default runtime; no extra Office preview plugin is required. Complete the [installer's component setup](download.md) before expecting offline use: Bootstrap can download missing runtime components, whereas the Offline installer seeds those components. Opening these previews does not modify the source file or submit its contents to a model or third-party conversion service. PDF and spreadsheet rendering runs in the app; Word and PowerPoint conversion runs on the Host computer. Separately asking an agent to read or change a file follows that task's model and tool settings.

This format matrix describes the preview's capabilities, not a guarantee of identical Microsoft Office layout. Installer-specific sample checks, performance measurements, and remaining verification gaps belong to each [release's verification record](../../releases/README.md).

## Delegate a focused task

The default Codex preset can delegate a self-contained task to Codex Subagent. Include the objective, relevant files, and completion criteria. It shares the working directory but does not inherit the entire parent conversation; native Codex login and permission settings apply. Loading the provider does not start a child process.

## Manage context deliberately

A Skill supplies reusable task instructions; a plugin adds runtime capabilities or UI. Extra instructions and tools can consume context. Use [Context Doctor](plugins/context-doctor.md) before trimming, then verify a representative task after any change.

See [Better Sidebar](plugins/better-sidebar.md) for optional controls and [evaluation](evaluation.md) for checking repeated task quality.
