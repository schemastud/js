// The session request: a same-origin JSON request carrying the Laravel session's XSRF token, as frame's HTTP adapter has
// always sent it, published (ticket 48) so a host or a feature client sends through one request instead of reading the
// cookie by hand. This module imports nothing, so `@schemastud/frame/session` costs a caller no other module.

/** What a session request resolves with. */
export interface SessionResponse<T> {
    status: number;
    /** The parsed JSON body; the raw text when it is not JSON; `null` on a 204 or an empty body. */
    data: T;
}

/** Sends one request: same-origin, JSON headers and the XSRF token. A non-2xx answer rejects with `FrameActionError`. */
export interface SessionRequest {
    <T = unknown>(
        method: string,
        url: string,
        /** Appended as a query string (`?` or `&`); numbers are stringified; omitted or empty → `url` unchanged. */
        params?: Record<string, string | number>,
        /** JSON-encoded when defined; no body otherwise. */
        body?: unknown,
        /** `signal` is forwarded to `fetch`, so a caller can abort a superseded request. */
        init?: { signal?: AbortSignal },
    ): Promise<SessionResponse<T>>;
}

export interface SessionRequestOptions {
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
export class FrameActionError extends Error {
    readonly status: number;
    readonly errors: Record<string, string[]>;
    readonly body: unknown;

    constructor(status: number, body: unknown, fallback = `The request failed (${status}).`) {
        const envelope = (body && typeof body === 'object' ? body : {}) as {
            message?: unknown;
            errors?: unknown;
        };
        super(typeof envelope.message === 'string' && envelope.message !== '' ? envelope.message : fallback);
        this.name = 'FrameActionError';
        this.status = status;
        this.body = body;
        this.errors =
            envelope.errors && typeof envelope.errors === 'object'
                ? (envelope.errors as Record<string, string[]>)
                : {};
    }
}

/** `{ 'X-XSRF-TOKEN': <decoded cookie> }`, or `{}` with no document or no `XSRF-TOKEN` cookie. */
export function xsrfHeader(): Record<string, string> {
    if (typeof document === 'undefined') return {};
    const match = document.cookie.match(/(?:^|;\s*)XSRF-TOKEN=([^;]+)/);
    return match ? { 'X-XSRF-TOKEN': decodeURIComponent(match[1]) } : {};
}

function withQuery(url: string, params?: Record<string, string | number>): string {
    const query = params
        ? new URLSearchParams(Object.entries(params).map(([key, value]) => [key, String(value)])).toString()
        : '';
    return query ? `${url}${url.includes('?') ? '&' : '?'}${query}` : url;
}

/**
 * Same-origin (`credentials: 'same-origin'`), `Accept: application/json`, `X-Requested-With: XMLHttpRequest`,
 * `Content-Type: application/json` when a body is sent, then `xsrfHeader()`, then `options.headers`.
 * A non-2xx answer rejects with `FrameActionError(status, parsedBody, '<METHOD> <url> failed (<status>).')`,
 * with that line as a non-enumerable `cause`.
 */
export function createSessionRequest(options: SessionRequestOptions = {}): SessionRequest {
    const send = options.fetch ?? ((...args: Parameters<typeof fetch>) => fetch(...args));

    const headers = (withBody: boolean): Headers => {
        const merged = new Headers({ Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest' });
        if (withBody) merged.set('Content-Type', 'application/json');
        for (const [key, value] of Object.entries(xsrfHeader())) merged.set(key, value);
        const extra = typeof options.headers === 'function' ? options.headers() : options.headers;
        new Headers(extra).forEach((value, key) => merged.set(key, value));
        return merged;
    };

    return async function request<T = unknown>(
        method: string,
        url: string,
        params?: Record<string, string | number>,
        body?: unknown,
        init?: { signal?: AbortSignal },
    ): Promise<SessionResponse<T>> {
        const target = withQuery(url, params);
        const res = await send(target, {
            method,
            headers: headers(body !== undefined),
            credentials: 'same-origin',
            ...(body === undefined ? {} : { body: JSON.stringify(body) }),
            ...(init?.signal ? { signal: init.signal } : {}),
        });
        const text = res.status === 204 ? '' : await res.text();
        let parsed: unknown = null;
        if (text !== '') {
            try {
                parsed = JSON.parse(text);
            } catch {
                parsed = text;
            }
        }
        if (!res.ok) {
            const where = `${method} ${target} failed (${res.status}).`;
            const error = new FrameActionError(res.status, parsed, where);
            // The server's message stays the user-facing one; the request it answered rides as the cause.
            Object.defineProperty(error, 'cause', { value: new Error(where), enumerable: false, configurable: true, writable: true });
            throw error;
        }
        return { status: res.status, data: parsed as T };
    };
}
