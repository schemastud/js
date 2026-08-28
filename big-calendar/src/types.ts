import type { ReactNode } from 'react';

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
export interface FoundationCalendarEvent {
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
export type OverrideAction =
    | { kind: 'pin'; newDate: Date }
    | { kind: 'skip' }
    | { kind: 'replaceTemplate' };

/**
 * The injected transport adapter — the ONE required data seam (PRD §7.2). The host wraps
 * whatever transport it has and points it at the correct tenant and owner; the surface is
 * tenant-blind and owner-blind. Generic over the event DTO with a default bound
 * to {@see FoundationCalendarEvent}.
 */
export interface CalendarClient<E = FoundationCalendarEvent> {
    /** All events for a range. `range` is v1-IGNORED (the +3mo server default renders), kept so a view-driven horizon never breaks the interface. */
    listEvents(range?: { start: Date; end: Date }): Promise<E[]>;
    /** Re-anchor a resident event to a new date (resident drag + the edit panel's date field — one write, two entry points). */
    reAnchor(ref: string, newDate: Date): Promise<void>;
    /** Create a one-off event on a date (empty-cell click; the edit panel's create mode). */
    createEvent(input: { date: Date } & Record<string, unknown>): Promise<E>;
    /** Edit a stored cell's fields. */
    editCell(ref: string, patch: Record<string, unknown>): Promise<void>;
    /** "Fire here" / dereference-in-place — materialize a non-resident occurrence into a stored event. */
    materialize(ref: string): Promise<E>;
    /** Override a non-resident occurrence: pin | skip | replaceTemplate. */
    override(ref: string, action: OverrideAction): Promise<E>;
}

/** Feedback payload; `action` carries a host-side undo callback (the foundation never models undo). */
export interface NotifyMessage {
    level: 'success' | 'error' | 'info';
    text: string;
    action?: { label: string; run: () => void };
}

/**
 * The real-time subscription seam (the 4th injection kind, INCLUDED in v1). Returns an
 * unsubscribe fn called on unmount. The host wires it to Echo/websocket/poll; the
 * foundation receives an already-wired service and stays source-blind.
 */
export type Subscribe = (
    onChange: (changed?: { sourceId?: string; ref?: string }) => void,
) => () => void;

/** One entry on the opaque lane axis (PRD §3.1) — the satellite injects channels here. */
export interface LaneAxis {
    id: string;
    label: string;
}

/**
 * The edit panel opens in ONE of three modes over ONE render slot (PRD §5.2): editing a
 * resident event, referencing a non-resident occurrence (materialize/override), or
 * creating a new event on a clicked date. `resident-vs-reference` is a mode flag, not a
 * fork — the host fills `renderEditPanel` and switches on `mode`.
 */
export type EditPanelMode = 'resident-edit' | 'reference' | 'create';

export interface EditPanelContext<E = FoundationCalendarEvent> {
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
export interface CalendarServices<E = FoundationCalendarEvent> {
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
