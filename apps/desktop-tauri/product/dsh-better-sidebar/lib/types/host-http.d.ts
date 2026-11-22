/** HTTP types remain in the host-only declaration graph. */
import type { WebRoute } from '@deepseek-ai/dsh-host-webserver';
/** Request supplied by the host webserver route registration. */
export type SidebarHttpRequest = Parameters<WebRoute['handler']>[0];
/** Response supplied by the host webserver route registration. */
export type SidebarHttpResponse = Parameters<WebRoute['handler']>[1];
