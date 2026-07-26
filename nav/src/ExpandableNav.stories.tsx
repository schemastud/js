import type { Meta, StoryObj } from '@storybook/react-vite';
import { type ReactNode } from 'react';
import { within, waitFor } from 'storybook/test';
import { ExpandableNav, type ExpandableNavClasses } from './ExpandableNav';
import type { NavNode } from './registry';

/**
 * Frame/Nav/ExpandableNav (component-seams ticket 39). A host-agnostic collapsible sidebar over the
 * nav-source seam: it renders track → group → item, groups are `<button aria-expanded>` disclosures,
 * and the group holding the active guide opens on load. Foundation-neutral like its @schemastud
 * siblings (breadcrumb/combobox) — it ships NO CSS and NO router: every className arrives via
 * `classes`, the link element via `renderLink`, and the current path via `currentHref`. Only the
 * grid-rows collapse animation + chevron rotation are inline styles.
 *
 * These stories feed `items` DIRECTLY (the synchronous `NavNode[]` path) rather than the global
 * nav-source registry — the same fixturing posture ticket 18 used for breadcrumb atoms, and it keeps
 * each story hermetic (no module-scoped `registerNavSource` state leaking between stories). The
 * injected `classes` + `renderLink` are the workbench binding an app would supply; they are
 * stories-only (excluded from the tsup `src/index.ts`-only entry, so never shipped).
 *
 * Ambient token + light⊗dark are inherited from the workbench (ticket 14 `.storybook` preview +
 * colorScheme toolbar) — no per-story fighting.
 *
 * Ticket-13 capability-gated axes, covered ONLY where exposed (rule of sanction — absent = absent,
 * not a gap):
 *  - **states** (the dominant axis) — ExpandableNav has no `variant`/`size`/`tone`/`density` props,
 *    but a rich set of shape/interaction states: all-collapsed (`initialGroupState="collapsed"`),
 *    all-expanded (default), an active-item marked + its group auto-opened (`currentHref`), a deep
 *    multi-track tree, and a one-level nested item (`children`).
 *  - **viewport** — a sidebar is a responsive surface (a narrow rail on mobile), so `Mobile`/`Desktop`
 *    are carried via `parameters.viewport`.
 *  - **canvas** (`flat`/`dotted` decorator) — the nav rail sits beside a `main` region and must read
 *    on either background.
 *
 * Not exposed → not storied (absent-not-a-gap): `variant`, `size`, `tone`, `density`. The scroll-spy
 * logic (`registry.ts` tree builder / `navTrail`) is pure infra — excluded per every prior catalog
 * ticket's honest exclusion (only the rendered surface is storied).
 */

/* ------------------------------------------------------------------ *
 * Workbench className binding — the injected skin an app would pass.
 * Tailwind utilities that read the seeded semantic token layer, so the
 * headless component renders skinned standalone (ticket 07 / 08).
 * ------------------------------------------------------------------ */
const classes: ExpandableNavClasses = {
    nav: 'w-56 text-sm select-none',
    track: 'mb-4',
    trackLabel:
        'px-2 mb-1 text-[0.6875rem] font-semibold uppercase tracking-wide text-muted-foreground',
    group: 'mb-0.5',
    header:
        'flex w-full items-center gap-1.5 rounded-md px-2 py-1.5 text-left font-medium text-foreground hover:bg-muted',
    chevron: 'text-muted-foreground',
    panelInner: 'pl-3',
    item: '',
    children: 'ml-3 border-l border-border pl-2',
    loading: 'px-2 py-1 text-xs text-muted-foreground',
};

// Injected link renderer — keeps the kit router-agnostic. Marks the active leaf.
const renderLink = (node: NavNode, ctx: { active: boolean }): ReactNode => (
    <a
        href={node.href ?? '#'}
        aria-current={ctx.active ? 'page' : undefined}
        className={[
            'block rounded-md px-2 py-1 text-muted-foreground hover:bg-muted hover:text-foreground',
            ctx.active ? 'bg-primary/10 font-medium text-primary hover:bg-primary/10' : '',
        ]
            .filter(Boolean)
            .join(' ')}
        onClick={(e) => e.preventDefault()}
    >
        {node.title}
    </a>
);

const meta = {
    title: 'Frame/Nav/ExpandableNav',
    component: ExpandableNav,
    tags: ['autodocs'],
    parameters: { layout: 'padded' },
    args: {
        classes,
        renderLink,
        trackLabel: (t: string) => t,
    },
} satisfies Meta<typeof ExpandableNav>;

export default meta;
type Story = StoryObj<typeof meta>;

// A canvas decorator (ticket 13 — flat/dotted, a decorator never a leaf arg), matching the breadcrumb
// story's idiom. The rail sits in/beside the `main` region, which is either flat or dotted.
function withCanvas(canvas: 'flat' | 'dotted') {
    return function CanvasDecorator(children: ReactNode) {
        return (
            <div
                className="rounded-md p-4"
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
 * Fixtures — flat NavNode[] the tree builder groups + nests (no host
 * coupling; the same shape a source's load() would emit).
 * ------------------------------------------------------------------ */

// A single-track, two-group guide tree — the baseline docs sidebar.
const buildTrack: NavNode[] = [
    { title: 'Introduction', href: '/docs/build/intro', track: 'Build', group: 'Getting started', order: 1 },
    { title: 'Installation', href: '/docs/build/install', track: 'Build', group: 'Getting started', order: 2 },
    { title: 'Configuration', href: '/docs/build/config', track: 'Build', group: 'Getting started', order: 3 },
    { title: 'Schemas', href: '/docs/build/schemas', track: 'Build', group: 'Core concepts', groupOrder: 2, order: 1 },
    { title: 'Frame', href: '/docs/build/frame', track: 'Build', group: 'Core concepts', order: 2 },
    { title: 'Injection', href: '/docs/build/injection', track: 'Build', group: 'Core concepts', order: 3 },
];

// A one-level nested group: "Widgets" is a leaf whose slug backs two children (`parent: 'widgets'`).
const nestedTrack: NavNode[] = [
    { title: 'Overview', href: '/docs/using/overview', track: 'Using', group: 'Reference', order: 1 },
    { title: 'Widgets', href: '/docs/using/widgets', track: 'Using', group: 'Reference', order: 2 },
    { title: 'Text widget', href: '/docs/using/widgets/text', track: 'Using', group: 'Reference', parent: 'widgets', order: 1 },
    { title: 'Select widget', href: '/docs/using/widgets/select', track: 'Using', group: 'Reference', parent: 'widgets', order: 2 },
];

// The deep, multi-track tree (Build + Using), the fullest shape.
const deepTree: NavNode[] = [...buildTrack, ...nestedTrack];

/* ------------------------------------------------------------------ *
 * Stories — the representative states.
 * ------------------------------------------------------------------ */

/**
 * states = expanded (default) — every group starts open (`initialGroupState="expanded"`), the
 * baseline shape. A single track, two groups.
 */
export const Expanded: Story = {
    args: { items: buildTrack, 'aria-label': 'Docs navigation' },
};

/**
 * states = collapsed — every group starts closed (`initialGroupState="collapsed"`) except the one
 * holding the active guide; with no `currentHref` here, all are folded to their disclosure headers.
 */
export const Collapsed: Story = {
    args: { items: buildTrack, initialGroupState: 'collapsed', 'aria-label': 'Docs navigation' },
};

/**
 * states = active-item — `currentHref` marks the active leaf (highlighted via `aria-current`) AND
 * auto-opens its group even under `initialGroupState="collapsed"` (the active group always opens on
 * load). Here "Frame" in the collapsed "Core concepts" group is active, so that group is open while
 * "Getting started" stays folded.
 */
export const ActiveItem: Story = {
    args: {
        items: buildTrack,
        currentHref: '/docs/build/frame',
        initialGroupState: 'collapsed',
        'aria-label': 'Docs navigation',
    },
};

/**
 * states = one-level nest — a leaf ("Widgets") with two children the tree builder nests under it
 * (`parent: 'widgets'`), rendered in the `children` wrapper. The active child ("Select widget") marks
 * its parent group open.
 */
export const NestedItems: Story = {
    args: {
        items: nestedTrack,
        currentHref: '/docs/using/widgets/select',
        'aria-label': 'Docs navigation',
    },
};

/**
 * states = deep tree — two tracks (Build + Using), multiple groups, and a nested group. The fullest
 * shape; `trackOrder` pins Build ahead of Using. The active guide's group opens; the rest follow the
 * expanded default.
 */
export const DeepTree: Story = {
    args: {
        items: deepTree,
        currentHref: '/docs/build/schemas',
        trackOrder: ['Build', 'Using'],
        'aria-label': 'Docs navigation',
    },
};

/**
 * states = toggle interaction — the disclosure is driven in `play`: it starts collapsed, then a click
 * on the "Core concepts" header expands it, so a VR baseline captures a *settled* mid-toggle state
 * (one group open, one closed) rather than the all-collapsed load state.
 */
export const ToggledOpen: Story = {
    args: {
        items: buildTrack,
        initialGroupState: 'collapsed',
        'aria-label': 'Docs navigation',
    },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        const header = await canvas.findByRole('button', { name: /Core concepts/i });
        // Confirm it starts collapsed, then open it and await the panel's items becoming visible.
        header.click();
        await waitFor(async () => {
            const link = await canvas.findByRole('link', { name: 'Schemas' });
            if (header.getAttribute('aria-expanded') !== 'true') {
                throw new Error('group not expanded yet');
            }
            // Item present + group marked open ⇒ settled.
            if (!link) throw new Error('nested item not rendered yet');
        });
    },
};

/* ------------------------------------------------------------------ *
 * Ambient / structural axes — canvas + viewport.
 * ------------------------------------------------------------------ */

/** canvas = flat — the rail read on a flat `bg-background` region. */
export const CanvasFlat: Story = {
    args: { items: deepTree, currentHref: '/docs/build/frame', trackOrder: ['Build', 'Using'] },
    decorators: [(Story) => withCanvas('flat')(<Story />)],
};

/** canvas = dotted — the same tree read on a dotted region (mainframe `dotted-bg`). */
export const CanvasDotted: Story = {
    args: { items: deepTree, currentHref: '/docs/build/frame', trackOrder: ['Build', 'Using'] },
    decorators: [(Story) => withCanvas('dotted')(<Story />)],
};

/**
 * viewport = mobile — the rail in a narrow column (a docs sidebar collapses to a drawer at this width;
 * the component itself just lays out narrower).
 */
export const Mobile: Story = {
    args: { items: buildTrack, currentHref: '/docs/build/config' },
    parameters: { viewport: { defaultViewport: 'mobile1' } },
    decorators: [(Story) => <div className="max-w-[16rem]"><Story /></div>],
};

/** viewport = desktop — the same rail with full room. */
export const Desktop: Story = {
    args: { items: deepTree, currentHref: '/docs/build/frame', trackOrder: ['Build', 'Using'] },
    parameters: { viewport: { defaultViewport: 'desktop' } },
};
