// @vitest-environment jsdom
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { type ChatMessage, type ChatSnapshot, emptySnapshot } from '../src/core/index';
import { ChatView, type ChatSlots, renderMessageMeta, useChat, viewport } from '../src/react/index';

/**
 * A turn carries its identity (owner-review-20261026 ticket 17, item 1, ruled 2026-11-02).
 * The `messageMeta` slot renders above the body; `data-continued` marks the
 * second and later turns of a same-author run; `data-streaming` marks a turn
 * still arriving.
 */
function StaticView({ snapshot, slots }: { snapshot: ChatSnapshot; slots?: ChatSlots }) {
    const core = {
        subscribe: () => () => {},
        getSnapshot: () => snapshot,
        hydrate: () => {},
        send: async () => {},
        requestHuman: async () => {},
    };
    return <ChatView chat={useChat({ core })} slots={slots} />;
}

const at = '2026-11-02T14:02:00Z';
const MESSAGES: ChatMessage[] = [
    { id: 'u1', role: 'user', content: 'Hello', createdAt: at },
    { id: 'a1', role: 'assistant', content: 'Hi', createdAt: at, author: { id: 'ag', label: 'Policy Analyst', kind: 'agent' } },
    { id: 'a2', role: 'assistant', content: 'More', createdAt: at, author: { id: 'ag', label: 'Policy Analyst', kind: 'agent' }, streaming: { partial: true } },
];

describe('messageMeta + run grouping', () => {
    it('renders no meta when the slot is unfilled', () => {
        const { container } = render(<StaticView snapshot={{ ...emptySnapshot(), messages: MESSAGES }} />);
        expect(container.querySelector('[data-chat-message-meta]')).toBeNull();
    });

    it('the viewport preset fills the default author + time line', () => {
        const { container } = render(<StaticView snapshot={{ ...emptySnapshot(), messages: MESSAGES }} slots={viewport.slots} />);
        const authors = [...container.querySelectorAll('[data-chat-author]')].map((n) => n.textContent);
        expect(authors).toEqual(['You', 'Policy Analyst', 'Policy Analyst']);
        expect(container.querySelector('time[data-chat-time]')?.getAttribute('datetime')).toBe(at);
    });

    it('marks continued and streaming rows', () => {
        const { container } = render(
            <StaticView snapshot={{ ...emptySnapshot(), messages: MESSAGES }} slots={{ messageMeta: renderMessageMeta }} />,
        );
        const rows = [...container.querySelectorAll('[data-chat-message]')];
        expect(rows.map((r) => r.hasAttribute('data-continued'))).toEqual([false, false, true]);
        expect(rows.map((r) => r.hasAttribute('data-streaming'))).toEqual([false, false, true]);
    });
});

describe('identity option', () => {
    function IdentityView({ identity }: { identity?: 'byline' | 'avatar' }) {
        const snapshot = { ...emptySnapshot(), messages: MESSAGES };
        const core = { subscribe: () => () => {}, getSnapshot: () => snapshot, hydrate: () => {}, send: async () => {}, requestHuman: async () => {} };
        return <ChatView chat={useChat({ core })} slots={viewport.slots} identity={identity} />;
    }
    it('defaults to byline: no avatar mark', () => {
        const { container } = render(<IdentityView />);
        expect(container.querySelector('[data-chat-view]')?.getAttribute('data-identity')).toBe('byline');
        expect(container.querySelector('[data-chat-avatar]')).toBeNull();
    });
    it('avatar renders a mark on non-user turns only', () => {
        const { container } = render(<IdentityView identity="avatar" />);
        expect(container.querySelector('[data-chat-view]')?.getAttribute('data-identity')).toBe('avatar');
        expect([...container.querySelectorAll('[data-chat-avatar]')].map((n) => n.textContent)).toEqual(['PA', 'PA']);
    });
});

describe('frame option (item 3C: bleed is the default)', () => {
    function FrameView({ frame }: { frame?: 'bleed' | 'contained' }) {
        const snapshot = { ...emptySnapshot(), messages: MESSAGES };
        const core = { subscribe: () => () => {}, getSnapshot: () => snapshot, hydrate: () => {}, send: async () => {}, requestHuman: async () => {} };
        return <ChatView chat={useChat({ core })} slots={viewport.slots} frame={frame} />;
    }
    it('defaults to bleed (edge to edge)', () => {
        const { container } = render(<FrameView />);
        expect(container.querySelector('[data-chat-view]')?.getAttribute('data-frame')).toBe('bleed');
    });
    it('records contained when asked', () => {
        const { container } = render(<FrameView frame="contained" />);
        expect(container.querySelector('[data-chat-view]')?.getAttribute('data-frame')).toBe('contained');
    });
});
