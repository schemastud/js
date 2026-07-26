import type { Meta, StoryObj } from '@storybook/react-vite';
import { type ReactNode } from 'react';
import { within, waitFor } from 'storybook/test';
import { OnThisPage, type OnThisPageClasses, type OnThisPageProps } from './OnThisPage';

/**
 * Frame/Nav/OnThisPage (component-seams ticket 39). The automatic in-page table of contents with
 * scroll-spy. It reads id-bearing headings straight off the rendered DOM (`scanHeadings`), renders
 * `#id` anchor links, and drives an `IntersectionObserver` so the heading nearest the top of the
 * reading zone is "active". Foundation-neutral like its @schemastud siblings — no router (plain
 * `#id` anchors), no bundled CSS: the host injects `classes`, the heading `selector`, and a
 * `routeKey` that re-scans on navigation.
 *
 * Because the component scans the LIVE DOM, each story renders a real `<article>` of id-bearing
 * headings and scopes the TOC to it via `container` (a per-story selector). The injected `classes`
 * are the workbench binding an app would supply (Tailwind reading the seeded token layer). Both the
 * fixture prose and the `classes` are stories-only — excluded from the tsup `src/index.ts`-only
 * entry, so never shipped.
 *
 * Ambient token + light⊗dark are inherited from the workbench (ticket 14 `.storybook` preview +
 * colorScheme toolbar) — no per-story fighting.
 *
 * Ticket-13 capability-gated axes, covered ONLY where exposed (rule of sanction — absent = absent,
 * not a gap):
 *  - **states** (the dominant axis) — OnThisPage has no `variant`/`size`/`tone`/`density` props, but
 *    the shape/interaction states that matter: a short TOC, a long TOC (h2 + nested h3), an
 *    active-section (scroll-spy `aria-current`, `play`-settled so VR captures the settled highlight
 *    not a flash), and the empty state (below `minHeadings` → renders `null`, the sanctioned no-TOC
 *    shape).
 *  - **viewport** — the TOC is a responsive rail (a sticky aside on desktop, folded away on mobile),
 *    so `Mobile`/`Desktop` are carried.
 *  - **canvas** (`flat`/`dotted` decorator) — the aside sits beside a `main` region and must read on
 *    either background.
 *
 * Not exposed → not storied (absent-not-a-gap): `variant`, `size`, `tone`, `density`. The pure scan
 * (`headings.ts` / `scanHeadings`) is infra — excluded per every prior catalog ticket's honest
 * exclusion (only the rendered surface is storied).
 */

/* ------------------------------------------------------------------ *
 * Workbench className binding — the injected skin an app would pass.
 * ------------------------------------------------------------------ */
const classes: OnThisPageClasses = {
    root: 'w-52 text-sm',
    title: 'mb-2 text-[0.6875rem] font-semibold uppercase tracking-wide text-muted-foreground',
    list: 'space-y-1 border-l border-border',
    item: '',
    link: 'block border-l-2 border-transparent -ml-px pl-3 py-0.5 text-muted-foreground hover:text-foreground',
    linkActive: 'border-primary font-medium text-primary',
    linkLevel3: 'pl-6 text-[0.8125rem]',
};

// A canvas decorator (ticket 13 — flat/dotted), matching the sibling stories' idiom.
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
 * Fixtures — real id-bearing prose the component scans off the DOM.
 * Each story scopes its TOC to a distinct container so a story's scan
 * only ever sees its own headings.
 * ------------------------------------------------------------------ */

type Section = { id: string; text: string; level: 2 | 3; body?: string };

const shortSections: Section[] = [
    { id: 'overview', text: 'Overview', level: 2 },
    { id: 'installation', text: 'Installation', level: 2 },
    { id: 'usage', text: 'Usage', level: 2 },
];

const longSections: Section[] = [
    { id: 'introduction', text: 'Introduction', level: 2 },
    { id: 'getting-started', text: 'Getting started', level: 2 },
    { id: 'prerequisites', text: 'Prerequisites', level: 3 },
    { id: 'install', text: 'Install', level: 3 },
    { id: 'core-concepts', text: 'Core concepts', level: 2 },
    { id: 'schemas', text: 'Schemas', level: 3 },
    { id: 'frame', text: 'Frame', level: 3 },
    { id: 'injection', text: 'Injection', level: 3 },
    { id: 'deploying', text: 'Deploying', level: 2 },
    { id: 'troubleshooting', text: 'Troubleshooting', level: 2 },
];

// A little filler so long pages actually scroll (so scroll-spy has room to move).
const filler =
    'The host owns the prose; @schemastud/nav only reads the headings off it. This paragraph exists to give the section vertical room so the scroll-spy observer has something to track.';

/**
 * Render the scanned prose + the TOC side by side. The prose carries the id-bearing headings the
 * component reads; the container class scopes the scan so each story sees only its own headings.
 */
function TocPage({
    sections,
    container,
    ...props
}: { sections: Section[]; container: string } & Omit<OnThisPageProps, 'container'>) {
    // container is a leading-dot class selector, e.g. '.otp-short' → wrapper className 'otp-short'.
    const wrapperClass = container.replace(/^\./, '');
    return (
        <div className="flex gap-8">
            <article className={`${wrapperClass} max-w-lg space-y-3`}>
                {sections.map((s) =>
                    s.level === 2 ? (
                        <div key={s.id} className="space-y-2">
                            <h2 id={s.id} className="text-lg font-semibold text-foreground">
                                {s.text}
                            </h2>
                            <p className="text-sm text-muted-foreground">{filler}</p>
                        </div>
                    ) : (
                        <div key={s.id} className="space-y-2 pl-4">
                            <h3 id={s.id} className="font-medium text-foreground">
                                {s.text}
                            </h3>
                            <p className="text-sm text-muted-foreground">{filler}</p>
                        </div>
                    ),
                )}
            </article>
            <aside className="shrink-0">
                <OnThisPage classes={classes} container={container} {...props} />
            </aside>
        </div>
    );
}

const meta = {
    title: 'Frame/Nav/OnThisPage',
    component: OnThisPage,
    tags: ['autodocs'],
    parameters: { layout: 'padded' },
} satisfies Meta<typeof OnThisPage>;

export default meta;
type Story = StoryObj<typeof meta>;

/* ------------------------------------------------------------------ *
 * Stories — the representative states.
 * ------------------------------------------------------------------ */

/** states = short — three flat h2 sections, the baseline TOC. */
export const Short: Story = {
    render: () => (
        <TocPage sections={shortSections} container=".otp-short" aria-label="On this page" />
    ),
};

/** states = long — mixed h2 + nested h3 sections; the h3 links indent via `linkLevel3`. */
export const Long: Story = {
    render: () => (
        <TocPage sections={longSections} container=".otp-long" aria-label="On this page" />
    ),
};

/**
 * states = active-section — the scroll-spy marks a section active (`aria-current`, `linkActive`
 * skin). Clicking a TOC link sets the active id synchronously; the `play` clicks a mid-page link and
 * awaits the settled `aria-current`, so a VR baseline captures the highlighted state, not the
 * pre-observer flash.
 */
export const ActiveSection: Story = {
    render: () => (
        <TocPage sections={longSections} container=".otp-active" aria-label="On this page" />
    ),
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        // The TOC link for a mid-page section — clicking sets it active synchronously.
        const link = await canvas.findByRole('link', { name: 'Core concepts' });
        link.click();
        await waitFor(() => {
            if (link.getAttribute('aria-current') !== 'true') {
                throw new Error('active section not settled yet');
            }
        });
    },
};

/**
 * states = empty — below `minHeadings` (a lone heading isn't a TOC), so the component renders
 * `null`. The sanctioned no-TOC shape: the story shows the placeholder the host sees in its place
 * (the aside is simply absent). `minHeadings` here is left at its default (2) with a single heading.
 */
export const Empty: Story = {
    render: () => (
        <div className="flex gap-8">
            <article className="otp-empty max-w-lg space-y-2">
                <h2 id="only-heading" className="text-lg font-semibold text-foreground">
                    A lone heading
                </h2>
                <p className="text-sm text-muted-foreground">{filler}</p>
            </article>
            <aside className="shrink-0">
                {/* Renders null (1 heading < minHeadings=2). The dashed box marks where a TOC would sit. */}
                <OnThisPage classes={classes} container=".otp-empty" aria-label="On this page" />
                <div className="w-52 rounded-md border border-dashed border-border p-3 text-xs text-muted-foreground">
                    No table of contents — fewer than {2} headings.
                </div>
            </aside>
        </div>
    ),
};

/* ------------------------------------------------------------------ *
 * Ambient / structural axes — canvas + viewport.
 * ------------------------------------------------------------------ */

/** canvas = flat — the TOC read on a flat `bg-background` region. */
export const CanvasFlat: Story = {
    render: () =>
        withCanvas('flat')(
            <TocPage sections={longSections} container=".otp-cflat" aria-label="On this page" />,
        ),
};

/** canvas = dotted — the same TOC read on a dotted region (mainframe `dotted-bg`). */
export const CanvasDotted: Story = {
    render: () =>
        withCanvas('dotted')(
            <TocPage sections={longSections} container=".otp-cdotted" aria-label="On this page" />,
        ),
};

/**
 * viewport = mobile — on a narrow column the TOC folds below the prose (a host typically hides it);
 * here it stacks so the shape is visible at width.
 */
export const Mobile: Story = {
    render: () => (
        <div className="flex flex-col gap-4">
            <OnThisPage classes={classes} container=".otp-mobile" aria-label="On this page" />
            <article className="otp-mobile max-w-full space-y-2">
                {shortSections.map((s) => (
                    <div key={s.id} className="space-y-1">
                        <h2 id={s.id} className="text-base font-semibold text-foreground">
                            {s.text}
                        </h2>
                        <p className="text-sm text-muted-foreground">{filler}</p>
                    </div>
                ))}
            </article>
        </div>
    ),
    parameters: { viewport: { defaultViewport: 'mobile1' } },
};

/** viewport = desktop — the sticky-aside layout with full room. */
export const Desktop: Story = {
    render: () => (
        <TocPage sections={longSections} container=".otp-desktop" aria-label="On this page" />
    ),
    parameters: { viewport: { defaultViewport: 'desktop' } },
};
