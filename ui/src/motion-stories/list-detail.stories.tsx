import type { Meta, StoryObj } from '@storybook/react-vite';
import { ArrowLeft } from 'lucide-react';
import * as React from 'react';
import { expect, userEvent, waitFor, within } from 'storybook/test';
import { Badge } from '../badge';
import { Button } from '../button';
import { cn } from '../cn';
import { DetailSwap } from '../motion';
import { useIsMobile } from '../use-mobile';

/**
 * Motion/C1 + C2 List → detail (owner-review 18, ruled 2026-11-02). Desktop (C1): the detail pane
 * re-keys on each selection and fades in over 120 ms, opacity only — rapid stepping never fights
 * it. Phone (C2): list and detail stack; opening pushes the detail in 16 px from the right, Back
 * returns the list from the left, and focus moves with the view: `DetailSwap` focuses the detail
 * heading on push and the row that opened it on Back (P2-a11y). Reduced motion: both are a fade.
 */
const meta = {
    title: 'Motion/C1 + C2 List → detail',
    parameters: { layout: 'fullscreen' },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

const CONCEPTS = [
    { id: 'c-101', name: 'Retention policy', status: 'needs_review', owner: 'Compliance', summary: 'How long customer records are kept after an account closes, and how each index is purged.' },
    { id: 'c-102', name: 'Data residency', status: 'published', owner: 'Platform', summary: 'Which region stores each tenant’s content, and what may cross a region boundary.' },
    { id: 'c-103', name: 'Escalation path', status: 'generating', owner: 'Support', summary: 'Who is paged, in what order, when an agent cannot answer within the service window.' },
    { id: 'c-104', name: 'Refund eligibility', status: 'published', owner: 'Billing', summary: 'The conditions under which a subscription charge is refunded, in full or pro rata.' },
    { id: 'c-105', name: 'Vendor onboarding', status: 'failed', owner: 'Procurement', summary: 'The checks a new vendor clears before any tenant data is shared with them.' },
];

function Detail({ concept, onBack }: { concept: (typeof CONCEPTS)[number]; onBack?: () => void }) {
    return (
        <article className="grid gap-3 p-5">
            {onBack ? (
                <Button variant="ghost" size="sm" className="w-fit" onClick={onBack} data-demo="back">
                    <ArrowLeft className="size-4" /> Concepts
                </Button>
            ) : null}
            <div className="flex items-center gap-2">
                {/* DetailSwap focuses this on a phone push; tabIndex -1 keeps it out of the tab order. */}
                <h2 tabIndex={-1} data-swap-focus className="text-lg font-semibold outline-none" data-demo="detail-title">
                    {concept.name}
                </h2>
                <Badge variant="outline" className="font-mono">
                    {concept.status}
                </Badge>
            </div>
            <p className="font-mono text-[11px] text-muted-foreground">
                {concept.id} · {concept.owner}
            </p>
            <p className="max-w-[60ch] text-sm">{concept.summary}</p>
        </article>
    );
}

function ListDetail({ phone = false }: { phone?: boolean }) {
    const mobile = useIsMobile() || phone;
    const [selected, setSelected] = React.useState(0);
    const [view, setView] = React.useState<'list' | 'detail'>('list');
    const [direction, setDirection] = React.useState<'push' | 'back'>('push');
    const concept = CONCEPTS[selected];

    const list = (
        <ul className="divide-y divide-border">
            {CONCEPTS.map((c, i) => (
                <li key={c.id}>
                    <button
                        type="button"
                        data-demo={`row-${i}`}
                        // Back returns focus here: the row that opened the detail.
                        data-swap-focus={(mobile && i === selected) || undefined}
                        aria-current={!mobile && i === selected ? 'true' : undefined}
                        onClick={() => {
                            setSelected(i);
                            setDirection('push');
                            setView('detail');
                        }}
                        className={cn(
                            'w-full px-4 py-2.5 text-left text-sm transition-colors hover:bg-muted/60',
                            !mobile && i === selected && 'bg-accent text-accent-foreground',
                        )}
                    >
                        <span className="block font-medium">{c.name}</span>
                        <span className="block font-mono text-[10.5px] text-muted-foreground">{c.id}</span>
                    </button>
                </li>
            ))}
        </ul>
    );

    if (mobile) {
        return (
            <div className="overflow-hidden rounded-lg border border-border bg-card">
                <DetailSwap swapKey={view === 'detail' ? `d-${concept.id}` : 'list'} motion={direction}>
                    {view === 'detail' ? (
                        <Detail
                            concept={concept}
                            onBack={() => {
                                setDirection('back');
                                setView('list');
                            }}
                        />
                    ) : (
                        list
                    )}
                </DetailSwap>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-[280px_1fr] overflow-hidden rounded-lg border border-border bg-card">
            <div className="border-r border-border">{list}</div>
            <DetailSwap swapKey={concept.id} motion="soft-cut" data-demo="detail">
                <Detail concept={concept} />
            </DetailSwap>
        </div>
    );
}

export const ListToDetail: Story = {
    name: 'Soft cut (desktop) · push/back (phone)',
    render: () => (
        <div className="max-w-[960px] p-4 sm:p-8">
            <ListDetail />
        </div>
    ),
};

/**
 * The C2 phone stack at any viewport, with the focus contract as a play test: push focuses the
 * detail heading, Back returns focus to the row that opened it — never `<body>`.
 */
export const PhoneStackFocus: Story = {
    name: 'Phone push/back · focus follows (play)',
    render: () => (
        <div className="max-w-[390px] p-4">
            <ListDetail phone />
        </div>
    ),
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        const row = canvas.getByRole('button', { name: /Escalation path/ });
        row.focus();
        await userEvent.keyboard('{Enter}');
        const heading = await canvas.findByRole('heading', { name: 'Escalation path' });
        await waitFor(() => expect(document.activeElement).toBe(heading));

        await userEvent.click(canvas.getByRole('button', { name: /Concepts/ }));
        await waitFor(() =>
            expect(document.activeElement).toBe(canvas.getByRole('button', { name: /Escalation path/ })),
        );
        await expect(document.activeElement).not.toBe(document.body);
    },
};
