/**
 * Vendored-and-owned (big-calendar-surface PRD §1, §7.1): the thin `Calendar` re-export
 * over the react-big-calendar peer + a `date-fns` localizer (NEVER `moment`). This is the
 * owned seam's vendor edge — nothing else in the package imports RBC internals; everything
 * meets RBC here, at its accessor/prop-getter API. MIT (react-big-calendar, list-jonas) —
 * kept intact; no upstream upgrade path to lose.
 */
import { format, getDay, parse, startOfWeek } from 'date-fns';
import { enUS } from 'date-fns/locale';
import { useEffect, useState, type ComponentType } from 'react';
import { Calendar, dateFnsLocalizer, Views, type CalendarProps } from 'react-big-calendar';

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

// Loaded via a DYNAMIC import, cached module-wide once resolved — NOT a static top-level
// `import withDragAndDrop from 'react-big-calendar/lib/addons/dragAndDrop'`. That static shape
// measurably breaks under some production bundler graphs (rolldown, at least; also reproduced
// against esbuild's own browser-platform CJS output): the addon's internal dependency chain
// keeps a deeply-nested, runtime `require('react')` inside a lazily-instantiated CJS factory
// that a browser-target ESM bundle can only satisfy SYNCHRONOUSLY — impossible, since a browser
// only has 'react' via an (async) import, throwing either a `(0, <x>.default) is not a function`
// double-wrap or "Calling `require` for react in an environment that doesn't expose the require
// function", depending on exactly how the bundler classifies the module. A dynamic `import()`
// sidesteps this: the addon's own chunk gets its OWN top-level scope, where the bundler CAN
// hoist its external imports (including 'react') as ordinary statically-resolved chunk-level
// imports before any of the addon's code runs — there is no more "synchronous access needed
// from inside an already-executing synchronous module" to fail on. Reproduced (and only
// reproduced) on every Calendar/CompositionCalendar story, the only satellite that renders
// through this wrapper.
let dndInnerPromise: Promise<ComponentType<CalendarProps<object, object>>> | undefined;
function loadDndInner() {
    return (dndInnerPromise ??= import('react-big-calendar/lib/addons/dragAndDrop').then((mod) => {
        // Defensive unwrap: some production bundler graphs (rolldown, at least) additionally
        // double-wrap this specific CJS module's default export as `{ default: { default: fn } }`
        // instead of `{ default: fn }` — see the block comment above. Once dynamic-imported, that
        // failure mode is silent (an unresolved promise, never a thrown error the caller sees),
        // so unwrap defensively rather than assume the bundler got it right.
        const maybeDoubleWrapped = mod.default as unknown as { default?: typeof mod.default };
        const withDragAndDrop =
            typeof mod.default === 'function' ? mod.default : (maybeDoubleWrapped.default as typeof mod.default);
        return withDragAndDrop(Calendar as ComponentType<CalendarProps<object, object>>);
    }));
}

export function DndCalendar<E extends object, R extends object = object>(
    props: CalendarProps<E, R> & DndExtras<E>,
) {
    const [Comp, setComp] = useState<ComponentType<object> | null>(null);
    useEffect(() => {
        let cancelled = false;
        void loadDndInner().then((DndInner) => {
            if (!cancelled) setComp(() => DndInner as ComponentType<object>);
        });
        return () => {
            cancelled = true;
        };
    }, []);
    if (!Comp) return null;
    const Rendered = Comp as unknown as ComponentType<CalendarProps<E, R> & DndExtras<E>>;
    return <Rendered {...props} />;
}

export { Calendar, Views };
