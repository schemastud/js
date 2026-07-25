import type { Meta, StoryObj } from '@storybook/react-vite';
import { within, userEvent } from 'storybook/test';
import { DndCalendar, localizer, Views } from './Calendar';
import { ANCHOR, DEMO_EVENTS } from './story-harness';
import type { FoundationCalendarEvent } from './types';

/**
 * BigCalendar/Calendar (component-seams ticket 22). The vendored-and-owned RBC vendor
 * edge (PRD §1/§7.1): the thin, typed `DndCalendar` re-export over the react-big-calendar
 * peer + the `date-fns` localizer — the ONE place the package meets RBC's internals. It is
 * catalogued directly (props-driven, no `<BigCalendarProvider>` needed) so the raw vendor
 * seam is visible in the catalog beneath the injection-driven `BigCalendar/Surface`.
 *
 * The harness is imported only for its FIXTURE data + its side-effect CSS imports (RBC base
 * layout + the package `theme.css`); the calendar renders skinned inside `.rbc-surface`.
 *
 * TREATMENT axes (treatment-axes.md): the **variant** axis is the natural view fork RBC
 * exposes — catalogued as `Month` / `Agenda`. **states** covers `populated` vs `empty`.
 * Ambient token + light⊗dark inherited from the workbench; the same honest hex note as the
 * Surface applies (chrome re-skins under `.dark`; the inline event-bar palette does not).
 * `size`/`tone`/`density`/`viewport`-specific props are not part of this thin edge, so they
 * are absent-not-a-gap.
 */
const meta = {
    title: 'BigCalendar/Calendar',
    parameters: { layout: 'fullscreen' },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

const GRID_HEIGHT = 560;

/** Minimal props shared by the raw-calendar stories — the same accessors the Surface wires. */
function rawProps(events: FoundationCalendarEvent[]) {
    return {
        localizer,
        events,
        defaultDate: ANCHOR,
        style: { height: GRID_HEIGHT },
        allDayAccessor: () => true,
        startAccessor: (e: FoundationCalendarEvent) => e.start,
        endAccessor: (e: FoundationCalendarEvent) => e.end,
        titleAccessor: (e: FoundationCalendarEvent) => e.title,
        draggableAccessor: (e: FoundationCalendarEvent) => e.resident,
        popup: true,
    };
}

/** variant = MONTH — the raw vendored calendar rendering the fixture corpus in month view. */
export const Month: Story = {
    render: () => (
        <div className="rbc-surface" style={{ padding: '1rem' }}>
            <DndCalendar<FoundationCalendarEvent>
                {...rawProps(DEMO_EVENTS)}
                defaultView={Views.MONTH}
                views={[Views.MONTH, Views.AGENDA]}
            />
        </div>
    ),
    play: async ({ canvasElement }) => {
        await within(canvasElement).findByText('Launch: Summer Drop');
    },
};

/** variant = AGENDA — the same corpus in RBC's list/agenda view, switched via the toolbar. */
export const Agenda: Story = {
    render: () => (
        <div className="rbc-surface" style={{ padding: '1rem' }}>
            <DndCalendar<FoundationCalendarEvent>
                {...rawProps(DEMO_EVENTS)}
                defaultView={Views.MONTH}
                views={[Views.MONTH, Views.AGENDA]}
            />
        </div>
    ),
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await canvas.findByText('Launch: Summer Drop');
        await userEvent.click(await canvas.findByRole('button', { name: /agenda/i }));
        await canvas.findAllByText('Launch: Summer Drop');
    },
};

/** state = empty — the bare month grid with no events handed to the vendor edge. */
export const Empty: Story = {
    render: () => (
        <div className="rbc-surface" style={{ padding: '1rem' }}>
            <DndCalendar<FoundationCalendarEvent>
                {...rawProps([])}
                defaultView={Views.MONTH}
                views={[Views.MONTH, Views.AGENDA]}
            />
        </div>
    ),
    play: async ({ canvasElement }) => {
        await within(canvasElement).findByText(/July 2026/i);
    },
};
