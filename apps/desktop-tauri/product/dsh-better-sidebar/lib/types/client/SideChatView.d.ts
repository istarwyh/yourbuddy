import type { Context } from '../context-types.ts';
import type { SessionScope } from './api.ts';
import type { SidebarTab } from './state.ts';
import { type SidechatSubmitKey } from '../prefs-shared.ts';
/** The thread a tab is bound to (durable in tab.meta across refreshes). */
export declare function sidechatThreadIdOf(tab: SidebarTab): string | undefined;
/** Park a thread id for the NEXT sidechat openTab to reattach. */
export declare function parkSidechatReopen(threadId: string): void;
/** Consume the parked reopen target (undefined = mint a fresh thread tab). */
export declare function consumeSidechatSeed(): string | undefined;
/** One side conversation tab (one thread per tab, Codex-style). */
export declare function SideChatView(props: {
    ctx: Context;
    scope: SessionScope;
    tab: SidebarTab;
    visible: boolean;
    /** Which gesture submits the draft: a plain `Enter` (the default, host
     *  semantics) or exactly `Cmd+Enter` / `Ctrl+Enter`. The side card settings
     *  page feeds it from the side-chat feature's own preferences (see
     *  `sidechatSubmitKeyOf` in prefs.ts); absent reads the default, which keeps
     *  every existing composition unchanged. */
    submitKey?: SidechatSubmitKey;
}): React.ReactNode;
