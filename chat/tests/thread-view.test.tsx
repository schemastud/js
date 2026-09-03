// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { ChatMessage } from '../src/core/index';
import { type ChatSlots, ChatView, ThreadView } from '../src/react/index';

/**
 * `<ThreadView>` — the indent/collapse render over the derived tree.
 *
 * The claims tested are the ones a screenshot would not settle: that the cap is
 * a render prop over one snapshot, that collapsing hides without discarding,
 * and that a linear consumer's `<ChatView>` is untouched by any of it.
 */

function message(id: string, replyToId?: string): ChatMessage {
    return { id, role: 'user', content: id, ...(replyToId === undefined ? {} : { replyToId }) };
}

const snapshot = {
    messages: [message('a'), message('b', 'a'), message('d', 'b'), message('c', 'a'), message('e')],
};

const rowIds = () =>
    Array.from(document.querySelectorAll('[data-thread-row] [data-chat-content]')).map((n) => n.textContent);

describe('<ThreadView>', () => {
    it('indents rows by derived depth', () => {
        render(<ThreadView snapshot={snapshot} maxDepth={null} />);

        expect(rowIds()).toEqual(['a', 'b', 'd', 'c', 'e']);
        const depths = Array.from(document.querySelectorAll('[data-thread-row]')).map((n) =>
            n.getAttribute('data-depth'),
        );
        expect(depths).toEqual(['0', '1', '2', '1', '0']);
    });

    it('renders the same snapshot flat at maxDepth 1 and nested at null', () => {
        const { unmount } = render(<ThreadView snapshot={snapshot} maxDepth={1} />);
        expect(rowIds()).toEqual(['a', 'e']);
        unmount();

        render(<ThreadView snapshot={snapshot} maxDepth={null} />);
        expect(rowIds()).toEqual(['a', 'b', 'd', 'c', 'e']);
    });

    it('collapses and re-expands a subtree from the default toggle', () => {
        render(<ThreadView snapshot={snapshot} maxDepth={null} />);

        // The count is descendants at any depth, not immediate children.
        const toggle = screen.getByText('Hide 3 replies');
        fireEvent.click(toggle);
        expect(rowIds()).toEqual(['a', 'e']);

        fireEvent.click(screen.getByText('Show 3 replies'));
        expect(rowIds()).toEqual(['a', 'b', 'd', 'c', 'e']);
    });

    it('hands the depth/collapse facts to a threadRowChrome fill', () => {
        const slots: ChatSlots = {
            threadRowChrome: (row) => <span data-testid={`chrome-${row.message.id}`}>{`${row.depth}:${row.childCount}`}</span>,
        };
        render(<ThreadView snapshot={snapshot} maxDepth={null} slots={slots} />);

        expect(screen.getByTestId('chrome-a').textContent).toBe('0:3');
        expect(screen.getByTestId('chrome-b').textContent).toBe('1:1');
        expect(screen.getByTestId('chrome-e').textContent).toBe('0:0');
    });
});

describe('<ChatView> is untouched', () => {
    it('still renders every message flat, ignoring replyToId entirely', () => {
        const chat = {
            snapshot: { ...snapshot, roster: [], sessionId: null, escalation: null, streaming: false },
            send: async () => {},
            requestHuman: async () => {},
        } as unknown as Parameters<typeof ChatView>[0]['chat'];
        render(<ChatView chat={chat} />);

        const bodies = Array.from(document.querySelectorAll('[data-chat-content]')).map((n) => n.textContent);
        expect(bodies).toEqual(['a', 'b', 'd', 'c', 'e']);
        expect(document.querySelector('[data-thread-row]')).toBeNull();
    });
});
