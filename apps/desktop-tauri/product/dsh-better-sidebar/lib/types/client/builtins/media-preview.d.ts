import type { ReactNode } from 'react';
import type { FileViewerProps } from '../service.ts';
/** Extensions rendered with an `<audio>` transport instead of a video stage. */
export declare const AUDIO_EXTS: readonly string[];
/** Whether this path belongs on the audio transport. */
export declare function mediaIsAudio(path: string): boolean;
export declare function MediaPreview(props: FileViewerProps): ReactNode;
