import { SidebarError } from './wire.ts';
/**
 * Convert a filesystem read failure into the message returned by sidebar routes.
 * ENOENT stays readable without exposing Node's platform-specific error text.
 */
export declare function fileReadError(path: string, error: unknown): SidebarError;
