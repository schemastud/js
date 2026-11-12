/** What a session request resolves with. */
interface SessionResponse<T> {
    status: number;
    /** The parsed JSON body; the raw text when it is not JSON; `null` on a 204 or an empty body. */
    data: T;
}
/** Sends one request: same-origin, JSON headers and the XSRF token. A non-2xx answer rejects with `FrameActionError`. */
interface SessionRequest {
    <T = unknown>(method: string, url: string, 
    /** Appended as a query string (`?` or `&`); numbers are stringified; omitted or empty → `url` unchanged. */
    params?: Record<string, string | number>, 
    /** JSON-encoded when defined; no body otherwise. */
    body?: unknown, 
    /** `signal` is forwarded to `fetch`, so a caller can abort a superseded request. */
    init?: {
        signal?: AbortSignal;
    }): Promise<SessionResponse<T>>;
}
interface SessionRequestOptions {
    /** Default: the global `fetch`, read per call. */
    fetch?: typeof fetch;
    /** Merged over the defaults on every request; a function is read per request. */
    headers?: HeadersInit | (() => HeadersInit);
}
/**
 * A non-2xx answer to an action's request, carrying what the shell shows: the server's `message` and, on
 * a 422, the per-field `errors`. A host transport's `write` throws this so the action UI can tell a
 * validation refusal (show it on the form) from any other refusal (show the message).
 *
 * Publicly exported from frame's root only (ticket 48, amend B); it lives here so the session request needs no import.
 */
declare class FrameActionError extends Error {
    readonly status: number;
    readonly errors: Record<string, string[]>;
    readonly body: unknown;
    constructor(status: number, body: unknown, fallback?: string);
}
/** `{ 'X-XSRF-TOKEN': <decoded cookie> }`, or `{}` with no document or no `XSRF-TOKEN` cookie. */
declare function xsrfHeader(): Record<string, string>;
/**
 * Same-origin (`credentials: 'same-origin'`), `Accept: application/json`, `X-Requested-With: XMLHttpRequest`,
 * `Content-Type: application/json` when a body is sent, then `xsrfHeader()`, then `options.headers`.
 * A non-2xx answer rejects with `FrameActionError(status, parsedBody, '<METHOD> <url> failed (<status>).')`,
 * with that line as a non-enumerable `cause`.
 */
declare function createSessionRequest(options?: SessionRequestOptions): SessionRequest;

export { FrameActionError as F, type SessionRequest as S, type SessionRequestOptions as a, type SessionResponse as b, createSessionRequest as c, xsrfHeader as x };
