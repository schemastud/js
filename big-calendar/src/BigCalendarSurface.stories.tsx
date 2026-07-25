import type { Meta, StoryObj } from '@storybook/react-vite';
import { within, userEvent, expect } from 'storybook/test';
import { BigCalendarSurface } from './BigCalendarSurface';
import {
    ANCHOR,
    DEMO_LANES,
    MockCalendarProvider,
    demoEditPanel,
} from './story-harness';

/**
 * BigCalendar/Surface (component-seams ticket 22). The SOURCE-BLIND, vocab-blind
 * foundation renderer: it renders whatever `FoundationCalendarEvent[]` the injected
 * `client` returns, wires react-big-calendar's accessor/prop-getter API to that data,
 * and delegates ALL vocabulary + host chrome to the four injection kinds. Rendered here
 * over the workbench's in-memory injection (story-harness) — a mock `CalendarClient`
 * serving a fixed July-2026 corpus, a fresh QueryClient, and the package's own theme.css
 * (imported by the harness alongside RBC's base layout CSS) so the grid renders skinned.
 *
 * TREATMENT axes (treatment-axes.md): the **states** axis dominates — the surface is
 * catalogued across `populated` (resident solid + virtual dashed events, today-marker),
 * `empty` (no events; the bare month grid), and `loading` (the never-resolving read; the
 * surface parks on `data-loading`). The **variant** axis is the natural month/agenda view
 * fork RBC exposes (`views={[MONTH, AGENDA]}`) — catalogued as `MonthView` / `AgendaView`.
 * A **viewport** story exercises the responsive month grid at mobile width. An interaction
 * affordance (empty-cell click → the create/edit panel) is exercised via `play`. Lanes
 * (channels-as-RBC-resources) get their own story. `size`/`tone`/`density` are not exposed
 * on `BigCalendarSurfaceProps`, so — per the rule of sanction — they are absent-not-a-gap.
 *
 * Ambient token + light⊗dark are wired globally by the workbench (ticket 14's preview +
 * colorScheme toolbar). **Honest catalog note (mirrors ticket 15's Frame hex caveat):**
 * the surface CHROME (grid/toolbar/today/borders) reads theme.css `--rbc-*` vars that fall
 * back to SEMANTIC tokens (`--background`/`--foreground`/`--muted`/`--border`/`--accent`),
 * so it re-skins correctly under `.dark`. The EVENT-BAR palette (`--rbc-hue-*`) is
 * self-contained hex in theme.css, so event colours do NOT re-skin under dark — a
 * pre-existing property of the vendored RBC theme, recorded here, not fixed in this ticket.
 */
const meta = {
    title: 'BigCalendar/Surface',
    component: BigCalendarSurface,
    parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof BigCalendarSurface>;

export default meta;
type Story = StoryObj<typeof meta>;

// A fixed grid height so a VR baseline is deterministic (the runtime default is
// viewport-relative `calc(100vh - 140px)`, which VR-shifts with window size).
const GRID_HEIGHT = 560;

/**
 * state = populated (the default catalog view) — the month grid with resident (solid)
 * and virtual (dashed, read-only) events across July 2026, the today-marker on the 15th,
 * skinned via the injected theme.css. `play`-awaits a settled event title so a VR
 * baseline captures the populated grid, never the loading flash.
 */
export const MonthView: Story = {
    render: () => (
        <MockCalendarProvider services={{ renderEditPanel: demoEditPanel }}>
            <BigCalendarSurface defaultDate={ANCHOR} height={GRID_HEIGHT} />
        </MockCalendarProvider>
    ),
    play: async ({ canvasElement }) => {
        await within(canvasElement).findByText('Launch: Summer Drop');
    },
};

/**
 * variant = the AGENDA view — RBC's list rendering of the same corpus (the surface
 * exposes `views={[MONTH, AGENDA]}`). Switched via the toolbar's Agenda button in `play`.
 */
export const AgendaView: Story = {
    render: () => (
        <MockCalendarProvider>
            <BigCalendarSurface defaultDate={ANCHOR} height={GRID_HEIGHT} />
        </MockCalendarProvider>
    ),
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await canvas.findByText('Launch: Summer Drop');
        await userEvent.click(await canvas.findByRole('button', { name: /agenda/i }));
        // The agenda table renders the event rows; await one settled row.
        await canvas.findAllByText('Launch: Summer Drop');
    },
};

/**
 * state = empty — the bare month grid with no events (the injected client serves []).
 * Proves the surface's empty rendering (grid + toolbar, no event bars).
 */
export const Empty: Story = {
    render: () => (
        <MockCalendarProvider fixtures={{ events: [] }}>
            <BigCalendarSurface defaultDate={ANCHOR} height={GRID_HEIGHT} />
        </MockCalendarProvider>
    ),
    play: async ({ canvasElement }) => {
        // The month label settles; no event bars are present.
        await within(canvasElement).findByText(/July 2026/i);
        await expect(within(canvasElement).queryByText('Launch: Summer Drop')).toBeNull();
    },
};

/**
 * state = loading — the injected `listEvents` never resolves, so the query stays pending
 * and the surface carries its `data-loading` attribute over an event-less grid.
 */
export const Loading: Story = {
    render: () => (
        <MockCalendarProvider fixtures={{ loading: true }}>
            <BigCalendarSurface defaultDate={ANCHOR} height={GRID_HEIGHT} />
        </MockCalendarProvider>
    ),
    play: async ({ canvasElement }) => {
        const surface = canvasElement.querySelector('.rbc-surface');
        await expect(surface).toHaveAttribute('data-loading');
    },
};

/**
 * lanes — the channels-as-RBC-resources axis (`lanes.length > 1` groups events into
 * resource columns) with the injected `renderLaneHeader` chrome slot painting each lane
 * label. Exercises the multi-lane branch of the surface.
 */
export const Lanes: Story = {
    render: () => (
        <MockCalendarProvider
            services={{
                renderLaneHeader: (lane) => <strong>{lane.label}</strong>,
            }}
        >
            <BigCalendarSurface lanes={DEMO_LANES} defaultDate={ANCHOR} height={GRID_HEIGHT} />
        </MockCalendarProvider>
    ),
    play: async ({ canvasElement }) => {
        await within(canvasElement).findByText('Main Channel');
    },
};

/**
 * interaction (selection) — clicking an empty day cell opens the edit panel in `create`
 * mode through the injected `renderEditPanel` slot. Proves the surface's selectable-slot
 * affordance end to end.
 */
export const CreateOnEmptyCell: Story = {
    render: () => (
        <MockCalendarProvider
            fixtures={{ events: [] }}
            services={{ renderEditPanel: demoEditPanel }}
        >
            <BigCalendarSurface defaultDate={ANCHOR} height={GRID_HEIGHT} />
        </MockCalendarProvider>
    ),
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await canvas.findByText(/July 2026/i);
        // Click a day-background cell to select a slot → the create panel opens.
        const cell = canvasElement.querySelector('.rbc-day-bg');
        if (cell) await userEvent.click(cell as HTMLElement);
        await within(canvasElement).findByRole('dialog', { name: /event detail/i });
    },
};

/**
 * viewport = mobile — the responsive month grid at a narrow width (the calendar is a
 * viewport-sensitive structure surface; the grid + toolbar reflow at mobile1).
 */
export const Mobile: Story = {
    parameters: { viewport: { defaultViewport: 'mobile1' } },
    render: () => (
        <MockCalendarProvider>
            <BigCalendarSurface defaultDate={ANCHOR} height={GRID_HEIGHT} />
        </MockCalendarProvider>
    ),
    play: async ({ canvasElement }) => {
        await within(canvasElement).findByText('Launch: Summer Drop');
    },
};
