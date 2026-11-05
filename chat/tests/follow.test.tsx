// @vitest-environment jsdom
import { fireEvent, render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { type ChatMessage, type ChatSnapshot, emptySnapshot } from '../src/core/index';
import { ChatView, type ChatSlots, useChat } from '../src/react/index';

/**
 * Item 4A (owner-review-20261026 ticket 17, ruled 2026-11-02): the list follows the latest turn and
 * offers "jump to latest" once the reader scrolls away. jsdom has no layout, so the scroll geometry is
 * stubbed on the list element.
 */
function View({ snapshot, slots, follow }: { snapshot: ChatSnapshot; slots?: ChatSlots; follow?: boolean }) {
    const core = { subscribe: () => () => {}, getSnapshot: () => snapshot, hydrate: () => {}, send: async () => {}, requestHuman: async () => {} };
    return <ChatView chat={useChat({ core })} slots={slots} follow={follow} />;
}
const msgs: ChatMessage[] = [
    { id: 'a', role: 'user', content: 'one' },
    { id: 'b', role: 'assistant', content: 'two' },
];
function geometry(el: Element, { scrollHeight, clientHeight, scrollTop }: { scrollHeight: number; clientHeight: number; scrollTop: number }) {
    Object.defineProperty(el, 'scrollHeight', { configurable: true, value: scrollHeight });
    Object.defineProperty(el, 'clientHeight', { configurable: true, value: clientHeight });
    (el as HTMLElement).scrollTop = scrollTop;
}

describe('follow + jumpToLatest', () => {
    it('offers the jump only after the reader scrolls away, and uses the fill', () => {
        const { container, queryByText, getByText } = render(
            <View snapshot={{ ...emptySnapshot(), messages: msgs }} slots={{ jumpToLatest: ({ unseen }) => <b>{unseen ? 'new' : 'jump'}</b> }} />,
        );
        const list = container.querySelector('[data-chat-messages]')!;
        expect(list.getAttribute('data-following')).toBe('true');
        expect(queryByText('jump')).toBeNull();
        geometry(list, { scrollHeight: 1000, clientHeight: 400, scrollTop: 100 });
        fireEvent.scroll(list);
        expect(getByText('jump')).toBeTruthy();
        expect(list.getAttribute('data-following')).toBe('false');
        geometry(list, { scrollHeight: 1000, clientHeight: 400, scrollTop: 590 });
        fireEvent.scroll(list);
        expect(queryByText('jump')).toBeNull();
    });

    it('does nothing when follow is off', () => {
        const { container } = render(<View snapshot={{ ...emptySnapshot(), messages: msgs }} follow={false} />);
        const list = container.querySelector('[data-chat-messages]')!;
        expect(list.hasAttribute('data-following')).toBe(false);
        geometry(list, { scrollHeight: 1000, clientHeight: 400, scrollTop: 0 });
        fireEvent.scroll(list);
        expect(container.querySelector('[data-chat-jump]')).toBeNull();
    });

    it('follows growth while at the end, and marks unseen growth while away', () => {
        const snap = (content: string) => ({ ...emptySnapshot(), messages: [msgs[0], { ...msgs[1], content }] });
        const { container, rerender, getByText } = render(<View snapshot={snap('two')} />);
        const list = container.querySelector('[data-chat-messages]')! as HTMLElement;
        // At the end: growth pins the list to its new end.
        geometry(list, { scrollHeight: 1000, clientHeight: 400, scrollTop: 600 });
        fireEvent.scroll(list);
        geometry(list, { scrollHeight: 1200, clientHeight: 400, scrollTop: 600 });
        rerender(<View snapshot={snap('two and more')} />);
        expect(list.scrollTop).toBe(1200);
        // Away: growth leaves the reader where they are and flags it.
        geometry(list, { scrollHeight: 1200, clientHeight: 400, scrollTop: 100 });
        fireEvent.scroll(list);
        expect(getByText('Jump to latest')).toBeTruthy();
        geometry(list, { scrollHeight: 1400, clientHeight: 400, scrollTop: 100 });
        rerender(<View snapshot={snap('two and more and more')} />);
        expect(list.scrollTop).toBe(100);
        expect(getByText('New messages')).toBeTruthy();
    });

    it('the jump scrolls the list to its end', () => {
        const { container, getByText } = render(<View snapshot={{ ...emptySnapshot(), messages: msgs }} />);
        const list = container.querySelector('[data-chat-messages]')! as HTMLElement;
        const scrollTo = vi.fn();
        list.scrollTo = scrollTo as unknown as HTMLElement['scrollTo'];
        geometry(list, { scrollHeight: 1000, clientHeight: 400, scrollTop: 0 });
        fireEvent.scroll(list);
        fireEvent.click(getByText('Jump to latest'));
        expect(scrollTo).toHaveBeenCalledWith(expect.objectContaining({ top: 1000 }));
    });
});
