import { describe, expect, it, vi } from 'vitest';
import { type ChatTransport, type ChatWireEvent, createChatCore } from '../src/core/index';

/**
 * The stateful store — the extracted embed-chat core, born-correct. Drives real
 * `send` Responses (SSE + JSON escalation body) through the fold engine and
 * exercises hydration, the session capabilities, and the transport-throw
 * degrade path. Deterministic ids via `generateId`.
 */

function sseResponse(sse: string): Response {
    return new Response(sse, { headers: { 'content-type': 'text/event-stream' } });
}

function jsonResponse(obj: unknown): Response {
    return new Response(JSON.stringify(obj), { headers: { 'content-type': 'application/json' } });
}

/** A transport whose `send` returns a scripted Response. */
function fakeTransport(responder: (payload: unknown) => Response): ChatTransport {
    return { kind: 'fake', send: vi.fn(async (payload: unknown) => responder(payload)) };
}

/** Deterministic id generator: user turn = u0, assistant = a1, then u2, a3, … */
function seqIds() {
    let n = 0;
    return () => `id${n++}`;
}

describe('createChatCore — streaming send', () => {
    it('streams assistant tokens off the SSE body and finalizes on stream end', async () => {
        const core = createChatCore({
            transport: fakeTransport(() =>
                sseResponse('event: text-delta\ndata: {"delta":"Hel"}\n\nevent: text-delta\ndata: {"delta":"lo"}\n\n'),
            ),
            generateId: seqIds(),
        });

        const seen: string[] = [];
        core.subscribe((s) => {
            const last = s.messages.at(-1);
            if (last?.role === 'assistant') seen.push(last.content);
        });

        await core.send('hi');

        const snap = core.getSnapshot();
        expect(snap.messages[0]).toMatchObject({ role: 'user', content: 'hi' });
        expect(snap.messages[1]).toMatchObject({ role: 'assistant', content: 'Hello' });
        expect(snap.messages[1].streaming).toEqual({ partial: false });
        expect(snap.streaming).toBe(false);
        // Proof it streamed, not batched.
        expect(seen).toContain('Hel');
    });

    it('captures a session id and echoes it on the next send', async () => {
        const transport = fakeTransport(() =>
            sseResponse('event: session\ndata: {"session_id":"sess_1"}\n\nevent: token\ndata: {"delta":"ok"}\n\n'),
        );
        const core = createChatCore({ transport, generateId: seqIds() });

        await core.send('one');
        expect(core.getSnapshot().sessionId).toBe('sess_1');

        await core.send('two');
        const secondCall = (transport.send as ReturnType<typeof vi.fn>).mock.calls[1][0];
        expect(secondCall.session_id).toBe('sess_1');
    });

    it('folds interleaved tool segments streamed over SSE', async () => {
        const core = createChatCore({
            transport: fakeTransport(() =>
                sseResponse(
                    'event: token\ndata: {"delta":"checking "}\n\n' +
                        'event: tool_call\ndata: {"toolId":"t1","toolName":"search","arguments":{"q":"x"}}\n\n' +
                        'event: tool_result\ndata: {"toolId":"t1","toolName":"search","result":{"hits":1}}\n\n' +
                        'event: token\ndata: {"delta":"done"}\n\n',
                ),
            ),
            generateId: seqIds(),
        });

        await core.send('go');

        const assistant = core.getSnapshot().messages[1];
        expect(assistant.segments!.map((s) => s.type)).toEqual(['text', 'tool_call', 'tool_result', 'text']);
        expect(assistant.content).toBe('checking done');
    });
});

describe('createChatCore — escalation (JSON body synthesized client-side)', () => {
    it('flips to escalation on a JSON envelope without an empty assistant bubble', async () => {
        const core = createChatCore({
            transport: fakeTransport(() =>
                jsonResponse({ data: { reason: 'budget_exhausted', session_id: 'sess_x', offer: { plan: 'pro' } } }),
            ),
            generateId: seqIds(),
        });

        await core.send('expensive');

        const snap = core.getSnapshot();
        expect(snap.escalation).toEqual({ reason: 'budget_exhausted', offer: { plan: 'pro' } });
        expect(snap.sessionId).toBe('sess_x');
        expect(snap.streaming).toBe(false);
        // Only the user turn — no assistant bubble minted.
        expect(snap.messages).toHaveLength(1);
    });

    it('requestHuman signals intent through the transport and marks a local escalation', async () => {
        const transport = fakeTransport(() => jsonResponse({ data: {} }));
        const core = createChatCore({ transport, generateId: seqIds() });

        await core.requestHuman({ email: 'a@b.co' }, true);

        const body = (transport.send as ReturnType<typeof vi.fn>).mock.calls[0][0];
        expect(body).toMatchObject({ escalate: true, consent: true });
        expect(core.getSnapshot().escalation?.reason).toBe('visitor_request');
    });

    it('degrades to an escalation state when the transport throws', async () => {
        const core = createChatCore({
            transport: { kind: 'fake', send: vi.fn(async () => { throw new Error('offline'); }) },
            generateId: seqIds(),
        });

        await core.send('hi');

        const snap = core.getSnapshot();
        expect(snap.escalation?.reason).toBe('transport_error');
        expect(snap.streaming).toBe(false);
    });
});

describe('createChatCore — hydration seam', () => {
    it('accepts initialMessages and streams a new turn on top', async () => {
        const core = createChatCore({
            transport: fakeTransport(() => sseResponse('event: token\ndata: {"delta":"reply"}\n\n')),
            initialMessages: [
                { id: 'h1', role: 'user', content: 'past' },
                { id: 'h2', role: 'assistant', content: 'answer' },
            ],
            generateId: seqIds(),
        });

        expect(core.getSnapshot().messages.map((m) => m.id)).toEqual(['h1', 'h2']);

        await core.send('follow-up');

        const ids = core.getSnapshot().messages.map((m) => m.content);
        expect(ids).toEqual(['past', 'answer', 'follow-up', 'reply']);
    });

    it('re-hydrate replaces the in-view history', () => {
        const core = createChatCore({
            transport: fakeTransport(() => sseResponse('')),
            generateId: seqIds(),
        });

        core.hydrate([{ id: 'x', role: 'user', content: 'seeded' }]);
        expect(core.getSnapshot().messages).toHaveLength(1);
        expect(core.getSnapshot().messages[0].content).toBe('seeded');
    });
});

describe('createChatCore — custom transport adapter (bespoke wire)', () => {
    it('uses transport.adapt when present, bypassing the default SSE/JSON path', async () => {
        async function* adapt(): AsyncGenerator<ChatWireEvent> {
            yield { type: 'token', messageId: 'z', delta: 'via-adapter' };
            yield { type: 'done', messageId: 'z' };
        }

        const transport: ChatTransport = {
            kind: 'bespoke',
            send: vi.fn(async () => new Response(null)),
            adapt,
        };

        const core = createChatCore({ transport, generateId: seqIds() });
        await core.send('hi');

        expect(core.getSnapshot().messages.at(-1)!.content).toBe('via-adapter');
        expect(core.getSnapshot().streaming).toBe(false);
    });
});

describe('createChatCore — guards', () => {
    it('ignores an empty send', async () => {
        const core = createChatCore({
            transport: fakeTransport(() => sseResponse('event: token\ndata: {"delta":"ok"}\n\n')),
            generateId: seqIds(),
        });

        await core.send('');
        expect(core.getSnapshot().messages).toHaveLength(0);
    });
});

describe('createChatCore — admitted send lifecycle', () => {
    it('admits one turn before the response arrives, including subscriber re-entry', async () => {
        let respond!: (response: Response) => void;
        const transport: ChatTransport = {
            kind: 'delayed',
            send: vi.fn(() => new Promise<Response>((resolve) => { respond = resolve; })),
        };
        const core = createChatCore({ transport, generateId: seqIds() });
        let triedReentry = false;
        core.subscribe((snapshot) => {
            if (snapshot.messages.length > 0 && !triedReentry) {
                triedReentry = true;
                void core.send('subscriber duplicate');
            }
        });

        const first = core.send('first');
        expect(core.getSnapshot().streaming).toBe(true);
        await core.send('second');
        expect(transport.send).toHaveBeenCalledTimes(1);
        expect(core.getSnapshot().messages.map((message) => message.content)).toEqual(['first']);

        respond(sseResponse('event: token\ndata: {"delta":"reply"}\n\n'));
        await first;
        expect(core.getSnapshot().streaming).toBe(false);
        expect(core.getSnapshot().messages.map((message) => message.content)).toEqual(['first', 'reply']);
    });

    it.each([
        ['error', new Error('connection lost')],
        ['abort', new DOMException('aborted', 'AbortError')],
    ])('settles an iterator %s, retains every partial message and admits a retry', async (_label, failure) => {
        let attempt = 0;
        const transport: ChatTransport = {
            kind: 'bespoke',
            send: vi.fn(async () => new Response(null)),
            async *adapt() {
                if (attempt++ === 0) {
                    yield { type: 'token', messageId: 'first-partial', delta: 'Keep this' };
                    yield { type: 'token', messageId: 'second-partial', delta: ' and this' };
                    throw failure;
                }
                yield { type: 'token', messageId: 'retry', delta: 'Recovered' };
                yield { type: 'done', messageId: 'retry' };
            },
        };
        const core = createChatCore({ transport, generateId: seqIds() });

        await expect(core.send('first')).resolves.toBeUndefined();
        expect(core.getSnapshot().streaming).toBe(false);
        expect(core.getSnapshot().messages.slice(1)).toMatchObject([
            { id: 'first-partial', content: 'Keep this', streaming: { partial: false, error: 'transport_error' } },
            { id: 'second-partial', content: ' and this', streaming: { partial: false, error: 'transport_error' } },
        ]);
        expect(core.getSnapshot().escalation?.reason).toBe('transport_error');

        await core.send('retry');
        expect(transport.send).toHaveBeenCalledTimes(2);
        expect(core.getSnapshot().messages.map((message) => message.content)).toEqual([
            'first', 'Keep this', ' and this', 'retry', 'Recovered',
        ]);
        expect(core.getSnapshot().streaming).toBe(false);
        expect(core.getSnapshot().escalation).toBeNull();
    });

    it('stays busy after a done frame until the adapter settles, then finalizes its remaining messages', async () => {
        let release!: () => void;
        const tail = new Promise<void>((resolve) => { release = resolve; });
        let atDone!: () => void;
        const done = new Promise<void>((resolve) => { atDone = resolve; });
        const transport: ChatTransport = {
            kind: 'bespoke',
            send: vi.fn(async () => new Response(null)),
            async *adapt() {
                yield { type: 'token', messageId: 'complete', delta: 'First reply' };
                yield { type: 'done', messageId: 'complete' };
                atDone();
                await tail;
                yield { type: 'token', messageId: 'tail', delta: 'Last reply' };
            },
        };
        const core = createChatCore({ transport, generateId: seqIds() });
        const first = core.send('first');
        await done;
        expect(core.getSnapshot().streaming).toBe(true);
        await core.send('too early');
        expect(transport.send).toHaveBeenCalledTimes(1);
        release();
        await first;
        expect(core.getSnapshot().streaming).toBe(false);
        expect(core.getSnapshot().messages.slice(1)).toMatchObject([
            { content: 'First reply', streaming: { partial: false } },
            { content: 'Last reply', streaming: { partial: false } },
        ]);
    });

    it.each([
        ['error', new Error('offline')],
        ['abort', new DOMException('aborted', 'AbortError')],
    ])('settles a transport %s before the first token and admits a retry', async (_label, failure) => {
        const send = vi.fn<ChatTransport['send']>()
            .mockRejectedValueOnce(failure)
            .mockResolvedValueOnce(sseResponse('event: token\ndata: {"delta":"Recovered"}\n\n'));
        const core = createChatCore({ transport: { kind: 'fake', send }, generateId: seqIds() });

        await expect(core.send('first')).resolves.toBeUndefined();
        expect(core.getSnapshot().streaming).toBe(false);
        expect(core.getSnapshot().messages[1]).toMatchObject({
            role: 'assistant', streaming: { partial: false, error: 'transport_error' },
        });
        await core.send('retry');
        expect(send).toHaveBeenCalledTimes(2);
        expect(core.getSnapshot().messages.at(-1)?.content).toBe('Recovered');
        expect(core.getSnapshot().streaming).toBe(false);
    });

    it('keeps admission through hydration and does not attach a pre-token failure to unrelated history', async () => {
        let reject!: (error: Error) => void;
        const transport: ChatTransport = {
            kind: 'delayed',
            send: vi.fn(() => new Promise<Response>((_resolve, fail) => { reject = fail; })),
        };
        const core = createChatCore({ transport, generateId: seqIds() });
        const first = core.send('first');
        core.hydrate([{ id: 'history', role: 'assistant', content: 'Another turn', streaming: { partial: true } }]);
        await core.send('duplicate');
        expect(transport.send).toHaveBeenCalledTimes(1);
        reject(new Error('offline'));
        await first;
        expect(core.getSnapshot().messages[0]).toEqual({
            id: 'history', role: 'assistant', content: 'Another turn', streaming: { partial: true },
        });
        expect(core.getSnapshot().messages[1]).toMatchObject({
            id: 'id1', role: 'assistant', streaming: { partial: false, error: 'transport_error' },
        });
    });

    it('keeps one assistant identity when the stream throws after done', async () => {
        const transport: ChatTransport = {
            kind: 'bespoke',
            send: async () => new Response(null),
            async *adapt() {
                yield { type: 'token', messageId: 'id1', delta: 'Already answered' };
                yield { type: 'done', messageId: 'id1' };
                throw new Error('trailer failed');
            },
        };
        const core = createChatCore({ transport, generateId: seqIds() });
        await core.send('question');
        expect(core.getSnapshot().messages).toHaveLength(2);
        expect(core.getSnapshot().messages[1]).toMatchObject({
            id: 'id1', content: 'Already answered', streaming: { partial: false, error: 'transport_error' },
        });
        expect(core.getSnapshot().streaming).toBe(false);
    });

    it.each([
        { ending: 'end', partialText: '' },
        { ending: 'throw', partialText: '' },
        { ending: 'end', partialText: 'Keep this answer' },
        { ending: 'throw', partialText: 'Keep this answer' },
    ])('settles an untargeted error on $ending with partial text "$partialText" and admits retry', async ({ ending, partialText }) => {
        let attempt = 0;
        const transport: ChatTransport = {
            kind: 'bespoke',
            send: vi.fn(async () => new Response(null)),
            async *adapt() {
                if (attempt++ === 0) {
                    if (partialText) {
                        yield { type: 'token', messageId: 'provider-message', delta: partialText };
                    }
                    yield { type: 'error', error: 'provider_error', partial: true };
                    if (ending === 'throw') throw new Error('reader failed');
                    return;
                }
                yield { type: 'token', messageId: 'retry-message', delta: 'Recovered' };
                yield { type: 'done', messageId: 'retry-message' };
            },
        };
        const core = createChatCore({ transport, generateId: seqIds() });

        await core.send('first');
        expect(core.getSnapshot().streaming).toBe(false);
        expect(core.getSnapshot().messages).toHaveLength(2);
        expect(core.getSnapshot().messages[1]).toMatchObject({
            role: 'assistant', content: partialText, streaming: { partial: false, error: 'provider_error' },
        });
        await core.send('retry');
        expect(transport.send).toHaveBeenCalledTimes(2);
        expect(core.getSnapshot().messages.map((message) => message.content)).toEqual([
            'first', partialText, 'retry', 'Recovered',
        ]);
        expect(core.getSnapshot().streaming).toBe(false);
    });
});
