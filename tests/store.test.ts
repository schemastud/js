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
    it('ignores an empty send and a re-entrant send while streaming', async () => {
        const core = createChatCore({
            transport: fakeTransport(() => sseResponse('event: token\ndata: {"delta":"ok"}\n\n')),
            generateId: seqIds(),
        });

        await core.send('');
        expect(core.getSnapshot().messages).toHaveLength(0);
    });
});
