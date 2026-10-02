/**
 * The 4 built-in file viewer descriptors (image / markdown / html / code),
 * exactly like external plugins register theirs.
 *
 * DSH 0.1.7 ships `ui-sidebar-documentpreview`, its own code / spreadsheet /
 * office / pdf / image / html / markdown / text previews with zoom and
 * auto-refresh. Native file-resource opens yield to those previews, while the
 * image viewer here remains the fallback for files opened inside this plugin's
 * own editor workbench. The plugin otherwise keeps only the surfaces where it
 * is not equivalent:
 *  - `markdown` — this plugin's own renderer (front matter, embedded HTML
 *    sanitation, floating TOC), which the user prefers to the host's;
 *  - `html` — the sandboxed iframe preview plus the host-less
 *    `htmlViewerNoSandbox` / `htmlViewerDefaultUnsafe` escape hatches;
 *  - `code` — the catch-all (`exts: []`, lowest priority) that claims any
 *    file no other viewer did, and it is an EDITABLE CodeMirror with save —
 *    the host's equivalents are read-only previews.
 * The yielded ids (pdf / binary-download) are deliberately NOT registered
 * here; an external plugin may still claim them through this service. Office
 * previews (.docx / .xlsx / .pptx) were already not built
 * in — they live in the recommended office plugin (see plugins-viewers.ts),
 * which registers the same ids through this service.
 *
 * The heavy viewers (the CodeMirror-backed markdown/html/code) render
 * through {@link lazyChunkComponent} wrappers — their libraries are fetched
 * only when such a file is first opened (see chunk-loader.ts). The
 * descriptor metadata (id/exts/priority) is identical either way, so
 * matching semantics and external-plugin overrides are unaffected; the
 * `component` wrapper keeps the descriptor contract `(props) => ReactNode`.
 *
 * Every viewer carries the declarative settings-surface fields — `title`
 * and `icon` — so the Side card settings page can render the enable/disable
 * inventory without hardcoding (eating our own dogfood).
 */
import { FileTypeIcon, IconCodeOutlineRegular } from '@deepseek-ai/dsh-client-ui-primitives'
import { lazyChunkComponent } from '../lazy-chunk.tsx'
import {
  IconMarkdownOutline16,
  IconHtmlOutline16,
} from '../icons.tsx'
import type { ComponentType } from 'react'
import type { FileViewerDescriptor, FileViewerProps } from '../service.ts'
import { t } from '../locales.ts'
import css from '../sidebar.module.css'

/**
 * Lazy wrapper over the chunk-resident viewer component. The `pick`
 * function is module-level (stable identity — the wrapper effect depends
 * on it); the cast bridges the chunk exports record to the descriptor prop
 * shape (the view reads only its own subset of FileViewerProps).
 */
const LazyTextEditor = lazyChunkComponent<FileViewerProps>('editor', (mod) => mod.TextEditor as ComponentType<FileViewerProps> | undefined)

/** The 4 built-in file viewer descriptors. */
export function builtinViewers(): readonly FileViewerDescriptor[] {
  return [
    {
      id: 'image',
      title: () => t('viewerImage'),
      icon: (size: number) => <FileTypeIcon path="image.png" size={size} />,
      exts: ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'bmp', 'ico', 'avif'],
      fetchStrategy: 'mediaUrl',
      component: ({ mediaUrl: url, title }) => (
        <div className={css.editorPdf}>
          <div className={css.editorPdfStage}>
            <img className={css.editorPdfFrame} style={{ objectFit: 'contain' }} src={url} alt={title} />
          </div>
        </div>
      ),
    },
    {
      id: 'markdown',
      title: () => t('viewerMarkdown'),
      icon: (size: number) => <IconMarkdownOutline16 size={size} />,
      exts: ['md', 'markdown'],
      fetchStrategy: 'fsRead',
      component: (props) => <LazyTextEditor {...props} />,
    },
    {
      id: 'html',
      title: () => t('viewerHtml'),
      icon: (size: number) => <IconHtmlOutline16 size={size} />,
      exts: ['html', 'htm'],
      fetchStrategy: 'fsRead',
      // Declarative settings: the sandbox escape hatch and the default-unsafe
      // start state render under this viewer's row in the Side card settings
      // page (both warned on).
      settings: {
        toggles: [{
          key: 'htmlViewerNoSandbox',
          title: () => t('settingsHtmlSandboxTitle'),
          desc: () => t('settingsHtmlSandboxDesc'),
        }, {
          key: 'htmlViewerDefaultUnsafe',
          title: () => t('settingsHtmlDefaultUnsafeTitle'),
          desc: () => t('settingsHtmlDefaultUnsafeDesc'),
        }],
      },
      component: (props) => <LazyTextEditor {...props} />,
    },
    {
      id: 'code',
      title: () => t('viewerCode'),
      icon: (size: number) => <IconCodeOutlineRegular size={size} />,
      exts: [],
      priority: -100,
      fetchStrategy: 'fsRead',
      component: (props) => <LazyTextEditor {...props} />,
    },
  ]
}
