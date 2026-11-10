import { describe, expect, it } from 'vitest';
import { createHttpTransport } from '../src/httpTransport';
import { FrameActionError } from '../src/actions';
import { isNotFound } from '../src/errors';
import type { ResourceActionDefinition } from '../src/types';

/**
 * Frame's HTTP adapter over a fake `fetch`: every request goes to laravel-frame's socket under the
 * prefix with the right method, the manifest has its own address, and every non-2xx answer, reads
 * included, rejects with a `FrameActionError` that `isNotFound` reads.
 */
interface Call {
    method: string;
    url: string;
    body?: unknown;
    headers: Headers;
}

function fakeFetch(answer: (call: Call) => { status?: number; body?: unknown } = () => ({})) {
    const calls: Call[] = [];
    const fetch = async (input: RequestInfo | URL, init: RequestInit = {}) => {
        const call: Call = {
            method: init.method ?? 'GET',
            url: String(input),
            body: init.body === undefined ? undefined : JSON.parse(String(init.body)),
            headers: new Headers(init.headers),
        };
        calls.push(call);
        const { status = 200, body = { data: {} } } = answer(call);
        return status === 204 ? new Response(null, { status }) : Response.json(body, { status });
    };
    return { calls, fetch: fetch as typeof globalThis.fetch };
}

const action: ResourceActionDefinition = {
    key: 'archive',
    label: 'Archive',
    scope: 'record',
    method: 'POST',
    url: '/api/members/{id}/archive',
    input: null,
    result: 'toast',
    destructive: false,
} as ResourceActionDefinition;

describe('createHttpTransport', () => {
    it('sends each read and write to its URL with its method', async () => {
        const { calls, fetch } = fakeFetch((call) =>
            call.url.endsWith('/schema') && !call.url.includes('/filters/')
                ? { body: { type: 'object', properties: {} } }
                : call.url.includes('/filters/')
                  ? { body: { data: { properties: {} } } }
                  : call.method === 'DELETE'
                    ? { status: 204 }
                    : call.url.includes('?page=')
                      ? { body: { data: [], total: 0, page: 1, perPage: 25 } }
                      : { body: { data: { id: '7' } } },
        );
        const transport = createHttpTransport({ prefix: '/admin/frame', fetch });

        await transport.list('members', { page: '1' });
        await transport.get('members', '7');
        await transport.getFormSchema('members', 'enriched');
        await transport.getFormSchema('members', 'enriched', 'read');
        await transport.create('members', { name: 'Ada' });
        await transport.save('members', '7', { name: 'Ada' });
        await transport.remove('members', '7');
        await transport.invoke!(action, { id: '7' });
        await transport.getFilterSchema('members');
        await transport.getManifest!();

        expect(calls.map((c) => `${c.method} ${c.url}`)).toEqual([
            'GET /admin/frame/resources/members?page=1',
            'GET /admin/frame/resources/members/records/7',
            'GET /admin/frame/resources/members/schema',
            'GET /admin/frame/resources/members/schema?purpose=read',
            'POST /admin/frame/resources/members',
            'PUT /admin/frame/resources/members/records/7',
            'DELETE /admin/frame/resources/members/records/7',
            'POST /api/members/7/archive',
            'GET /admin/frame/resources/members/filters/schema',
            'GET /admin/frame/manifest',
        ]);
        expect(calls[4].body).toEqual({ name: 'Ada' });
        expect(calls[4].headers.get('Content-Type')).toBe('application/json');
        expect(calls[0].headers.get('Accept')).toBe('application/json');
    });

    it('reads the manifest from its own address, filling the two keys laravel-frame always serves', async () => {
        const { calls, fetch } = fakeFetch(() => ({ body: { routeContext: [] } }));
        const transport = createHttpTransport({ manifestUrl: '/frame/operator/manifest', fetch });

        const manifest = await transport.getManifest!();

        expect(calls[0].url).toBe('/frame/operator/manifest');
        expect(manifest).toEqual({ resources: [], contexts: {}, routeContext: [] });
    });

    it('rejects a 404 read with a FrameActionError that isNotFound accepts', async () => {
        const { fetch } = fakeFetch(() => ({ status: 404, body: { message: 'No query results.' } }));
        const transport = createHttpTransport({ fetch });

        const error = await transport.get('members', 'missing').catch((e: unknown) => e);

        expect(error).toBeInstanceOf(FrameActionError);
        expect((error as FrameActionError).status).toBe(404);
        expect((error as FrameActionError).message).toBe('No query results.');
        expect(isNotFound(error)).toBe(true);
    });

    it('keeps the server message as the message, and names the request in the cause', async () => {
        const { fetch } = fakeFetch(() => ({ status: 403, body: { message: 'Forbidden' } }));
        const transport = createHttpTransport({ manifestUrl: '/frame/operator/manifest', fetch });

        const error = await transport.getManifest!().catch((e: unknown) => e);

        expect(error).toBeInstanceOf(FrameActionError);
        expect((error as FrameActionError).message).toBe('Forbidden');
        expect((error as Error).cause).toBeInstanceOf(Error);
        expect(((error as Error).cause as Error).message).toContain('/frame/operator/manifest');
    });
});
