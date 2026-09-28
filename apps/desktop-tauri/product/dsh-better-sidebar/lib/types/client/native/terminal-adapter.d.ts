import type { Context } from '../../context-types.ts';
import type { BetterSidebarService } from '../service.ts';
import { type SidebarStore } from '../state.ts';
/** Register the workbench terminal tab and retain every cached Session occurrence. */
export declare function registerWorkbenchTerminal(ctx: Context, store: SidebarStore, service: BetterSidebarService): () => void;
