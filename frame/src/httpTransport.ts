import type { SchemaNode } from '@schemastud/seam';
import { parseResourcePage } from './resourcePage';
import { createResourceTransport, type ResourceTransportOptions } from './resourceTransport';
import { createSessionRequest } from './session';
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

/**
 * Frame's HTTP adapter: a `FrameTransport` over laravel-frame's socket, with the manifest read.
 * Every request is the published session request (`@schemastud/frame/session`): same-origin, JSON headers and the
 * XSRF token; every non-2xx answer,
 * reads included, rejects with a `FrameActionError` carrying the status and the parsed body, so
 * `isNotFound` and a 422's field errors work the same on every read and write.
 *
 * The envelopes are `FrameResourceController`'s: a list page `{data,total,page,perPage}` (or a
 * cursor page), a record `{data}`, a schema as raw JSON Schema, a create or save `{data}`, a delete 204.
 */
export function createHttpTransport(options: HttpTransportOptions = {}): FrameTransport {
    const prefix = (options.prefix ?? '/frame').replace(/\/+$/, '');
    const manifestUrl = options.manifestUrl ?? `${prefix}/manifest`;
    const session = createSessionRequest({ fetch: options.fetch, headers: options.headers });
    const request = async <T>(method: string, url: string, params?: Record<string, string>, body?: unknown): Promise<T> =>
        (await session<T>(method, url, params, body)).data;

    const resourceUrl = (resource: string) => `${prefix}/resources/${encodeURIComponent(resource)}`;
    const recordUrl = (resource: string, id: string) => `${resourceUrl(resource)}/records/${encodeURIComponent(id)}`;

    const transport = createResourceTransport(
        {
            async list<Result>(resource: string, params: Record<string, string>): Promise<ResourcePage<Result>> {
                return parseResourcePage(await request<ResourcePage<Result>>('GET', resourceUrl(resource), params));
            },
            async get(resource, id, params): Promise<Row> {
                return (await request<{ data: Row }>('GET', recordUrl(resource, id), params)).data;
            },
            async getFormSchema(resource, _form, purpose, params): Promise<SchemaNode> {
                const query = { ...(purpose === 'read' ? { purpose: 'read' } : {}), ...params };
                return request<SchemaNode>('GET', `${resourceUrl(resource)}/schema`, query);
            },
            async create<Result>(resource: string, data: unknown, params?: Record<string, string>): Promise<Result> {
                return (await request<{ data: Result }>('POST', resourceUrl(resource), params, data)).data;
            },
            async save(resource, id, data, params): Promise<Row> {
                return (await request<{ data: Row }>('PUT', recordUrl(resource, id), params, data)).data;
            },
            async remove(resource, id, params): Promise<void> {
                await request('DELETE', recordUrl(resource, id), params);
            },
        },
        {
            resourceUrl,
            read: (url, params) => request('GET', url, params),
            write: (method, url, body) => request(method, url, undefined, body),
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
