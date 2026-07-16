/**
 * The ONE place the deployment points at the untrusted sandbox origin.
 *
 * The trust boundary in this substrate is *execution-context isolation*, not
 * API-guarding (PRD §"The decision this ratifies"). The Worker that hosts the
 * QuickJS VM MUST be served from a **separate registrable origin** from the host
 * page: only then is the guest's `fetch` cross-site (no first-party cookie
 * auto-attached), and only then is a scoped token real rather than illusory.
 *
 * In dev this is a second vite server on a different `*.test` host; in prod it is
 * the deployed sandbox origin. It is a config value, not a constant, so there is a
 * single seam to repoint. See VERIFY.md for the two-origin browser demonstration.
 */
export const SANDBOX_ORIGIN =
    (typeof process !== 'undefined' && process.env?.FRAME_REMOTE_SANDBOX_ORIGIN) ||
    'https://sandbox.frame-remote.test';

/**
 * Default VM resource bounds. A runaway guest (infinite loop or unbounded
 * allocation) must be killed by the substrate, never trusted to be well-behaved.
 */
export interface VmLimits {
    /**
     * Wall-clock budget, in ms, for a single guest evaluation. Enforced by a
     * deadline-based QuickJS interrupt handler — an infinite loop is interrupted
     * once the deadline passes.
     */
    deadlineMs: number;
    /**
     * Hard memory ceiling for the guest runtime, in bytes. An allocation past this
     * fails inside the VM (surfaced as an evaluation error), never as host OOM.
     */
    memoryLimitBytes: number;
    /**
     * Max stack size for the guest runtime, in bytes. Bounds deep recursion.
     */
    maxStackSizeBytes: number;
}

export const DEFAULT_LIMITS: VmLimits = {
    deadlineMs: 1000,
    memoryLimitBytes: 16 * 1024 * 1024, // 16 MiB
    maxStackSizeBytes: 512 * 1024, // 512 KiB
};
