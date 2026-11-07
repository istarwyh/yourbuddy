import type { ReactNode } from 'react';
import type { ConfigForm } from '@deepseek-ai/dsh-client-ui-settings/client';
import type { CodexAuthRpcClient } from '../rpc-contract.ts';
import type { CodexAuthKey } from './locales.ts';
import type { ImageQuality, ImageSize } from '../image-options.ts';
export interface LlmSettingsView {
    longContextEnabled: boolean;
    excludedModelIds?: string[];
}
export interface SearchSettingsView {
    enabled: boolean;
    mode: 'live' | 'cached' | 'indexed';
    contextSize: 'low' | 'medium' | 'high';
    fallbackModel: string;
    maxOutputTokens: number;
}
export interface ImageSettingsView {
    enabled: boolean;
    model: string;
    n: number;
    size: ImageSize;
    quality: ImageQuality;
    background: 'auto' | 'opaque' | 'transparent';
}
export interface CodexCapabilitySettingsProps {
    rpc: CodexAuthRpcClient;
    t: (key: CodexAuthKey) => string;
    subscribe: (listener: () => void) => () => void;
    llmScope: ConfigForm<LlmSettingsView>;
    searchScope: ConfigForm<SearchSettingsView>;
    imageScope: ConfigForm<ImageSettingsView>;
}
/** One navigable GPT Auth section containing Auth/LLM, Search, and Image Creation cards. */
export declare function CodexCapabilitySettings({ rpc, t, subscribe, llmScope, searchScope, imageScope, }: CodexCapabilitySettingsProps): ReactNode;
//# sourceMappingURL=CodexCapabilitySettings.d.ts.map