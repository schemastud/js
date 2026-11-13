import { useCallback, useMemo, useState } from 'react';
import type { CSSProperties } from 'react';
import type { EventProps } from 'react-big-calendar';
import { DndCalendar, useCalendarLocalizer, Views } from './Calendar';
import { useCalendarMessages } from './messages';
import { useCalendarEvents, useInvalidateCalendar } from './hooks';
import { planEventDrop, planEventSelect, reAnchorEvent } from './interaction';
import { useCalendarServices } from './provider';
import type { EditPanelContext, EditPanelMode, FoundationCalendarEvent, LaneAxis } from './types';

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
export interface BigCalendarSurfaceProps<E extends FoundationCalendarEvent = FoundationCalendarEvent> {
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

const DEFAULT_HEIGHT = 'calc(100vh - 140px)';

/** RBC's resource row shape for the channels-as-lanes axis. */
interface LaneResource {
    id: string;
    title: string;
}

/**
 * Solid = a filled bar (resident); virtual = dashed/ghost, read-only (PRD §4.2).
 *
 * A virtual event has no fill, so its LABEL sits straight on the surface. The hue ramp is one
 * mid-lightness set tuned for white text on a filled bar; used bare as text it read at ~2.5:1 on a
 * dark surface (violet `Recurring: Weekly Digest` in the dark agenda, beam VR pass 2). The label
 * therefore mixes the hue toward the surface ink (`--rbc-fg`): darker on a light surface, lighter on
 * a dark one, still recognisably the hue. The dashed border keeps the pure hue.
 */
export function eventStyle(colorToken: string, resident: boolean): CSSProperties {
    const color = `var(--stud-hue-${colorToken}, var(--stud-hue-default))`;
    return resident
        ? { backgroundColor: color, borderColor: color, color: 'var(--rbc-on-hue, var(--stud-on-hue))' }
        : {
              backgroundColor: 'transparent',
              border: `1.5px dashed ${color}`,
              color: `color-mix(in oklab, ${color} 60%, var(--rbc-fg))`,
          };
}

export function BigCalendarSurface<E extends FoundationCalendarEvent = FoundationCalendarEvent>({
    lanes,
    defaultDate,
    height = DEFAULT_HEIGHT,
    filterEvent,
}: BigCalendarSurfaceProps<E>) {
    const services = useCalendarServices<E>();
    const messages = useCalendarMessages();
    const localizer = useCalendarLocalizer(messages.locale);
    const calendarCopy = useMemo(() => ({
        date: messages.t('schemastud-big-calendar::messages.toolbar.date'),
        time: messages.t('schemastud-big-calendar::messages.toolbar.time'),
        event: messages.t('schemastud-big-calendar::messages.toolbar.event'),
        allDay: messages.t('schemastud-big-calendar::messages.toolbar.allDay'),
        week: messages.t('schemastud-big-calendar::messages.toolbar.week'),
        work_week: messages.t('schemastud-big-calendar::messages.toolbar.work_week'),
        day: messages.t('schemastud-big-calendar::messages.toolbar.day'),
        month: messages.t('schemastud-big-calendar::messages.toolbar.month'),
        previous: messages.t('schemastud-big-calendar::messages.toolbar.previous'),
        next: messages.t('schemastud-big-calendar::messages.toolbar.next'),
        yesterday: messages.t('schemastud-big-calendar::messages.toolbar.yesterday'),
        tomorrow: messages.t('schemastud-big-calendar::messages.toolbar.tomorrow'),
        today: messages.t('schemastud-big-calendar::messages.toolbar.today'),
        agenda: messages.t('schemastud-big-calendar::messages.toolbar.agenda'),
        noEventsInRange: messages.t('schemastud-big-calendar::messages.toolbar.noEventsInRange'),
        showMore: (count: number) => messages.choice('schemastud-big-calendar::messages.toolbar.showMore', count, { shownCount: messages.number(count) }),
    }), [messages]);
    const invalidate = useInvalidateCalendar();
    const query = useCalendarEvents<E>();
    const events = useMemo(() => {
        const all = query.data ?? [];
        return filterEvent ? all.filter(filterEvent) : all;
    }, [query.data, filterEvent]);

    const [panel, setPanel] = useState<{ mode: EditPanelMode; event: E | null; date: Date | null } | null>(null);
    const closePanel = useCallback(() => setPanel(null), []);

    // ── The vendor seam: RBC accessors + prop-getters gated on residence (PRD §1). ──
    const multiLane = (lanes?.length ?? 0) > 1;

    const onSelectEvent = useCallback(
        (event: E) => setPanel({ mode: planEventSelect(event), event, date: event.start }),
        [],
    );

    const onSelectSlot = useCallback(
        ({ start }: { start: Date }) => setPanel({ mode: 'create', event: null, date: start }),
        [],
    );

    const onEventDrop = useCallback(
        ({ event, start }: { event: E; start: Date | string }) => {
            const newDate = start instanceof Date ? start : new Date(start);
            const plan = planEventDrop(event, newDate);
            if (plan.kind === 'reAnchor') {
                void reAnchorEvent({ ...services, notify: (notice) => services.notify?.({
                    ...notice,
                    text: messages.t('schemastud-big-calendar::messages.moved', { title: event.title }),
                    action: notice.action ? { ...notice.action, label: messages.t('schemastud-big-calendar::messages.undo') } : undefined,
                }) }, event, plan.newDate).then(invalidate).catch(() => {});
            } else {
                // Non-resident drop → the gated reference-mode panel (no silent materialize).
                setPanel({ mode: 'reference', event: plan.event, date: plan.newDate });
            }
        },
        [services, invalidate, messages],
    );

    const eventPropGetter = useCallback(
        (event: E) => ({ style: eventStyle(event.colorToken, event.resident) }),
        [],
    );

    const draggableAccessor = useCallback((event: E) => event.resident, []);

    // The per-event chrome slot (default: a plain title bar).
    const components = useMemo(
        () => ({
            event: ({ event }: EventProps<E>) =>
                services.renderEventBadge ? (
                    <>{services.renderEventBadge(event)}</>
                ) : (
                    <span className="rbc-event-title">{event.title}</span>
                ),
        }),
        [services],
    );

    const resources = useMemo<LaneResource[] | undefined>(
        () => (multiLane ? lanes!.map((l) => ({ id: l.id, title: l.label })) : undefined),
        [multiLane, lanes],
    );

    const panelCtx: EditPanelContext<E> | null = panel
        ? { mode: panel.mode, event: panel.event, date: panel.date, close: closePanel }
        : null;

    return (
        <div className="rbc-surface" data-loading={query.isPending ? '' : undefined}>
            {services.renderFilters?.()}

            {multiLane && services.renderLaneHeader ? (
                <div className="rbc-lane-headers">
                    {lanes!.map((lane) => (
                        <div key={lane.id} className="rbc-lane-header">
                            {services.renderLaneHeader!(lane)}
                        </div>
                    ))}
                </div>
            ) : null}

            <DndCalendar<E, LaneResource>
                localizer={localizer}
                culture={messages.locale}
                messages={calendarCopy}
                events={events}
                defaultDate={defaultDate}
                defaultView={Views.MONTH}
                views={[Views.MONTH, Views.AGENDA]}
                style={{ height }}
                popup
                selectable
                resizable={false}
                allDayAccessor={() => true}
                startAccessor={(e: E) => e.start}
                endAccessor={(e: E) => e.end}
                titleAccessor={(e: E) => e.title}
                resourceAccessor={multiLane ? (e: E) => e.laneId : undefined}
                resources={resources}
                resourceIdAccessor={(r: LaneResource) => r.id}
                resourceTitleAccessor={(r: LaneResource) => r.title}
                draggableAccessor={draggableAccessor}
                eventPropGetter={eventPropGetter}
                components={components}
                onSelectEvent={onSelectEvent}
                onSelectSlot={onSelectSlot}
                onEventDrop={onEventDrop}
            />

            {panelCtx && services.renderEditPanel
                ? services.renderEditPanel(panelCtx)
                : panelCtx
                  ? (
                      <div className="rbc-default-panel" role="dialog" aria-label={messages.t('schemastud-big-calendar::messages.event_detail')}>
                          <button type="button" className="rbc-default-panel-close" onClick={closePanel}>
                              {messages.t('schemastud-big-calendar::messages.close')}
                          </button>
                          <div className="rbc-default-panel-title">{panelCtx.event?.title ?? messages.t('schemastud-big-calendar::messages.new_release')}</div>
                          <div className="rbc-default-panel-mode">{messages.t(`schemastud-big-calendar::messages.mode.${panelCtx.mode}`)}</div>
                      </div>
                  )
                  : null}
        </div>
    );
}
