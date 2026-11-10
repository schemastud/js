import type { SchemaNode } from '@schemastud/seam';
import { FrameActionError } from './actions';
import { parseResourcePage } from './resourcePage';
import { createResourceTransport, type ResourceTransportOptions } from './resourceTransport';
import type { FrameManifest, FrameTransport, ResourcePage, Row } from './types';

export interface HttpTransportOptions extends ResourceTransportOptions {
    /** Where laravel-frame's socket is mounted. Default `/frame`, its default route prefix. */
    prefix?: string;
    /** The manifest's address. Default `{prefix}/manifest`; a host that mounts one manifest per realm passes the realm's. */
    manifestUrl?: string;
    /** The fetch to send with. Default the global `fetch`; a test passes a fake. */
    fetch?: typeof fetch;
    /** Headers merged over the defaults on every request; a function is read per request. */
    headers?: HeadersInit | (() => HeadersInit);
}

/** The Laravel XSRF cookie, when the page has one. */
function xsrfToken(): string | null {
    if (typeof document === 'undefined') return null;
    const match = document.cookie.match(/(?:^|;\s*)XSRF-TOKEN=([^;]+)/);
    return match ? decodeURIComponent(match[1]) : null;
}

function withQuery(url: string, params?: Record<string, string>): string {
    const query = params ? new URLSearchParams(params).toString() : '';
    return query ? `${url}${url.includes('?') ? '&' : '?'}${query}` : url;
}

/**
 * Frame's HTTP adapter: a `FrameTransport` over laravel-frame's socket, with the manifest read.
 * Every request goes same-origin with JSON headers and the XSRF token; every non-2xx answer,
 * reads included, rejects with a `FrameActionError` carrying the status and the parsed body, so
 * `isNotFound` and a 422's field errors work the same on every read and write.
 *
 * The envelopes are `FrameResourceController`'s: a list page `{data,total,page,perPage}` (or a
 * cursor page), a record `{data}`, a schema as raw JSON Schema, a create or save `{data}`, a delete 204.
 */
export function createHttpTransport(options: HttpTransportOptions = {}): FrameTransport {
    const prefix = (options.prefix ?? '/frame').replace(/\/+$/, '');
    const manifestUrl = options.manifestUrl ?? `${prefix}/manifest`;
    const send = options.fetch ?? ((...args: Parameters<typeof fetch>) => fetch(...args));

    const headers = (withBody: boolean): Headers => {
        const merged = new Headers({ Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest' });
        if (withBody) merged.set('Content-Type', 'application/json');
        const token = xsrfToken();
        if (token) merged.set('X-XSRF-TOKEN', token);
        const extra = typeof options.headers === 'function' ? options.headers() : options.headers;
        new Headers(extra).forEach((value, key) => merged.set(key, value));
        return merged;
    };

    async function request<T>(method: string, url: string, body?: unknown): Promise<T> {
        const res = await send(url, {
            method,
            headers: headers(body !== undefined),
            credentials: 'same-origin',
            ...(body === undefined ? {} : { body: JSON.stringify(body) }),
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
            const where = `${method} ${url} failed (${res.status}).`;
            const error = new FrameActionError(res.status, parsed, where);
            // The server's message stays the user-facing one; the request it answered rides as the cause.
            Object.defineProperty(error, 'cause', { value: new Error(where), enumerable: false, configurable: true, writable: true });
            throw error;
        }
        return parsed as T;
    }

    const resourceUrl = (resource: string) => `${prefix}/resources/${encodeURIComponent(resource)}`;
    const recordUrl = (resource: string, id: string) => `${resourceUrl(resource)}/records/${encodeURIComponent(id)}`;

    const transport = createResourceTransport(
        {
            async list<Result>(resource: string, params: Record<string, string>): Promise<ResourcePage<Result>> {
                return parseResourcePage(await request<ResourcePage<Result>>('GET', withQuery(resourceUrl(resource), params)));
            },
            async get(resource, id, params): Promise<Row> {
                return (await request<{ data: Row }>('GET', withQuery(recordUrl(resource, id), params))).data;
            },
            async getFormSchema(resource, _form, purpose, params): Promise<SchemaNode> {
                const query = { ...(purpose === 'read' ? { purpose: 'read' } : {}), ...params };
                return request<SchemaNode>('GET', withQuery(`${resourceUrl(resource)}/schema`, query));
            },
            async create<Result>(resource: string, data: unknown, params?: Record<string, string>): Promise<Result> {
                return (await request<{ data: Result }>('POST', withQuery(resourceUrl(resource), params), data)).data;
            },
            async save(resource, id, data, params): Promise<Row> {
                return (await request<{ data: Row }>('PUT', withQuery(recordUrl(resource, id), params), data)).data;
            },
            async remove(resource, id, params): Promise<void> {
                await request('DELETE', withQuery(recordUrl(resource, id), params));
            },
        },
        {
            resourceUrl,
            read: (url, params) => request('GET', withQuery(url, params)),
            write: (method, url, body) => request(method, url, body),
        },
        options,
    );

    return {
        ...transport,
        async getManifest(): Promise<FrameManifest> {
            const body = (await request<Partial<FrameManifest> | null>('GET', manifestUrl)) ?? {};
            return { ...body, resources: body.resources ?? [], contexts: body.contexts ?? {} };
        },
    };
}
