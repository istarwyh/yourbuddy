/** Present Portable checkpoint text to non-Codex adapters that reject custom blocks. */
import type { Context } from '@deepseek-ai/cordis';
import type { GenerateOptions } from '@deepseek-ai/dsh-llm';
export declare function projectForeignCheckpointRequest(options: GenerateOptions): GenerateOptions;
/** Use the public LLM waterfall; recurse only once with a detached request. */
export declare function installForeignCheckpointProjection(ctx: Context): () => void;
//# sourceMappingURL=foreign-checkpoint-projection.d.ts.map