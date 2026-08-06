/**
 * Dev-only diagnostics. The contract's rule (§6) is **warn, never throw**: throwing would couple
 * the registry to the load order of every mainframe's slot set. In production these are silent.
 */

/** True in a non-production build. Guards every warning so prod stays quiet. */
export const isDev: boolean =
    typeof process !== 'undefined' && process.env?.NODE_ENV !== 'production';

/** Dev-mode `console.warn`, prefixed. No-op in production. Never throws. */
export function devWarn(message: string): void {
    if (isDev) {
        // eslint-disable-next-line no-console
        console.warn(`[mainframe] ${message}`);
    }
}
