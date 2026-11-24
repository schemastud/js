import * as React from 'react';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CardBoard, type CardBoardProps, type CardMoveResult } from '../src/card-board';

/** owner-review-20261112 ticket 46: the move contract of the card board (accept, refuse, the keyboard path). */

type Task = { id: string; title: string; lane: string };

const lanes = [
    { key: 'todo', title: 'To do' },
    { key: 'doing', title: 'Doing' },
    { key: 'done', title: 'Done' },
];

/** A caller that owns its cards and moves one only when `onMove` accepts, the way a host would. */
function Harness({ onMove }: { onMove: (card: Task, toLane: string) => CardMoveResult | Promise<CardMoveResult> }) {
    const [cards, setCards] = React.useState<Task[]>([
        { id: 'a', title: 'Write the brief', lane: 'todo' },
        { id: 'b', title: 'Ship it', lane: 'doing' },
    ]);
    const props: CardBoardProps<Task> = {
        lanes,
        cards,
        getCardKey: (c) => c.id,
        getCardLane: (c) => c.lane,
        getCardLabel: (c) => c.title,
        renderCard: (c) => <span>{c.title}</span>,
        onMove: async (card, toLane) => {
            const result = await onMove(card, toLane);
            const refused = result === false || (typeof result === 'object' && result !== null);
            if (!refused) setCards((cs) => cs.map((c) => (c.id === card.id ? { ...c, lane: toLane } : c)));
            return result;
        },
    };
    return <CardBoard {...props} />;
}

const laneOfCard = (title: string) => screen.getByText(title).closest('[data-lane]')?.getAttribute('data-lane');
/** The board's own polite live region (dnd-kit renders a second, silenced one). */
const status = () => {
    const region = screen.getAllByRole('status').find((el) => el.hasAttribute('data-card-board-status'));
    expect(region?.getAttribute('aria-live')).toBe('polite');
    return region?.textContent;
};

async function chooseLane(card: string, lane: string) {
    fireEvent.click(screen.getByRole('button', { name: `Move ${card}` }));
    await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: `Move to ${lane}` }));
    });
}

afterEach(cleanup);

describe('CardBoard move contract', () => {
    it('renders the caller’s lanes and cards, with the empty-lane copy and a count per lane', () => {
        render(<Harness onMove={() => true} />);
        expect(laneOfCard('Write the brief')).toBe('todo');
        expect(laneOfCard('Ship it')).toBe('doing');
        const done = screen.getByRole('region', { name: 'Done' });
        expect(within(done).getByText('Nothing here yet.')).toBeTruthy();
        expect(within(done).getByText('0')).toBeTruthy();
    });

    it('accepts a move: onMove gets the card and the lane, the card lands there and the move is announced', async () => {
        const onMove = vi.fn((): CardMoveResult => true);
        render(<Harness onMove={onMove} />);
        await chooseLane('Write the brief', 'Done');
        expect(onMove).toHaveBeenCalledTimes(1);
        expect(onMove.mock.calls[0]?.[0]).toMatchObject({ id: 'a' });
        expect(onMove.mock.calls[0]?.[1]).toBe('done');
        expect(laneOfCard('Write the brief')).toBe('done');
        expect(status()).toBe('Write the brief moved to Done.');
    });

    it('refuses a move: the card goes back to its lane and the board says why, on the card and aloud', async () => {
        let settle!: (r: CardMoveResult) => void;
        render(<Harness onMove={() => new Promise<CardMoveResult>((r) => (settle = r))} />);
        await chooseLane('Write the brief', 'Done');
        // Pending: the card shows where it was sent.
        expect(laneOfCard('Write the brief')).toBe('done');
        await act(async () => settle({ refused: 'Done needs a reviewer.' }));
        expect(laneOfCard('Write the brief')).toBe('todo');
        const said = 'Write the brief was not moved to Done: Done needs a reviewer.';
        expect(status()).toBe(said);
        const card = screen.getByText('Write the brief').closest('li') as HTMLElement;
        expect(within(card).getByText(said)).toBeTruthy();
    });

    it('treats false and a rejected promise as refusals', async () => {
        const { unmount } = render(<Harness onMove={() => false} />);
        await chooseLane('Ship it', 'To do');
        expect(laneOfCard('Ship it')).toBe('doing');
        expect(status()).toBe('Ship it was not moved to To do.');
        unmount();

        render(<Harness onMove={() => Promise.reject(new Error('Offline.'))} />);
        await chooseLane('Ship it', 'To do');
        expect(laneOfCard('Ship it')).toBe('doing');
        expect(status()).toBe('Ship it was not moved to To do: Offline.');
    });

    it('keyboard path: a visible, focusable Move control lists the other lanes, Escape closes it, and focus comes home', async () => {
        const onMove = vi.fn((): CardMoveResult => true);
        render(<Harness onMove={onMove} />);
        const toggle = screen.getByRole('button', { name: 'Move Write the brief' });
        // A native button in the tab order: Enter and Space activate it without a custom key handler.
        expect(toggle.tagName).toBe('BUTTON');
        expect(toggle.tabIndex).toBe(0);
        toggle.focus();
        expect(document.activeElement).toBe(toggle);

        fireEvent.click(toggle);
        expect(toggle.getAttribute('aria-expanded')).toBe('true');
        const options = screen.getAllByRole('button', { name: /^Move to / }).map((b) => b.textContent);
        expect(options).toEqual(['Move to Doing', 'Move to Done']);

        const first = screen.getByRole('button', { name: 'Move to Doing' });
        first.focus();
        fireEvent.keyDown(first, { key: 'Escape' });
        expect(screen.queryByRole('button', { name: 'Move to Doing' })).toBeNull();
        expect(document.activeElement).toBe(toggle);

        await chooseLane('Write the brief', 'Doing');
        expect(onMove).toHaveBeenCalledWith(expect.objectContaining({ id: 'a' }), 'doing');
        expect(laneOfCard('Write the brief')).toBe('doing');
        // Focus returns to the card's Move control, now in its new lane.
        expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Move Write the brief' }));
    });
});
