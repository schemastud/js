// @vitest-environment jsdom
import { act, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import {
    type ChatMessage,
    type ChatSnapshot,
    type ChatTransport,
    createChatCore,
    emptySnapshot,
} from '../src/core/index';
import { ChatView, type ChatSlots, useChat } from '../src/react/index';

/**
 * CH-04 acceptance. `<ChatView>` is driven from real core snapshots (through
 * `useChat`) and proves two things: (1) the DEFAULT render draws the envelope
 * correctly — flat `content` when a message has no segments, the interleaved
 * segments (incl. a tool step) when it does; (2) every FIXED slot overrides the
 * default when filled. Runs in jsdom.
 */

function sseResponse(sse: string): Response {
    return new Response(sse, { headers: { 'content-type': 'text/event-stream' } });
}

function fakeTransport(responder: (payload: unknown) => Response): ChatTransport {
    return { kind: 'fake', send: vi.fn(async (payload: unknown) => responder(payload)) };
}

/** A `useChat` binding on a snapshot we control directly (no transport traffic). */
function StaticView({ snapshot, slots, layout }: { snapshot: ChatSnapshot; slots?: ChatSlots; layout?: string }) {
    // A minimal ChatCore stub exposing the fixed snapshot — exercises the view
    // without racing async streams for the pure-render assertions.
    const core = {
        subscribe: (fn: (s: ChatSnapshot) => void) => {
            fn(snapshot);
            return () => {};
        },
        getSnapshot: () => snapshot,
        hydrate: () => {},
        send: vi.fn(async () => {}),
        requestHuman: vi.fn(async () => {}),
    };
    const chat = useChat({ core });
    return <ChatView chat={chat} slots={slots} layout={layout} />;
}

function snapshotWith(messages: ChatMessage[], patch: Partial<ChatSnapshot> = {}): ChatSnapshot {
    return { ...emptySnapshot(), messages, ...patch };
}

describe('<ChatView> — default render', () => {
    it('renders flat content for a message with no segments', () => {
        const snap = snapshotWith([{ id: 'u1', role: 'user', content: 'hello there' }]);
        render(<StaticView snapshot={snap} />);

        const view = document.querySelector('[data-chat-view]')!;
        expect(view.querySelector('[data-chat-content]')?.textContent).toBe('hello there');
        expect(view.querySelector('[data-chat-segments]')).toBeNull();
    });

    it('renders interleaved segments including a tool step when segments are present', () => {
        const assistant: ChatMessage = {
            id: 'a1',
            role: 'assistant',
            content: 'checking done',
            segments: [
                { type: 'text', text: 'checking ' },
                { type: 'tool_call', toolId: 't1', toolName: 'search', arguments: { q: 'x' } },
                { type: 'tool_result', toolId: 't1', toolName: 'search', result: { hits: 1 } },
                { type: 'text', text: 'done' },
            ],
        };
        render(<StaticView snapshot={snapshotWith([assistant])} />);

        const view = document.querySelector('[data-chat-view]')!;
        // Flat content is NOT used when segments exist.
        expect(view.querySelector('[data-chat-content]')).toBeNull();
        // Interleaved segments, in order, with the tool step rendered by default.
        const types = [...view.querySelectorAll('[data-chat-segment]')].map((n) => n.getAttribute('data-chat-segment'));
        expect(types).toEqual(['text', 'tool_call', 'tool_result', 'text']);
        expect(view.querySelector('[data-chat-tool-call]')?.getAttribute('data-tool-name')).toBe('search');
        expect(view.querySelector('[data-chat-tool-result]')).not.toBeNull();
    });

    it('drives the message list from an actual streamed core snapshot', async () => {
        const core = createChatCore({
            transport: fakeTransport(() => sseResponse('event: token\ndata: {"delta":"Hel"}\n\nevent: token\ndata: {"delta":"lo"}\n\n')),
        });
        function Streamed() {
            const chat = useChat({ core });
            return <ChatView chat={chat} />;
        }
        render(<Streamed />);
        await act(async () => {
            await core.send('hi');
        });

        const view = document.querySelector('[data-chat-view]')!;
        const rows = view.querySelectorAll('[data-chat-message]');
        expect(rows.length).toBe(2);
        expect(rows[0].getAttribute('data-role')).toBe('user');
        expect(rows[0].textContent).toContain('hi');
        expect(rows[1].getAttribute('data-role')).toBe('assistant');
        expect(rows[1].textContent).toContain('Hello');
    });

    it('records the layout tag as data-layout', () => {
        render(<StaticView snapshot={emptySnapshot()} layout="viewport" />);
        expect(document.querySelector('[data-chat-view]')?.getAttribute('data-layout')).toBe('viewport');
    });
});

describe('<ChatView> — slot overrides', () => {
    const oneMessage = snapshotWith([{ id: 'a1', role: 'assistant', content: 'hi', citations: [{ id: 'c1', name: 'Doc' }] }]);

    it('emptyState fills when there are no messages, and is absent once messages exist', () => {
        const slots: ChatSlots = { emptyState: () => <div data-testid="empty">no messages yet</div> };
        const { rerender } = render(<StaticView snapshot={emptySnapshot()} slots={slots} />);
        expect(screen.getByTestId('empty').textContent).toBe('no messages yet');

        rerender(<StaticView snapshot={oneMessage} slots={slots} />);
        expect(screen.queryByTestId('empty')).toBeNull();
    });

    it('header, participants, messageToolbar, citationChrome each override the default', () => {
        const snap = snapshotWith([{ id: 'a1', role: 'assistant', content: 'hi', citations: [{ id: 'c1', name: 'Doc' }] }], {
            roster: [{ id: 'p1', label: 'Ana', kind: 'user' }],
        });
        const slots: ChatSlots = {
            header: () => <div data-testid="hdr">HEADER</div>,
            participants: (roster) => <div data-testid="roster">{roster.map((p) => p.label).join(',')}</div>,
            messageToolbar: (m) => <button data-testid={`tb-${m.id}`}>copy</button>,
            citationChrome: (cites) => <div data-testid="cites">{cites.map((c) => c.name).join(',')}</div>,
        };
        render(<StaticView snapshot={snap} slots={slots} />);

        expect(screen.getByTestId('hdr').textContent).toBe('HEADER');
        expect(screen.getByTestId('roster').textContent).toBe('Ana');
        expect(screen.getByTestId('tb-a1')).not.toBeNull();
        expect(screen.getByTestId('cites').textContent).toBe('Doc');
    });

    it('renderSegment[type] override replaces the default tool-step render', () => {
        const assistant: ChatMessage = {
            id: 'a1',
            role: 'assistant',
            content: '',
            segments: [{ type: 'tool_call', toolId: 't1', toolName: 'search', arguments: { q: 'x' } }],
        };
        const slots: ChatSlots = {
            renderSegment: {
                tool_call: (seg) => <div data-testid="custom-tool">CUSTOM {seg.toolName}</div>,
            },
        };
        render(<StaticView snapshot={snapshotWith([assistant])} slots={slots} />);

        expect(screen.getByTestId('custom-tool').textContent).toBe('CUSTOM search');
        // The default built-in tool render is NOT used.
        expect(document.querySelector('[data-chat-tool-call]')).toBeNull();
    });

    it('composer(api) receives send/streaming/escalated and wires send through the core', async () => {
        const sent: string[] = [];
        let sendPromise: Promise<void> | undefined;
        const core = createChatCore({
            transport: fakeTransport(() => sseResponse('event: token\ndata: {"delta":"ok"}\n\n')),
        });
        function Host() {
            const chat = useChat({ core });
            const slots: ChatSlots = {
                composer: (api) => (
                    <button
                        type="button"
                        data-testid="composer"
                        data-streaming={api.streaming}
                        onClick={() => {
                            sent.push('x');
                            sendPromise = api.send('question');
                        }}
                    >
                        send
                    </button>
                ),
            };
            return <ChatView chat={chat} slots={slots} />;
        }
        render(<Host />);

        expect(screen.getByTestId('composer').getAttribute('data-streaming')).toBe('false');
        await act(async () => {
            screen.getByTestId('composer').click();
            await sendPromise;
        });

        expect(sent).toEqual(['x']);
        const rows = document.querySelectorAll('[data-chat-message]');
        expect(rows[0].textContent).toContain('question');
        expect(rows[1].textContent).toContain('ok');
    });

    it('participantBanner fills from a joining agent in the roster', () => {
        const snap = snapshotWith([], { roster: [{ id: 'ag1', label: 'Sam', kind: 'agent' }] });
        const slots: ChatSlots = { participantBanner: (who) => <div data-testid="banner">{who?.label} is joining</div> };
        render(<StaticView snapshot={snap} slots={slots} />);
        expect(screen.getByTestId('banner').textContent).toBe('Sam is joining');
    });

    it('escalatedState + loadingState render on session state', () => {
        const escalated = snapshotWith([{ id: 'u1', role: 'user', content: 'help' }], {
            escalation: { reason: 'budget_exhausted' },
        });
        const slots: ChatSlots = {
            escalatedState: (reason) => <div data-testid="esc">{reason}</div>,
            loadingState: () => <div data-testid="load">…</div>,
        };
        const { rerender } = render(<StaticView snapshot={escalated} slots={slots} />);
        expect(screen.getByTestId('esc').textContent).toBe('budget_exhausted');
        expect(screen.queryByTestId('load')).toBeNull();

        const streaming = snapshotWith([{ id: 'a1', role: 'assistant', content: 'partial', streaming: { partial: true } }], {
            streaming: true,
        });
        rerender(<StaticView snapshot={streaming} slots={slots} />);
        expect(screen.getByTestId('load')).not.toBeNull();
    });

    it('adjudicationPanel is a declared slot but ships unfilled (no default render position)', () => {
        // The socket exists in the type surface (a consumer can pass it) but the
        // trigger is not modeled in the snapshot yet, so passing it renders nothing.
        const slots: ChatSlots = { adjudicationPanel: () => <div data-testid="adj">VERDICT</div> };
        render(<StaticView snapshot={oneMessage} slots={slots} />);
        expect(screen.queryByTestId('adj')).toBeNull();
    });
});
