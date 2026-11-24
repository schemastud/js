import * as React from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { CardBoard, type CardBoardLane, type CardMoveResult } from './card-board';

/**
 * Foundation/CardBoard (owner-review-20261112 ticket 46). Caller-supplied lanes and cards; a card moves by drag (its
 * grip) or by its visible Move control, and both call the one `onMove`, which may refuse. These stories hold their
 * cards in local state the way a host would. The Done lane refuses a card without an owner, to show a refusal: the
 * card goes back and the board says why.
 */

type Item = { id: string; title: string; owner?: string; lane: string };

const lanes: CardBoardLane[] = [
    { key: 'new', title: 'New' },
    { key: 'review', title: 'In review' },
    { key: 'done', title: 'Done' },
];

function Board({ initial, laneSet = lanes }: { initial: Item[]; laneSet?: CardBoardLane[] }) {
    const [cards, setCards] = React.useState(initial);
    const onMove = async (card: Item, toLane: string): Promise<CardMoveResult> => {
        await new Promise((r) => setTimeout(r, 400));
        if (toLane === 'done' && !card.owner) return { refused: 'A card needs an owner before it is done.' };
        setCards((cs) => cs.map((c) => (c.id === card.id ? { ...c, lane: toLane } : c)));
        return true;
    };
    return (
        <CardBoard
            label="Example board"
            lanes={laneSet}
            cards={cards}
            getCardKey={(c) => c.id}
            getCardLane={(c) => c.lane}
            getCardLabel={(c) => c.title}
            renderCard={(c) => (
                <>
                    <p className="text-[13px] font-medium">{c.title}</p>
                    <p className="text-xs text-muted-foreground">{c.owner ?? 'No owner'}</p>
                </>
            )}
            onMove={onMove}
        />
    );
}

const few: Item[] = [
    { id: '1', title: 'Draft the welcome email', owner: 'Ana', lane: 'new' },
    { id: '2', title: 'Check the price table', lane: 'new' },
    { id: '3', title: 'Approve the logo', owner: 'Sam', lane: 'review' },
];

const meta = {
    title: 'Foundation/CardBoard',
    component: Board,
    tags: ['autodocs'],
    args: { initial: few },
    parameters: { layout: 'padded' },
} satisfies Meta<typeof Board>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** Every lane empty: each shows the shared "Nothing here yet." line and a zero count, and still takes a drop. */
export const EmptyLanes: Story = { args: { initial: [] } };

/** One lane carries forty cards; the board grows with the page rather than scrolling inside a lane. */
export const LongLane: Story = {
    args: {
        initial: [
            ...Array.from({ length: 40 }, (_, i) => ({
                id: `long-${i + 1}`,
                title: `Follow up with lead ${i + 1}`,
                owner: i % 3 === 0 ? undefined : 'Ana',
                lane: 'new',
            })),
            { id: 'r1', title: 'Approve the logo', owner: 'Sam', lane: 'review' },
        ],
    },
};

/**
 * At 390px the lanes scroll sideways one at a time, snapping to each lane; every card keeps its Move control. The
 * board narrows by its own width, so a 390px frame shows the phone layout at any viewport.
 */
export const Narrow390: Story = {
    decorators: [
        (Story) => (
            <div style={{ width: 390, maxWidth: '100%' }}>
                <Story />
            </div>
        ),
    ],
};
