import { afterEach, describe, expect, it } from 'vitest';
import { FrameActionError } from '../src/actions';
import { createSessionRequest, xsrfHeader } from '../src/subpaths/session';

/**
 * The published session request (ticket 48) over a fake `fetch`: what `createHttpTransport` sends, plus what a caller
 * outside frame needs — numeric params, the response's status, a forwarded abort signal, and the token header alone.
 */
function fakeFetch(answer: () => Response = () => Response.json({ ok: true })) {
    const calls: Array<{ url: string; init: RequestInit }> = [];
    const fetch = async (input: RequestInfo | URL, init: RequestInit = {}) => {
        calls.push({ url: String(input), init });
        return answer();
    };
    return { calls, fetch: fetch as typeof globalThis.fetch };
}

afterEach(() => {
    document.cookie = 'XSRF-TOKEN=; expires=Thu, 01 Jan 1970 00:00:00 GMT';
});

describe('xsrfHeader', () => {
    it('is empty with no XSRF-TOKEN cookie, and carries the decoded token with one', () => {
        expect(xsrfHeader()).toEqual({});
        document.cookie = `XSRF-TOKEN=${encodeURIComponent('a=b/c')}`;
        expect(xsrfHeader()).toEqual({ 'X-XSRF-TOKEN': 'a=b/c' });
    });
});

describe('createSessionRequest', () => {
    it('sends same-origin JSON with the token, stringifies numeric params and resolves status and data', async () => {
        document.cookie = 'XSRF-TOKEN=tok';
        const { calls, fetch } = fakeFetch(() => Response.json({ data: [1] }, { status: 201 }));
        const request = createSessionRequest({ fetch, headers: () => ({ 'X-Extra': 'yes' }) });

        const res = await request('POST', '/api/things?x=1', { page: 2, q: 'a b' }, { name: 'n' });

        expect(res).toEqual({ status: 201, data: { data: [1] } });
        expect(calls[0].url).toBe('/api/things?x=1&page=2&q=a+b');
        expect(calls[0].init.credentials).toBe('same-origin');
        expect(calls[0].init.body).toBe('{"name":"n"}');
        const headers = new Headers(calls[0].init.headers);
        expect(headers.get('Accept')).toBe('application/json');
        expect(headers.get('X-Requested-With')).toBe('XMLHttpRequest');
        expect(headers.get('Content-Type')).toBe('application/json');
        expect(headers.get('X-XSRF-TOKEN')).toBe('tok');
        expect(headers.get('X-Extra')).toBe('yes');
    });

    it('forwards init.signal to fetch, and sends none without it', async () => {
        const { calls, fetch } = fakeFetch();
        const request = createSessionRequest({ fetch });
        const controller = new AbortController();

        await request('GET', '/a', undefined, undefined, { signal: controller.signal });
        await request('GET', '/b');

        expect(calls[0].init.signal).toBe(controller.signal);
        expect('signal' in calls[1].init).toBe(false);
        expect(new Headers(calls[1].init.headers).has('Content-Type')).toBe(false);
    });

    it('resolves null data on a 204', async () => {
        const { fetch } = fakeFetch(() => new Response(null, { status: 204 }));
        expect(await createSessionRequest({ fetch })('DELETE', '/a')).toEqual({ status: 204, data: null });
    });

    it("rejects a non-2xx answer with the root's FrameActionError, the request line as its cause", async () => {
        const { fetch } = fakeFetch(() => Response.json({ message: 'Nope.', errors: { name: ['Required.'] } }, { status: 422 }));

        const failure = await createSessionRequest({ fetch })('PUT', '/a', { v: 1 }, {}).catch((error: unknown) => error);

        expect(failure).toBeInstanceOf(FrameActionError);
        expect(failure).toMatchObject({ status: 422, message: 'Nope.', errors: { name: ['Required.'] } });
        expect(((failure as Error).cause as Error).message).toBe('PUT /a?v=1 failed (422).');
    });
});
