// @vitest-environment jsdom
import { act, fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { type ChatMessage, type ChatSnapshot, type ChatTransport, createChatCore, emptySnapshot } from '../src/core/index';
import { ChatView, Composer, type ChatSlots, popover, presets, siteAsk, support, useChat, viewport } from '../src/react/index';

/**
 * CH-05 acceptance. The four presets are plain-code `{ layout?, slots }` bundles
 * spread onto the SAME `<ChatView>`; spreading a preset + overriding one slot
 * works; the standard `<Composer>` is a preset FILL that sends and reflects
 * streaming/escalated; and one canonical message set replays through all four
 * presets to prove config-only divergence. Runs in jsdom.
 */

function sseResponse(sse: string): Response {
    return new Response(sse, { headers: { 'content-type': 'text/event-stream' } });
}

function fakeTransport(responder: (payload: unknown) => Response): ChatTransport {
    return { kind: 'fake', send: vi.fn(async (payload: unknown) => responder(payload)) };
}

/** A `useChat` binding over a fixed snapshot (pure-render assertions, no streams). */
function StaticView({ snapshot, layout, slots }: { snapshot: ChatSnapshot; layout?: string; slots?: ChatSlots }) {
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
    return <ChatView chat={chat} layout={layout} slots={slots} />;
}

function snapshotWith(messages: ChatMessage[], patch: Partial<ChatSnapshot> = {}): ChatSnapshot {
    return { ...emptySnapshot(), messages, ...patch };
}

/** The ONE canonical message set replayed through every preset (config-only proof). */
const CANONICAL: ChatMessage[] = [
    { id: 'u1', role: 'user', content: 'What does section 4 say?' },
    { id: 'a1', role: 'assistant', content: 'Section 4 covers disclosures.' },
];

describe('presets — plain-code bundles', () => {
    it('exports the four presets as { layout, slots } bundles addressable on `presets`', () => {
        expect(presets.viewport).toBe(viewport);
        expect(presets.popover).toBe(popover);
        expect(presets.siteAsk).toBe(siteAsk);
        expect(presets.support).toBe(support);

        for (const preset of [viewport, popover, siteAsk, support]) {
            expect(typeof preset.layout).toBe('string');
            expect(preset.slots).toBeTypeOf('object');
        }
    });

    it('each preset records its own data-layout on the same <ChatView>', () => {
        const cases: Array<[typeof viewport, string]> = [
            [viewport, 'viewport'],
            [popover, 'popover'],
            [siteAsk, 'site-ask'],
            [support, 'support'],
        ];
        for (const [preset, expected] of cases) {
            const { unmount } = render(<StaticView snapshot={snapshotWith(CANONICAL)} layout={preset.layout} slots={preset.slots} />);
            expect(document.querySelector('[data-chat-view]')?.getAttribute('data-layout')).toBe(expected);
            unmount();
        }
    });

    it('spreading a preset and overriding ONE slot works (host wins)', () => {
        const slots = { ...viewport.slots, messageToolbar: (m: ChatMessage) => <button data-testid={`tb-${m.id}`}>copy</button> };
        render(<StaticView snapshot={snapshotWith(CANONICAL)} layout={viewport.layout} slots={slots} />);
        // The override is present…
        expect(screen.getByTestId('tb-a1')).not.toBeNull();
        // …and the preset's own fills survive (the standard composer).
        expect(document.querySelector('[data-chat-composer-standard]')).not.toBeNull();
    });
});

describe('preset variant shapes — same <ChatView>, config-only divergence', () => {
    it('viewport fills the standard composer + roster + empty/loading, wires (but leaves unfilled) adjudication', () => {
        // adjudicationPanel is present as a key but undefined (wired, unfilled).
        expect('adjudicationPanel' in viewport.slots).toBe(true);
        expect(viewport.slots.adjudicationPanel).toBeUndefined();

        const snap = snapshotWith(CANONICAL, { roster: [{ id: 'p1', label: 'Ana', kind: 'user' }] });
        render(<StaticView snapshot={snap} layout={viewport.layout} slots={viewport.slots} />);
        expect(document.querySelector('[data-chat-composer-standard]')).not.toBeNull();
        expect(document.querySelector('[data-chat-roster]')?.textContent).toContain('Ana');
        // No adjudication panel renders (no verdict trigger, socket unfilled).
        expect(document.querySelector('[data-chat-adjudication]')).toBeNull();
    });

    it('popover + siteAsk are lean: banner affordance, plain composer, no roster', () => {
        for (const preset of [popover, siteAsk]) {
            const snap = snapshotWith(CANONICAL, { roster: [{ id: 'ag1', label: 'Sam', kind: 'agent' }] });
            const { unmount } = render(<StaticView snapshot={snap} layout={preset.layout} slots={preset.slots} />);
            expect(document.querySelector('[data-chat-composer-standard]')).not.toBeNull();
            // The banner (atom A) fires off the joining agent.
            expect(document.querySelector('[data-chat-joining-banner]')?.textContent).toContain('Sam');
            // Lean presets do NOT fill the standing roster slot.
            expect(document.querySelector('[data-chat-roster]')).toBeNull();
            unmount();
        }
    });

    it('support surfaces the escalation UX: escalatedState + banner + request-human affordance', () => {
        const snap = snapshotWith(CANONICAL, {
            roster: [{ id: 'ag1', label: 'Sam', kind: 'agent' }],
            escalation: { reason: 'agent_requested' },
        });
        render(<StaticView snapshot={snap} layout={support.layout} slots={support.slots} />);
        // Escalated notice (from the escalation session state).
        expect(document.querySelector('[data-chat-escalated-notice]')?.getAttribute('data-reason')).toBe('agent_requested');
        // Participant banner for the joining agent.
        expect(document.querySelector('[data-chat-joining-banner]')?.textContent).toContain('Sam');
        // The composer exposes "talk to a human".
        expect(document.querySelector('[data-chat-composer-request-human]')).not.toBeNull();
    });

    it('replays the SAME canonical message set through all four presets (config-only story)', () => {
        for (const preset of [viewport, popover, siteAsk, support]) {
            const { unmount } = render(<StaticView snapshot={snapshotWith(CANONICAL)} layout={preset.layout} slots={preset.slots} />);
            const rows = document.querySelectorAll('[data-chat-message]');
            // Same two messages render in every preset — only the chrome differs.
            expect(rows.length).toBe(2);
            expect(rows[0].getAttribute('data-role')).toBe('user');
            expect(rows[0].textContent).toContain('What does section 4 say?');
            expect(rows[1].getAttribute('data-role')).toBe('assistant');
            expect(rows[1].textContent).toContain('Section 4 covers disclosures.');
            // Every preset gets a standard composer from its bundle.
            expect(document.querySelector('[data-chat-composer-standard]')).not.toBeNull();
            unmount();
        }
    });
});

describe('standard <Composer> — the preset fill', () => {
    it('sends the typed content through the core and clears the input', async () => {
        const core = createChatCore({
            transport: fakeTransport(() => sseResponse('event: token\ndata: {"delta":"ok"}\n\n')),
        });
        function Host() {
            const chat = useChat({ core });
            return <ChatView chat={chat} {...presets.siteAsk} />;
        }
        render(<Host />);

        const input = document.querySelector('[data-chat-composer-input]') as HTMLTextAreaElement;
        const send = document.querySelector('[data-chat-composer-send]') as HTMLButtonElement;

        // Empty input → send disabled.
        expect(send.disabled).toBe(true);

        fireEvent.change(input, { target: { value: 'hello' } });
        expect(send.disabled).toBe(false);

        await act(async () => {
            fireEvent.click(send);
        });

        // The turn round-tripped through the core.
        const rows = document.querySelectorAll('[data-chat-message]');
        expect(rows[0].textContent).toContain('hello');
        expect(rows[1].textContent).toContain('ok');
        // Input cleared after send.
        expect((document.querySelector('[data-chat-composer-input]') as HTMLTextAreaElement).value).toBe('');
    });

    it('reflects streaming: disables input + send while a turn is in flight', () => {
        const api = { send: vi.fn(async () => {}), requestHuman: vi.fn(async () => {}), streaming: true, escalated: false };
        render(<Composer {...api} />);
        expect((document.querySelector('[data-chat-composer-input]') as HTMLTextAreaElement).disabled).toBe(true);
        expect((document.querySelector('[data-chat-composer-send]') as HTMLButtonElement).disabled).toBe(true);
        expect(document.querySelector('[data-chat-composer-standard]')?.getAttribute('data-streaming')).toBe('true');
    });

    it('reflects escalated: exposes request-human when allowed, disables it once escalated', () => {
        const requestHuman = vi.fn(async () => {});
        const base = { send: vi.fn(async () => {}), requestHuman, streaming: false };

        // Not allowed → no request-human affordance.
        const { unmount } = render(<Composer {...base} escalated={false} />);
        expect(document.querySelector('[data-chat-composer-request-human]')).toBeNull();
        unmount();

        // Allowed, not yet escalated → clickable, calls requestHuman.
        const { unmount: unmount2 } = render(<Composer {...base} allowRequestHuman escalated={false} />);
        const btn = document.querySelector('[data-chat-composer-request-human]') as HTMLButtonElement;
        expect(btn.disabled).toBe(false);
        fireEvent.click(btn);
        expect(requestHuman).toHaveBeenCalledOnce();
        unmount2();

        // Allowed + already escalated → the affordance is disabled.
        render(<Composer {...base} allowRequestHuman escalated />);
        expect((document.querySelector('[data-chat-composer-request-human]') as HTMLButtonElement).disabled).toBe(true);
        expect(document.querySelector('[data-chat-composer-standard]')?.getAttribute('data-escalated')).toBe('true');
    });
});
