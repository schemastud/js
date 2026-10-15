import * as react from 'react';
import { ReactNode } from 'react';
import * as _tanstack_react_query from '@tanstack/react-query';
import * as react_big_calendar from 'react-big-calendar';
import { CalendarProps } from 'react-big-calendar';
export { Calendar, Views } from 'react-big-calendar';

/**
 * The foundation-authored calendar event (big-calendar-surface PRD §8). GENERIC and
 * source-blind: the foundation renders whatever it is handed and CANNOT depend on
 * `@splicewire/_resources`, so the satellite's `client` adapter maps the projection DTO
 * INTO this shape. Everything the renderer needs is here and already resolved:
 *
 *  - `sourceId` is TOP-LEVEL, opaque-but-routable (the client echoes it back on writes so
 *    they reach the right owner) — NOT in the `meta` bag, but still semantically opaque here.
 *    ⚠️ It was `compositionId` until the consumer's adapter had to fill it with an owning
 *    CALENDAR id and park the real composition in `meta`, under a docblock explaining the
 *    discrepancy. A field whose name needs an apology is the wrong name.
 *  - `laneId` is the opaque lane axis (= a channel), never interpreted.
 *  - `colorToken` is ALREADY resolved by the mount's hue axis (kind | provenance); the
 *    foundation just paints it.
 *  - `resident: false` ⇒ a virtual, read-only occurrence (dashed/ghost, no drag).
 *  - `ref` is the opaque `(series_ref, recurrence_id)` address; empty for a non-series event.
 *  - `meta` is the satellite's `renderX` bag (status, kind, series…) — the foundation
 *    NEVER reads it; it only hands it back to the injected render slots.
 */
interface FoundationCalendarEvent {
    id: string;
    title: string;
    start: Date;
    end: Date;
    allDay: true;
    sourceId: string;
    laneId: string;
    colorToken: string;
    resident: boolean;
    ref: string;
    meta: Record<string, unknown>;
}
/** An override of a non-resident occurrence (PRD §5/§7.2): pin to a date, skip, or replace its template. */
type OverrideAction = {
    kind: 'pin';
    newDate: Date;
} | {
    kind: 'skip';
} | {
    kind: 'replaceTemplate';
};
/**
 * The injected transport adapter — the ONE required data seam (PRD §7.2). The host wraps
 * whatever transport it has and points it at the correct tenant and owner; the surface is
 * tenant-blind and owner-blind. Generic over the event DTO with a default bound
 * to {@see FoundationCalendarEvent}.
 */
interface CalendarClient<E = FoundationCalendarEvent> {
    /** All events for a range. `range` is v1-IGNORED (the +3mo server default renders), kept so a view-driven horizon never breaks the interface. */
    listEvents(range?: {
        start: Date;
        end: Date;
    }): Promise<E[]>;
    /** Re-anchor a resident event to a new date (resident drag + the edit panel's date field — one write, two entry points). */
    reAnchor(ref: string, newDate: Date): Promise<void>;
    /** Create a one-off event on a date (empty-cell click; the edit panel's create mode). */
    createEvent(input: {
        date: Date;
    } & Record<string, unknown>): Promise<E>;
    /** Edit a stored cell's fields. */
    editCell(ref: string, patch: Record<string, unknown>): Promise<void>;
    /** "Fire here" / dereference-in-place — materialize a non-resident occurrence into a stored event. */
    materialize(ref: string): Promise<E>;
    /** Override a non-resident occurrence: pin | skip | replaceTemplate. */
    override(ref: string, action: OverrideAction): Promise<E>;
}
/** Feedback payload; `action` carries a host-side undo callback (the foundation never models undo). */
interface NotifyMessage {
    level: 'success' | 'error' | 'info';
    text: string;
    action?: {
        label: string;
        run: () => void;
    };
}
/**
 * The real-time subscription seam (the 4th injection kind, INCLUDED in v1). Returns an
 * unsubscribe fn called on unmount. The host wires it to Echo/websocket/poll; the
 * foundation receives an already-wired service and stays source-blind.
 */
type Subscribe = (onChange: (changed?: {
    sourceId?: string;
    ref?: string;
}) => void) => () => void;
/** One entry on the opaque lane axis (PRD §3.1) — the satellite injects channels here. */
interface LaneAxis {
    id: string;
    label: string;
}
/**
 * The edit panel opens in ONE of three modes over ONE render slot (PRD §5.2): editing a
 * resident event, referencing a non-resident occurrence (materialize/override), or
 * creating a new event on a clicked date. `resident-vs-reference` is a mode flag, not a
 * fork — the host fills `renderEditPanel` and switches on `mode`.
 */
type EditPanelMode = 'resident-edit' | 'reference' | 'create';
interface EditPanelContext<E = FoundationCalendarEvent> {
    mode: EditPanelMode;
    /** The event being edited/referenced; null in `create` mode. */
    event: E | null;
    /** The date to prefill in `create` mode (or the drop target in `reference` mode); null otherwise. */
    date: Date | null;
    /** Close the panel. */
    close: () => void;
}
/**
 * Everything host-specific, injected through one Provider (PRD §7.2). Only `client` is
 * required; feedback, the four `renderX` host-chrome slots, and the real-time `subscribe`
 * seam are all optional with dependency-free defaults.
 */
interface CalendarServices<E = FoundationCalendarEvent> {
    /** REQUIRED transport (PRD §7.2). */
    client: CalendarClient<E>;
    /** Feedback sink; a dependency-free console default applies when omitted (no bundled toaster). */
    notify?: (msg: NotifyMessage) => void;
    /** Mutation-error hook; the host may toast/log/observe. The rejection still propagates. */
    onError?: (err: unknown) => void;
    /** The load-bearing edit seam: the host's Sheet + form, in two modes (default: a minimal read-only popover). */
    renderEditPanel?: (ctx: EditPanelContext<E>) => ReactNode;
    /** Per-event chrome — series/Kind badges, status dot/border (default: a plain title bar). */
    renderEventBadge?: (event: E) => ReactNode;
    /** Aggregate-only facets — provenance + status (default: none). */
    renderFilters?: () => ReactNode;
    /** Per-lane header — channel label/colour (default: the raw `laneId`). */
    renderLaneHeader?: (lane: LaneAxis) => ReactNode;
    /** Real-time subscription (default: a no-op). */
    subscribe?: Subscribe;
}

declare function BigCalendarProvider<E>({ services, children, }: {
    services: CalendarServices<E>;
    children: ReactNode;
}): react.JSX.Element;
declare function useCalendarServices<E>(): CalendarServices<E>;
/** The injected `notify`, or the console default when the host supplied none. */
declare function useNotify(): (msg: NotifyMessage) => void;
/** The injected `onError`, or the console default. */
declare function useOnError(): (err: unknown) => void;
/** The injected real-time `subscribe`, or the no-op default when the host wired none. */
declare function useSubscribe(): Subscribe;

/**
 * The SOURCE-BLIND, vocab-blind foundation renderer (big-calendar-surface PRD §3, §7).
 * It renders whatever `FoundationCalendarEvent[]` the injected `client` returns, wires
 * react-big-calendar's accessor + prop-getter API to that data, and delegates ALL
 * vocabulary + host chrome to the four injection kinds. It never learns that
 * "calendar"/"composition"/"channel" exist.
 *
 * Month + all-day only — NO hour time-grid (PRD §6 proved it wastes space for all-day
 * editorial data); interaction is day-cell level. Resident drag re-anchors; non-resident
 * gestures route to the reference-mode edit panel; an empty-cell click creates.
 */
interface BigCalendarSurfaceProps<E extends FoundationCalendarEvent = FoundationCalendarEvent> {
    /** The opaque lane axis (PRD §3.1). When >1 lane is given, events group into RBC resources (channels-as-lanes). */
    lanes?: LaneAxis[];
    /** The month the grid opens on (default: today). */
    defaultDate?: Date;
    /** Pixel height of the grid (default: a viewport-relative fallback). */
    height?: number | string;
    /**
     * An OPAQUE per-event predicate applied before render (default: keep all). The surface
     * stays vocab-blind — it never interprets the predicate; a vocab-aware caller (the
     * satellite's provenance/status facets) supplies it. Kept here, not in the client, so
     * facet toggling never triggers a network refetch.
     */
    filterEvent?: (event: E) => boolean;
}
declare function BigCalendarSurface<E extends FoundationCalendarEvent = FoundationCalendarEvent>({ lanes, defaultDate, height, filterEvent, }: BigCalendarSurfaceProps<E>): react.JSX.Element;

/** react-query key factory — kept inside the package (rehome-ui: the data layer travels with it). */
declare const calendarKeys: {
    all: readonly ["big-calendar"];
    events: (range?: {
        start: Date;
        end: Date;
    }) => readonly ["big-calendar", "events", string];
};
/**
 * The events query + the real-time subscription wiring (PRD §7.2). On mount the injected
 * `subscribe` is called; on change the relevant query keys are invalidated (scoped by
 * `sourceId`/`ref` when supplied, else a broad refetch). The host provides an
 * already-wired transport; the foundation stays source-blind.
 */
declare function useCalendarEvents<E = FoundationCalendarEvent>(range?: {
    start: Date;
    end: Date;
}): _tanstack_react_query.UseQueryResult<NoInfer<E[]>, Error>;
/** Invalidate all calendar queries — used by the surface after a mutation resolves. */
declare function useInvalidateCalendar(): () => void;

/**
 * The interaction contract, kept as pure functions so it is testable without fighting
 * react-big-calendar's drag machinery in jsdom (PRD §5). Every gesture maps to an
 * authorized ADR-0070 write or is disabled — residence is the switch, never a fork.
 */
/** What a drag onto a new date resolves to (PRD §5.1). */
type DropPlan<E> = {
    kind: 'reAnchor';
    ref: string;
    newDate: Date;
} | {
    kind: 'confirmReference';
    event: E;
    newDate: Date;
};
/**
 * Resident drag = an immediate re-anchor (an ordinary cell edit of `anchor`). Non-resident
 * drag = route to the reference-mode panel for a gated override/materialize (no casual,
 * silent materialize). Resize is OFF entirely (no handles) — no duration field exists.
 */
declare function planEventDrop<E extends FoundationCalendarEvent>(event: E, newDate: Date): DropPlan<E>;
/**
 * Clicking an event opens the ONE edit panel in the mode residence dictates (PRD §5.2):
 * a resident event edits; a non-resident occurrence enters reference/materialize mode.
 */
declare function planEventSelect<E extends FoundationCalendarEvent>(event: E): EditPanelMode;
/**
 * Perform a resident re-anchor through the injected client with optimistic-undo feedback
 * (PRD §5.1 + §7.2): commit immediately, then notify success carrying an `action` that
 * re-issues `reAnchor` with the OLD date. Undo is entirely host-side — the foundation
 * only wires the callback into the notify payload. Rejections route to `onError` and the
 * rejection still propagates so the caller can roll back optimistic UI.
 */
declare function reAnchorEvent<E extends FoundationCalendarEvent>(services: CalendarServices<E>, event: E, newDate: Date): Promise<void>;

/** The shared localizer — day-granular, all-day editorial events (PRD §6). */
declare const localizer: react_big_calendar.DateLocalizer;
/**
 * The drag-and-drop props RBC's addon layers on top of `CalendarProps` (PRD §5.1: resident
 * drag re-anchors; resize is OFF). `withDragAndDrop` erases `Calendar`'s `<TEvent>` generic
 * to `object`, so we re-introduce it with a typed wrapper — the owned seam stays type-safe
 * over our `FoundationCalendarEvent` while nothing downstream touches RBC internals.
 */
interface DndExtras<E extends object> {
    onEventDrop?: (args: {
        event: E;
        start: Date | string;
        end: Date | string;
        isAllDay?: boolean;
    }) => void;
    draggableAccessor?: (event: E) => boolean;
    resizable?: boolean;
}
declare function DndCalendar<E extends object, R extends object = object>(props: CalendarProps<E, R> & DndExtras<E>): react.JSX.Element | null;

export { BigCalendarProvider, BigCalendarSurface, type BigCalendarSurfaceProps, type CalendarClient, type CalendarServices, DndCalendar, type DropPlan, type EditPanelContext, type EditPanelMode, type FoundationCalendarEvent, type LaneAxis, type NotifyMessage, type OverrideAction, type Subscribe, calendarKeys, localizer, planEventDrop, planEventSelect, reAnchorEvent, useCalendarEvents, useCalendarServices, useInvalidateCalendar, useNotify, useOnError, useSubscribe };
