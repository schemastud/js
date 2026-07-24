import type { CalendarServices, EditPanelMode, FoundationCalendarEvent, NotifyMessage } from './types';

/**
 * The interaction contract, kept as pure functions so it is testable without fighting
 * react-big-calendar's drag machinery in jsdom (PRD §5). Every gesture maps to an
 * authorized ADR-0070 write or is disabled — residence is the switch, never a fork.
 */

/** What a drag onto a new date resolves to (PRD §5.1). */
export type DropPlan<E> =
    | { kind: 'reAnchor'; ref: string; newDate: Date }
    | { kind: 'confirmReference'; event: E; newDate: Date };

/**
 * Resident drag = an immediate re-anchor (an ordinary cell edit of `anchor`). Non-resident
 * drag = route to the reference-mode panel for a gated override/materialize (no casual,
 * silent materialize). Resize is OFF entirely (no handles) — no duration field exists.
 */
export function planEventDrop<E extends FoundationCalendarEvent>(event: E, newDate: Date): DropPlan<E> {
    return event.resident
        ? { kind: 'reAnchor', ref: event.ref, newDate }
        : { kind: 'confirmReference', event, newDate };
}

/**
 * Clicking an event opens the ONE edit panel in the mode residence dictates (PRD §5.2):
 * a resident Release edits; a non-resident occurrence enters reference/materialize mode.
 */
export function planEventSelect<E extends FoundationCalendarEvent>(event: E): EditPanelMode {
    return event.resident ? 'resident-edit' : 'reference';
}

/**
 * Perform a resident re-anchor through the injected client with optimistic-undo feedback
 * (PRD §5.1 + §7.2): commit immediately, then notify success carrying an `action` that
 * re-issues `reAnchor` with the OLD date. Undo is entirely host-side — the foundation
 * only wires the callback into the notify payload. Rejections route to `onError` and the
 * rejection still propagates so the caller can roll back optimistic UI.
 */
export async function reAnchorEvent<E extends FoundationCalendarEvent>(
    services: CalendarServices<E>,
    event: E,
    newDate: Date,
): Promise<void> {
    const notify = services.notify ?? (() => {});
    const oldDate = event.start;
    try {
        await services.client.reAnchor(event.ref, newDate);
        const msg: NotifyMessage = {
            level: 'success',
            text: `Moved “${event.title}”.`,
            action: {
                label: 'Undo',
                run: () => {
                    void services.client.reAnchor(event.ref, oldDate);
                },
            },
        };
        notify(msg);
    } catch (err) {
        services.onError?.(err);
        throw err;
    }
}
