/* eslint-disable */
// =============================================================================
// story-harness — the shared Storybook fixtures for the @schemastud/big-calendar
// catalog (component-seams map, ticket 22). NOT part of the shipped package: tsup
// builds only the `index.ts` graph (external peers aside), so this file — imported
// solely by *.stories.tsx — never enters `dist`. It exists so every big-calendar
// story renders the REAL surface against a realistic-but-in-memory injection instead
// of re-mocking the four-kind CalendarServices contract per story.
//
// big-calendar has ONE required injection seam (unlike frame's two families): the
// `CalendarServices<E>` bundle carried by `<BigCalendarProvider>` — one REQUIRED
// `client` transport plus optional feedback / four `renderX` chrome slots / a
// real-time `subscribe`, each with a dependency-free default. Every rendered surface
// (BigCalendarSurface, and the Calendar re-export it wraps) reads it, so one
// <MockCalendarProvider> + a fresh QueryClient serves the whole catalog.
//
// THEME: the package ships its own `theme.css` (a retokenized RBC skin over host
// token-vars) which itself layers on RBC's base layout CSS. A story must import BOTH
// — RBC's `react-big-calendar.css` (grid geometry) + the dnd addon's `styles.css`,
// then the package's `theme.css` — or the calendar renders as an unstyled table. They
// are imported ONCE here (side-effect) so every story that imports the harness inherits
// the skinned surface. theme.css's `--rbc-*` chrome vars fall back to the workbench's
// SEMANTIC tokens (`--background`/`--foreground`/`--muted`/`--border`/`--accent`), which
// the ticket-14 `.dark` seed overrides — so the calendar chrome re-skins under dark for
// free. The `--rbc-hue-*` event palette is self-contained hex (the honest note, mirroring
// ticket 15's Frame hex caveat): event bar colours do NOT re-skin under `.dark` — a
// pre-existing property of the vendored theme, recorded, not fixed here.
// =============================================================================
import 'react-big-calendar/lib/css/react-big-calendar.css';
import 'react-big-calendar/lib/addons/dragAndDrop/styles.css';
import './theme.css';

import { useMemo, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BigCalendarProvider } from './provider';
import type {
    CalendarClient,
    CalendarServices,
    EditPanelContext,
    FoundationCalendarEvent,
    LaneAxis,
    OverrideAction,
} from './types';

// ── A stable "today" anchor ─────────────────────────────────────────────────────
// Stories anchor on a FIXED month (not `new Date()`) so a VR baseline never drifts as
// the wall clock moves. The demo events sit inside this month; `TODAY` marks a day the
// surface paints with `.rbc-today`.
export const ANCHOR = new Date(2026, 6, 15); // 2026-07-15 (month view opens on July 2026)
export const TODAY = ANCHOR;

/** all-day span helper — big-calendar is all-day-only (PRD §6). */
function day(y: number, m: number, d: number): { start: Date; end: Date } {
    const start = new Date(y, m, d);
    const end = new Date(y, m, d);
    return { start, end };
}

// ── The demo lanes (the opaque channel axis) ─────────────────────────────────────
export const DEMO_LANES: LaneAxis[] = [
    { id: 'lane-a', label: 'Main Channel' },
    { id: 'lane-b', label: 'Newsletter' },
];

// ── The demo event corpus ────────────────────────────────────────────────────────
// A representative July-2026 spread: resident (solid) + non-resident/virtual (dashed,
// read-only) events, across both lanes, spanning several hue tokens so the palette shows.
export const DEMO_EVENTS: FoundationCalendarEvent[] = [
    {
        id: 'e1',
        title: 'Launch: Summer Drop',
        ...day(2026, 6, 3),
        allDay: true,
        sourceId: 'comp-1',
        laneId: 'lane-a',
        colorToken: 'emerald',
        resident: true,
        ref: 'series-1:r1',
        meta: {},
    },
    {
        id: 'e2',
        title: 'Preview: Behind the Scenes',
        ...day(2026, 6, 9),
        allDay: true,
        sourceId: 'comp-1',
        laneId: 'lane-a',
        colorToken: 'sky',
        resident: true,
        ref: 'series-1:r2',
        meta: {},
    },
    {
        id: 'e3',
        title: 'Recurring: Weekly Digest',
        ...day(2026, 6, 15),
        allDay: true,
        sourceId: 'comp-2',
        laneId: 'lane-b',
        colorToken: 'violet',
        resident: false, // virtual / read-only occurrence (dashed ghost)
        ref: 'series-2:r7',
        meta: {},
    },
    {
        id: 'e4',
        title: 'Feature: Creator Spotlight',
        ...day(2026, 6, 21),
        allDay: true,
        sourceId: 'comp-1',
        laneId: 'lane-a',
        colorToken: 'amber',
        resident: true,
        ref: 'series-1:r3',
        meta: {},
    },
    {
        id: 'e5',
        title: 'Newsletter: Mid-month',
        ...day(2026, 6, 15),
        allDay: true,
        sourceId: 'comp-2',
        laneId: 'lane-b',
        colorToken: 'rose',
        resident: true,
        ref: 'series-3:r1',
        meta: {},
    },
    {
        id: 'e6',
        title: 'Draft: Autumn Teaser',
        ...day(2026, 6, 28),
        allDay: true,
        sourceId: 'comp-1',
        laneId: 'lane-a',
        colorToken: 'indigo',
        resident: false,
        ref: 'series-4:r2',
        meta: {},
    },
];

const NEVER = new Promise<never>(() => {});

// ── Transport fixtures ────────────────────────────────────────────────────────────
export interface TransportFixtures {
    /** The event corpus the mock transport serves (default: DEMO_EVENTS). */
    events?: FoundationCalendarEvent[];
    /** A never-resolving `listEvents` so the surface parks on its loading path (`data-loading`). */
    loading?: boolean;
}

/** An in-memory `CalendarClient` — resolves the fixture corpus; writes are no-ops that resolve. */
export function createMockClient(
    fixtures: TransportFixtures = {},
): CalendarClient<FoundationCalendarEvent> {
    const events = fixtures.events ?? DEMO_EVENTS;
    return {
        listEvents: () => {
            if (fixtures.loading) return NEVER;
            return Promise.resolve(events);
        },
        reAnchor: () => Promise.resolve(),
        createEvent: (input) =>
            Promise.resolve({
                ...DEMO_EVENTS[0],
                id: `new-${Date.now()}`,
                start: input.date,
                end: input.date,
            }),
        editCell: () => Promise.resolve(),
        materialize: (ref) => Promise.resolve({ ...DEMO_EVENTS[0], id: ref, resident: true }),
        override: (ref: string, _action: OverrideAction) =>
            Promise.resolve({ ...DEMO_EVENTS[0], id: ref }),
    };
}

// A fresh QueryClient per story tree — no retry/refetch so fixture data is deterministic.
function makeQueryClient(): QueryClient {
    return new QueryClient({
        defaultOptions: {
            queries: { retry: false, refetchOnWindowFocus: false, gcTime: Infinity },
        },
    });
}

export interface MockCalendarProviderProps {
    children: ReactNode;
    fixtures?: TransportFixtures;
    /** Override any of the optional chrome slots (renderEditPanel / renderEventBadge / renderFilters / renderLaneHeader). */
    services?: Partial<Omit<CalendarServices<FoundationCalendarEvent>, 'client'>>;
}

/**
 * The CalendarServices injection (client + optional chrome slots) + a QueryClient, wired
 * once. Every big-calendar story wraps in this instead of re-mocking the four-kind
 * contract. A fresh client/QueryClient per mount keeps stories isolated (Storybook
 * remounts on args change). `notify`/`onError`/`subscribe` fall through to the package's
 * dependency-free defaults unless a story overrides them.
 */
export function MockCalendarProvider({ children, fixtures, services }: MockCalendarProviderProps) {
    const queryClient = useMemo(makeQueryClient, []);
    const value = useMemo<CalendarServices<FoundationCalendarEvent>>(
        () => ({ client: createMockClient(fixtures), ...services }),
        // fixtures/services are per-story literals; identity-stable across a story's life.
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [],
    );

    return (
        <QueryClientProvider client={queryClient}>
            <BigCalendarProvider services={value}>{children}</BigCalendarProvider>
        </QueryClientProvider>
    );
}

/** A demo edit-panel chrome slot — proves the `renderEditPanel` injection point renders. */
export function demoEditPanel(ctx: EditPanelContext<FoundationCalendarEvent>): ReactNode {
    return (
        <div className="rbc-default-panel" role="dialog" aria-label="Event detail">
            <button type="button" className="rbc-default-panel-close" onClick={ctx.close}>
                Close
            </button>
            <div className="rbc-default-panel-title">{ctx.event?.title ?? 'New release'}</div>
            <div className="rbc-default-panel-mode">{ctx.mode}</div>
        </div>
    );
}
