import type { Volatile } from '@deepseek-ai/cordis';
/** Accept direct fixture values and live values supplied by the DSH Loader. */
export type LiveValue<T> = T | Volatile<T>;
export declare function liveValue<T>(value: LiveValue<T>): T;
//# sourceMappingURL=volatile-config.d.ts.map