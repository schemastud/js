/**
 * Vendored-and-owned (big-calendar-surface PRD §1, §7.1): the thin `Calendar` re-export
 * over the react-big-calendar peer + a `date-fns` localizer (NEVER `moment`). This is the
 * owned seam's vendor edge — nothing else in the package imports RBC internals; everything
 * meets RBC here, at its accessor/prop-getter API. MIT (react-big-calendar, list-jonas) —
 * kept intact; no upstream upgrade path to lose.
 */
import { format, getDay, parse, startOfWeek } from 'date-fns';
import { enUS } from 'date-fns/locale';
import type { ComponentType } from 'react';
import { Calendar, dateFnsLocalizer, Views, type CalendarProps } from 'react-big-calendar';
import withDragAndDrop from 'react-big-calendar/lib/addons/dragAndDrop';

/** The shared localizer — day-granular, all-day editorial events (PRD §6). */
export const localizer = dateFnsLocalizer({
    format,
    parse,
    startOfWeek,
    getDay,
    locales: { 'en-US': enUS },
});

/**
 * The drag-and-drop props RBC's addon layers on top of `CalendarProps` (PRD §5.1: resident
 * drag re-anchors; resize is OFF). `withDragAndDrop` erases `Calendar`'s `<TEvent>` generic
 * to `object`, so we re-introduce it with a typed wrapper — the owned seam stays type-safe
 * over our `FoundationCalendarEvent` while nothing downstream touches RBC internals.
 */
export interface DndExtras<E extends object> {
    onEventDrop?: (args: { event: E; start: Date | string; end: Date | string; isAllDay?: boolean }) => void;
    draggableAccessor?: (event: E) => boolean;
    resizable?: boolean;
}

const DndInner = withDragAndDrop(Calendar as ComponentType<CalendarProps<object, object>>);

export function DndCalendar<E extends object, R extends object = object>(
    props: CalendarProps<E, R> & DndExtras<E>,
) {
    const Comp = DndInner as unknown as ComponentType<CalendarProps<E, R> & DndExtras<E>>;
    return <Comp {...props} />;
}

export { Calendar, Views };
