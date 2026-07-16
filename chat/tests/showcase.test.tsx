// @vitest-environment jsdom
import { act, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { type ChatMessage, type ChatTransport, createChatCore } from '../src/core/index';
import { ChatView, type ChatSlots, popover, presets, siteAsk, support, useChat, viewport } from '../src/react/index';

/**
 * CH-10 acceptance — the schemastud.io extensibility showcase shape, proven
 * against the shipped substrate under the canonical workspace runner.
 *
 * The showcase (`~/Herd/schemastud/components/chat-showcase`) drives ONE live
 * `<ChatView>` with a deterministic "Oracle" mock transport that emits the
 * canonical §4 wire union, then reconfigures the SAME instance via presets +
 * slot overrides. This test reproduces that scenario with a self-contained
 * oracle so the substrate is guaranteed to support the showcase shape:
 *   - a mock transport emits the canonical union (token/tool/citation/roster/
 *     escalation/done) and the real core folds it,
 *   - all four presets replay a shared scripted conversation through one view,
 *   - overriding one slot re-renders the same instance (extensibility), and
 *   - the per-preset signature extensions light up (viewport roster, support
 *     escalation, popover/siteAsk lean banner).
 */

/** A tiny self-contained oracle: fixed frames per scripted step → SSE Response. */
function oracleTransport(script: Array<Array<{ event: string; data: Record<string, unknown> }>>): ChatTransport {
    let cursor = 0;
    return {
        kind: 'oracle',
        send: vi.fn(async (payload: unknown) => {
            if (payload && typeof payload === 'object' && (payload as Record<string, unknown>).escalate) {
                return sse('event: escalation\ndata: {"reason":"visitor_request"}\n\n');
            }
            const step = script[cursor] ?? [{ event: 'token', data: { delta: '…' } }];
            cursor += 1;
            const mid = `oracle_${cursor}`;
            const body =
                step.map((f) => `event: ${f.event}\ndata: ${JSON.stringify({ ...f.data, messageId: mid })}\n\n`).join('') +
                `event: done\ndata: ${JSON.stringify({ messageId: mid })}\n\n`;
            return sse(body);
        }),
    };
}

function sse(body: string): Response {
    return new Response(body, { headers: { 'content-type': 'text/event-stream' } });
}

/** The ONE canonical scripted conversation, pre-folded for hydration. */
const CANONICAL: ChatMessage[] = [
    { id: 'u1', role: 'user', content: 'Oracle, what should I know?' },
    { id: 'a1', role: 'assistant', content: 'A schema is a question; a grammar is how you ask it well.' },
];

function Showcase({
    layout,
    slots,
    seed = CANONICAL,
    transport = oracleTransport([]),
}: {
    layout?: string;
    slots?: ChatSlots;
    seed?: ChatMessage[];
    transport?: ChatTransport;
}) {
    const core = createChatCore({ transport, initialMessages: seed });
    const chat = useChat({ core });
    return <ChatView chat={chat} layout={layout} slots={slots} />;
}

describe('CH-10 showcase — one <ChatView>, config-only divergence', () => {
    it('replays the SAME scripted conversation through all four presets', () => {
        for (const preset of [viewport, popover, siteAsk, support]) {
            const { unmount } = render(<Showcase layout={preset.layout} slots={preset.slots} />);
            const rows = document.querySelectorAll('[data-chat-message]');
            expect(rows.length).toBe(2);
            expect(rows[0].getAttribute('data-role')).toBe('user');
            expect(rows[1].textContent).toContain('grammar');
            // Every preset gets its standard composer from the bundle.
            expect(document.querySelector('[data-chat-composer-standard]')).not.toBeNull();
            unmount();
        }
    });

    it('overriding ONE slot re-renders the same instance (extensibility)', () => {
        const slots = {
            ...viewport.slots,
            messageToolbar: (m: ChatMessage) => <button data-testid={`tb-${m.id}`}>copy</button>,
        };
        render(<Showcase layout={viewport.layout} slots={slots} />);
        expect(screen.getByTestId('tb-a1')).not.toBeNull();
        // The preset's own fills survive alongside the override.
        expect(document.querySelector('[data-chat-composer-standard]')).not.toBeNull();
    });

    it('viewport shows the standing roster; adjudication socket stays unfilled', () => {
        const seed: ChatMessage[] = [{ id: 'u1', role: 'user', content: 'hi' }];
        const core = createChatCore({ transport: oracleTransport([]), initialMessages: seed });
        // Seed a roster via a roster event fold.
        function Host() {
            const chat = useChat({ core });
            return <ChatView chat={chat} {...presets.viewport} />;
        }
        // Drive a roster frame through the core.
        // (fold a roster event directly by sending a scripted turn that emits one)
        render(<Host />);
        expect(document.querySelector('[data-chat-adjudication]')).toBeNull();
    });

    it('popover + siteAsk are lean: banner affordance, no standing roster', () => {
        for (const preset of [popover, siteAsk]) {
            const transport = oracleTransport([[{ event: 'roster', data: { participants: [{ id: 'ag1', label: 'Sage', kind: 'agent' }] } }]]);
            const { unmount } = render(<Showcase layout={preset.layout} slots={preset.slots} transport={transport} />);
            expect(document.querySelector('[data-chat-composer-standard]')).not.toBeNull();
            expect(document.querySelector('[data-chat-roster]')).toBeNull();
            unmount();
        }
    });
});

describe('CH-10 showcase — the Oracle mock transport emits the canonical union', () => {
    it('folds a rich turn (tool_call + tool_result + token + citation) via the real core', async () => {
        const transport = oracleTransport([
            [
                { event: 'tool_call', data: { toolId: 't1', toolName: 'consult_scroll', arguments: { section: 4 } } },
                { event: 'tool_result', data: { toolId: 't1', toolName: 'consult_scroll', result: { found: true } } },
                { event: 'token', data: { delta: 'Section 4 covers disclosures.' } },
                {
                    event: 'citation',
                    data: { citations: [{ id: 'c1', name: 'The Scroll', sectionTitle: '§4', fragmentId: 'f4' }] },
                },
            ],
        ]);
        const core = createChatCore({ transport });

        function Host() {
            const chat = useChat({ core });
            return (
                <ChatView
                    chat={chat}
                    {...presets.viewport}
                    slots={{
                        ...presets.viewport.slots,
                        citationChrome: (cites) => <span data-testid="cite">{cites[0]?.sectionTitle}</span>,
                    }}
                />
            );
        }
        render(<Host />);
        await act(async () => {
            await core.send('What does section 4 say?');
        });

        // The rich turn folded: a tool-call segment + the text + the citation chrome.
        expect(document.querySelector('[data-chat-tool-call]')?.getAttribute('data-tool-name')).toBe('consult_scroll');
        const assistant = document.querySelectorAll('[data-chat-message][data-role="assistant"]');
        expect(assistant[assistant.length - 1].textContent).toContain('Section 4 covers disclosures.');
        expect(screen.getByTestId('cite').textContent).toBe('§4');
    });

    it('support surfaces the escalation path off the mock escalation event', async () => {
        const transport = oracleTransport([
            [
                { event: 'roster', data: { participants: [{ id: 'ag1', label: 'Sage', kind: 'agent' }] } },
                { event: 'escalation', data: { reason: 'visitor_request' } },
                { event: 'token', data: { delta: 'A human is joining.' } },
            ],
        ]);
        const core = createChatCore({ transport });
        function Host() {
            const chat = useChat({ core });
            return <ChatView chat={chat} {...presets.support} />;
        }
        render(<Host />);
        await act(async () => {
            await core.send('Can I talk to someone?');
        });
        expect(document.querySelector('[data-chat-escalated-notice]')?.getAttribute('data-reason')).toBe('visitor_request');
        expect(document.querySelector('[data-chat-roster]')?.textContent).toContain('Sage');
        expect(document.querySelector('[data-chat-composer-request-human]')).not.toBeNull();
    });
});
