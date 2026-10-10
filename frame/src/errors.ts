/**
 * A transport read that answered 404 is a DISTINCT terminal state — "this record is not
 * here" — not the same thing as "the read failed" (5xx/network). The shells and the host
 * detail sheet branch on this so a missing record reads as not-found rather than a generic
 * error or (the older bug) a perpetual spinner.
 *
 * Detected by a numeric `status` of 404 on the thrown error. Both `FrameActionError` (which
 * carries `status`) and the host transport's read errors expose it; anything without a 404
 * `status` stays a generic error, so a plain `new Error(...)` is never mistaken for not-found.
 */
export function isNotFound(error: unknown): boolean {
    return (
        typeof error === 'object' &&
        error !== null &&
        'status' in error &&
        (error as { status?: unknown }).status === 404
    );
}
