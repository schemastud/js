import type { Meta, StoryObj } from '@storybook/react-vite';
import { type ReactNode } from 'react';
import { within, waitFor } from 'storybook/test';
import { Input, Popover, PopoverContent, PopoverTrigger } from '@schemastud/ui';
import type { ComboboxOption, ComboboxPrimitives } from '@schemastud/combobox';
import { Breadcrumb, type BreadcrumbCrumb } from './Breadcrumb';

/**
 * Frame/Breadcrumb (component-seams ticket 18). A host-agnostic breadcrumb trail: each crumb is a
 * plain link (`path`), a searchable sibling-`switcher` (backed by @schemastud/combobox — so record
 * breadcrumbs scale to large dynamic lists), or — with neither — the current unlinked leaf. The host
 * owns the crumb data + navigation (`onNavigate`) and injects the switcher's UI atoms (`primitives`);
 * the component owns only the presentation + switcher wiring.
 *
 * Ambient token + light⊗dark are inherited from the workbench (ticket 14 `.storybook` preview +
 * colorScheme toolbar) — no per-story fighting.
 *
 * Ticket-13 capability-gated axes, covered ONLY where exposed (rule of sanction — absent = absent,
 * not a gap):
 *  - **states** (the dominant axis) — Breadcrumb has no `variant`/`size`/`tone`/`density` props, but a
 *    rich set of *shape/data* states: short trail, deep trail, an overflowing/truncated crumb, a
 *    host-collapsed (ellipsis) trail, and a live searchable **switcher** crumb whose async search is
 *    `play`-awaited so a future VR baseline captures settled results, never the loading flash.
 *  - **viewport** — a breadcrumb is a responsive surface (deep trails wrap / a host collapses them on
 *    mobile), so the `Mobile`/`Desktop` viewport axis is carried.
 *  - **canvas** (`flat`/`dotted` decorator) — breadcrumb is chrome that must read legibly on either
 *    `main`-region background, so it is proven on both.
 *
 * Not exposed → not storied (absent-not-a-gap): `variant`, `size`, `tone`, `density`.
 *
 * No provider/Frame injection is needed: the switcher's atoms arrive as a plain `primitives` prop
 * (the combobox works outside any provider by design — see @schemastud/combobox), so this pure
 * primitive needs no `story-harness`. The workbench `@schemastud/ui` Popover/Input satisfy the
 * `ComboboxPrimitives` contract.
 */

// The workbench binding of the switcher's injected atoms — the same @schemastud/ui primitives an app
// would pass. Kept out of `dist` (this is a *.stories.tsx, excluded from the tsup index-only entry).
const primitives: ComboboxPrimitives = {
    Popover,
    PopoverTrigger,
    PopoverContent,
    Input,
};

const meta = {
    title: 'Frame/Breadcrumb',
    component: Breadcrumb,
    tags: ['autodocs'],
    parameters: { layout: 'padded' },
    args: {
        primitives,
        // A no-op nav that surfaces the chosen path in Storybook's actions/console.
        onNavigate: (path: string) => console.log('navigate →', path),
    },
} satisfies Meta<typeof Breadcrumb>;

export default meta;
type Story = StoryObj<typeof meta>;

// A canvas decorator (ticket 13 — flat/dotted, a decorator never a leaf arg). Breadcrumbs sit in the
// mainframe `main` region, which is either flat (`bg-background`) or dotted; both must read.
function withCanvas(canvas: 'flat' | 'dotted') {
    return function CanvasDecorator(children: ReactNode) {
        return (
            <div
                className="min-w-[28rem] rounded-md p-4"
                style={
                    canvas === 'dotted'
                        ? {
                              backgroundColor: 'var(--background)',
                              backgroundImage:
                                  'radial-gradient(color-mix(in oklch, var(--foreground) 18%, transparent) 1px, transparent 1px)',
                              backgroundSize: '12px 12px',
                          }
                        : { backgroundColor: 'var(--background)' }
                }
            >
                {children}
            </div>
        );
    };
}

/* ------------------------------------------------------------------ *
 * Fixtures — plain-link + current-leaf crumbs (no host coupling).
 * ------------------------------------------------------------------ */

const shortTrail: BreadcrumbCrumb[] = [
    { label: 'Home', path: '/' },
    { label: 'Settings' }, // current leaf — no path, no switcher
];

const deepTrail: BreadcrumbCrumb[] = [
    { label: 'Home', path: '/' },
    { label: 'Workspace', path: '/workspace' },
    { label: 'Projects', path: '/workspace/projects' },
    { label: 'Splicewire', path: '/workspace/projects/splicewire' },
    { label: 'Records', path: '/workspace/projects/splicewire/records' },
    { label: 'Invoice #4821' }, // current leaf
];

const overflowingTrail: BreadcrumbCrumb[] = [
    { label: 'Home', path: '/' },
    {
        label: 'A very long ancestor label that exceeds the crumb max width and must truncate',
        path: '/long',
    },
    { label: 'Another exceedingly verbose current record title that also overflows its crumb box' },
];

// Host-collapsed (ellipsis) trail — collapsing is the HOST's job (the component renders whatever
// crumb array it's given), so an ellipsis crumb is just a plain crumb whose label is "…". This
// documents the sanctioned collapsed shape without the component needing a `collapse` prop.
const collapsedTrail: BreadcrumbCrumb[] = [
    { label: 'Home', path: '/' },
    { label: '…', path: '/workspace/projects/splicewire' },
    { label: 'Records', path: '/workspace/projects/splicewire/records' },
    { label: 'Invoice #4821' },
];

/* ------------------------------------------------------------------ *
 * Fixture — a switcher crumb (async sibling search).
 * ------------------------------------------------------------------ */

const siblingRecords: ComboboxOption[] = [
    { value: '/records/4819', label: 'Invoice #4819', hint: 'Acme Corp · paid' },
    { value: '/records/4820', label: 'Invoice #4820', hint: 'Globex · overdue' },
    { value: '/records/4821', label: 'Invoice #4821', hint: 'Initech · draft' },
    { value: '/records/4822', label: 'Invoice #4822', hint: 'Umbrella · sent' },
    { value: '/records/4823', label: 'Invoice #4823', hint: 'Soylent · paid' },
];

async function searchSiblings(query: string): Promise<ComboboxOption[]> {
    // A tiny latency so the debounce/loading path is real; stale queries are dropped by the combobox.
    await new Promise((r) => setTimeout(r, 30));
    const q = query.trim().toLowerCase();
    if (!q) return siblingRecords;
    return siblingRecords.filter(
        (o) => o.label.toLowerCase().includes(q) || o.hint?.toLowerCase().includes(q),
    );
}

const switcherTrail: BreadcrumbCrumb[] = [
    { label: 'Home', path: '/' },
    { label: 'Records', path: '/records' },
    {
        // A searchable sibling-switcher on the current record — the scaling affordance.
        label: 'Invoice #4821',
        switcher: {
            search: searchSiblings,
            currentValue: '/records/4821',
            placeholder: 'Switch invoice…',
            emptyText: 'No matching invoices',
        },
    },
];

/* ------------------------------------------------------------------ *
 * Stories — the representative shapes / states.
 * ------------------------------------------------------------------ */

/** states = short trail — two crumbs: a link + the current leaf. The baseline shape. */
export const ShortTrail: Story = {
    args: { crumbs: shortTrail },
};

/** states = deep trail — six crumbs. Every non-final crumb is a link; the last is the current leaf. */
export const DeepTrail: Story = {
    args: { crumbs: deepTrail },
};

/**
 * states = truncation/overflow — long labels exceed the crumb `max-w` and truncate with an ellipsis,
 * so the trail never blows out its row.
 */
export const OverflowingTrail: Story = {
    args: { crumbs: overflowingTrail },
};

/**
 * states = collapsed / ellipsis — the host has folded the middle of a deep trail into a single `…`
 * crumb (a plain link). Collapsing is a host concern; the component renders the collapsed array as-is.
 */
export const Collapsed: Story = {
    args: { crumbs: collapsedTrail },
};

/** A custom `separator` — swap the default slash for a chevron glyph. */
export const CustomSeparator: Story = {
    args: {
        crumbs: deepTrail,
        separator: <span className="text-muted-foreground/60">›</span>,
    },
};

/**
 * states = switcher (async) — the last crumb is a searchable sibling-switcher. The `play` opens the
 * popover and awaits the settled option list, so a VR baseline captures loaded results, never the
 * loading flash.
 */
export const WithSwitcher: Story = {
    args: {
        crumbs: switcherTrail,
        switcherAffordance: <span aria-hidden className="text-muted-foreground/70">▾</span>,
    },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        // Open the switcher crumb (its trigger carries the current label).
        const trigger = await canvas.findByRole('button', { name: /Invoice #4821/i });
        trigger.click();
        // Await the async sibling search settling — the popover renders in a portal (document.body),
        // so query the whole document, not just the story canvas.
        const body = within(document.body);
        await waitFor(async () => {
            const hits = await body.findAllByText(/Invoice #48\d\d/i);
            // The trigger label + at least a couple of option rows are present ⇒ results settled.
            if (hits.length < 2) throw new Error('sibling options not settled yet');
        });
    },
};

/* ------------------------------------------------------------------ *
 * Ambient / structural axes — canvas + viewport.
 * ------------------------------------------------------------------ */

/** canvas = flat — the breadcrumb read on a flat `bg-background` main region. */
export const CanvasFlat: Story = {
    args: { crumbs: deepTrail },
    decorators: [(Story) => withCanvas('flat')(<Story />)],
};

/** canvas = dotted — the same trail read on a dotted main region (mainframe `dotted-bg`). */
export const CanvasDotted: Story = {
    args: { crumbs: deepTrail },
    decorators: [(Story) => withCanvas('dotted')(<Story />)],
};

/**
 * viewport = mobile — a deep trail in a narrow column. Breadcrumbs are a responsive surface: the trail
 * wraps rather than overflowing, and a host typically collapses to `…` at this width (see `Collapsed`).
 */
export const Mobile: Story = {
    args: { crumbs: deepTrail },
    parameters: { viewport: { defaultViewport: 'mobile1' } },
    decorators: [(Story) => <div className="max-w-[22rem]"><Story /></div>],
};

/** viewport = desktop — the same deep trail with room to lay out on one row. */
export const Desktop: Story = {
    args: { crumbs: deepTrail },
    parameters: { viewport: { defaultViewport: 'desktop' } },
};

/**
 * The catalog matrix — every representative shape in one frame (short / deep / overflow / collapsed /
 * switcher), so a reviewer reads the whole state axis at a glance and a VR baseline covers it in one
 * snapshot. The switcher crumb here stays closed (its open/loaded state is the `WithSwitcher` story).
 */
export const AllShapes: Story = {
    render: (args) => (
        <div className="grid gap-4">
            {(
                [
                    ['Short', shortTrail],
                    ['Deep', deepTrail],
                    ['Overflowing', overflowingTrail],
                    ['Collapsed', collapsedTrail],
                    ['Switcher', switcherTrail],
                ] as const
            ).map(([name, crumbs]) => (
                <div key={name} className="grid gap-1">
                    <div className="text-xs font-medium text-muted-foreground">{name}</div>
                    <Breadcrumb {...args} crumbs={crumbs} />
                </div>
            ))}
        </div>
    ),
    args: {
        crumbs: shortTrail,
        switcherAffordance: <span aria-hidden className="text-muted-foreground/70">▾</span>,
    },
};
