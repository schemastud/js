// @vitest-environment jsdom
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { type ChatMessage, type ChatSnapshot, emptySnapshot } from '../src/core/index';
import { ChatView, type ChatSlots, renderMessageMeta, useChat } from '../src/react/index';

/**
 * The row anchors a host styles against (owner-review-20261026 ticket 17, items 2A and 4B):
 * `data-latest` marks the latest settled reply, whose actions stay visible while every other
 * row's reveal on hover or focus; `data-chat-tail` marks the text the live caret follows on a
 * streaming turn; `aria-busy` tells assistive tech the turn is still arriving.
 */
function View({ snapshot, slots }: { snapshot: ChatSnapshot; slots?: ChatSlots }) {
    const core = { subscribe: () => () => {}, getSnapshot: () => snapshot, hydrate: () => {}, send: async () => {}, requestHuman: async () => {} };
    return <ChatView chat={useChat({ core })} slots={slots} />;
}
const rows = (c: HTMLElement) => [...c.querySelectorAll('[data-chat-message]')];

const SETTLED: ChatMessage[] = [
    { id: 'u1', role: 'user', content: 'one' },
    { id: 'a1', role: 'assistant', content: 'two' },
    { id: 'u2', role: 'user', content: 'three' },
    { id: 'a2', role: 'assistant', content: 'four' },
];

describe('data-latest (2A: the latest reply keeps its actions)', () => {
    it('marks only the latest non-user turn of a settled thread', () => {
        const { container } = render(<View snapshot={{ ...emptySnapshot(), messages: SETTLED }} />);
        expect(rows(container).map((r) => r.hasAttribute('data-latest'))).toEqual([false, false, false, true]);
    });

    it('marks the latest reply even when the user spoke last', () => {
        const { container } = render(<View snapshot={{ ...emptySnapshot(), messages: SETTLED.slice(0, 3) }} />);
        expect(rows(container).map((r) => r.hasAttribute('data-latest'))).toEqual([false, true, false]);
    });

    it('marks nothing while a reply streams', () => {
        const streaming: ChatMessage[] = [...SETTLED, { id: 'a3', role: 'assistant', content: 'fi', streaming: { partial: true } }];
        const { container } = render(<View snapshot={{ ...emptySnapshot(), messages: streaming, streaming: true }} />);
        expect(container.querySelector('[data-latest]')).toBeNull();
    });
});

describe('caret anchors (4B: the live caret on the arriving reply)', () => {
    it('a flat streaming turn: the content is the tail, and the row is busy', () => {
        const messages: ChatMessage[] = [
            { id: 'u1', role: 'user', content: 'q' },
            { id: 'a1', role: 'assistant', content: 'Arriving', streaming: { partial: true } },
        ];
        const { container } = render(<View snapshot={{ ...emptySnapshot(), messages, streaming: true }} />);
        const [user, reply] = rows(container);
        expect(reply.getAttribute('aria-busy')).toBe('true');
        expect(user.hasAttribute('aria-busy')).toBe(false);
        const tail = container.querySelectorAll('[data-chat-tail]');
        expect(tail).toHaveLength(1);
        expect(tail[0].matches('[data-chat-content]')).toBe(true);
        expect(tail[0].textContent).toBe('Arriving');
    });

    it('a segmented streaming turn: the trailing text segment is the tail', () => {
        const messages: ChatMessage[] = [
            {
                id: 'a1',
                role: 'assistant',
                content: '',
                streaming: { partial: true },
                segments: [
                    { type: 'text', text: 'Looking. ' },
                    { type: 'tool_call', toolId: 't', toolName: 'search', arguments: {} },
                    { type: 'text', text: 'Found it' },
                ],
            },
        ];
        const { container } = render(<View snapshot={{ ...emptySnapshot(), messages, streaming: true }} />);
        const tail = container.querySelectorAll('[data-chat-tail]');
        expect(tail).toHaveLength(1);
        expect(tail[0].getAttribute('data-chat-segment')).toBe('text');
        expect(tail[0].textContent).toBe('Found it');
    });

    it('no tail while a tool call is the trailing segment (no caret after a tool card)', () => {
        const messages: ChatMessage[] = [
            {
                id: 'a1',
                role: 'assistant',
                content: '',
                streaming: { partial: true },
                segments: [
                    { type: 'text', text: 'Looking. ' },
                    { type: 'tool_call', toolId: 't', toolName: 'search', arguments: {} },
                ],
            },
        ];
        const { container } = render(<View snapshot={{ ...emptySnapshot(), messages, streaming: true }} />);
        expect(container.querySelector('[data-chat-tail]')).toBeNull();
        expect(rows(container)[0].getAttribute('aria-busy')).toBe('true');
    });

    it('a settled turn carries no tail and is not busy', () => {
        const { container } = render(<View snapshot={{ ...emptySnapshot(), messages: SETTLED }} />);
        expect(container.querySelector('[data-chat-tail]')).toBeNull();
        expect(container.querySelector('[aria-busy]')).toBeNull();
    });

    it('the default meta adds no second streaming signal beside the caret', () => {
        const messages: ChatMessage[] = [{ id: 'a1', role: 'assistant', content: 'Arr', streaming: { partial: true } }];
        const { container } = render(<View snapshot={{ ...emptySnapshot(), messages, streaming: true }} slots={{ messageMeta: renderMessageMeta }} />);
        expect(container.querySelector('[data-chat-message-meta]')?.textContent).toBe('Assistant');
    });
});
