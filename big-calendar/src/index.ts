// @schemastud/big-calendar — the source-blind, vocab-blind foundation calendar surface
// (big-calendar-surface PRD §1/§3/§7). A host renders the calendar by supplying ONE
// transport adapter (+ feedback / four renderX chrome slots / real-time subscribe) through
// <BigCalendarProvider>; everything else — the RBC wiring, the react-query data layer, the
// residence-gated interaction contract — travels inside the package. It NEVER learns that
// "calendar"/"composition"/"channel" exist.

// The injection seams (PRD §7.2): the provider carrying the four injection kinds + defaults.
export { BigCalendarProvider, useCalendarServices, useNotify, useOnError, useSubscribe } from './provider';

// The foundation-authored, source-blind event type + the four-kind contract.
export type {
    FoundationCalendarEvent,
    CalendarClient,
    CalendarServices,
    OverrideAction,
    NotifyMessage,
    Subscribe,
    LaneAxis,
    EditPanelMode,
    EditPanelContext,
} from './types';

// The surface renderer.
export { BigCalendarSurface } from './BigCalendarSurface';
export type { BigCalendarSurfaceProps } from './BigCalendarSurface';

// The react-query data layer (keys + the events query + invalidation).
export { calendarKeys, useCalendarEvents, useInvalidateCalendar } from './hooks';

// The pure, DOM-free interaction contract (residence → gesture routing).
export {
    planEventDrop,
    planEventSelect,
    reAnchorEvent,
    type DropPlan,
} from './interaction';

// The vendored-and-owned RBC edge (thin re-export + localizer). Nothing else imports RBC.
export { Calendar, DndCalendar, Views, localizer } from './Calendar';
