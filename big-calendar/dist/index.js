// src/provider.tsx
import { createContext, useContext } from "react";
import { jsx } from "react/jsx-runtime";
var CalendarServicesContext = createContext(null);
function consoleNotify(msg) {
  if (msg.level === "error") console.error(`[big-calendar] ${msg.text}`);
  else console.debug(`[big-calendar] ${msg.text}`);
}
function consoleError(err) {
  console.error("[big-calendar]", err);
}
var noopSubscribe = () => () => {
};
function BigCalendarProvider({
  services,
  children
}) {
  return /* @__PURE__ */ jsx(CalendarServicesContext.Provider, { value: services, children });
}
function useCalendarServices() {
  const services = useContext(CalendarServicesContext);
  if (!services) {
    throw new Error("BigCalendarSurface must be rendered inside a <BigCalendarProvider>.");
  }
  return services;
}
function useNotify() {
  return useCalendarServices().notify ?? consoleNotify;
}
function useOnError() {
  return useCalendarServices().onError ?? consoleError;
}
function useSubscribe() {
  return useCalendarServices().subscribe ?? noopSubscribe;
}

// src/BigCalendarSurface.tsx
import { useCallback, useMemo, useState as useState2 } from "react";

// src/Calendar.tsx
import { format, getDay, parse, startOfWeek } from "date-fns";
import { enUS } from "date-fns/locale";
import { useEffect, useState } from "react";
import { Calendar, dateFnsLocalizer, Views } from "react-big-calendar";
import { jsx as jsx2 } from "react/jsx-runtime";
var localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales: { "en-US": enUS }
});
var dndInnerPromise;
function loadDndInner() {
  return dndInnerPromise ??= import("react-big-calendar/lib/addons/dragAndDrop").then((mod) => {
    const maybeDoubleWrapped = mod.default;
    const withDragAndDrop = typeof mod.default === "function" ? mod.default : maybeDoubleWrapped.default;
    return withDragAndDrop(Calendar);
  });
}
function DndCalendar(props) {
  const [Comp, setComp] = useState(null);
  useEffect(() => {
    let cancelled = false;
    void loadDndInner().then((DndInner) => {
      if (!cancelled) setComp(() => DndInner);
    });
    return () => {
      cancelled = true;
    };
  }, []);
  if (!Comp) return null;
  const Rendered = Comp;
  return /* @__PURE__ */ jsx2(Rendered, { ...props });
}

// src/hooks.ts
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect as useEffect2 } from "react";
var calendarKeys = {
  all: ["big-calendar"],
  events: (range) => ["big-calendar", "events", range ? `${+range.start}-${+range.end}` : "all"]
};
function useCalendarEvents(range) {
  const { client } = useCalendarServices();
  const subscribe = useSubscribe();
  const qc = useQueryClient();
  useEffect2(() => {
    return subscribe(() => {
      void qc.invalidateQueries({ queryKey: calendarKeys.all });
    });
  }, [subscribe, qc]);
  return useQuery({
    queryKey: calendarKeys.events(range),
    queryFn: () => client.listEvents(range),
    // Calendar reads self-refresh via `subscribe` + mutation invalidation, so a failed fetch
    // needn't be hammered — retrying a forbidden/broken read just storms the network + logs.
    retry: false
  });
}
function useInvalidateCalendar() {
  const qc = useQueryClient();
  return () => {
    void qc.invalidateQueries({ queryKey: calendarKeys.all });
  };
}

// src/interaction.ts
function planEventDrop(event, newDate) {
  return event.resident ? { kind: "reAnchor", ref: event.ref, newDate } : { kind: "confirmReference", event, newDate };
}
function planEventSelect(event) {
  return event.resident ? "resident-edit" : "reference";
}
async function reAnchorEvent(services, event, newDate) {
  const notify = services.notify ?? (() => {
  });
  const oldDate = event.start;
  try {
    await services.client.reAnchor(event.ref, newDate);
    const msg = {
      level: "success",
      text: `Moved \u201C${event.title}\u201D.`,
      action: {
        label: "Undo",
        run: () => {
          void services.client.reAnchor(event.ref, oldDate);
        }
      }
    };
    notify(msg);
  } catch (err) {
    services.onError?.(err);
    throw err;
  }
}

// src/BigCalendarSurface.tsx
import { Fragment, jsx as jsx3, jsxs } from "react/jsx-runtime";
var DEFAULT_HEIGHT = "calc(100vh - 140px)";
function eventStyle(colorToken, resident) {
  const color = `var(--stud-hue-${colorToken}, var(--stud-hue-default))`;
  return resident ? { backgroundColor: color, borderColor: color, color: "var(--rbc-on-hue, var(--stud-on-hue))" } : {
    backgroundColor: "transparent",
    border: `1.5px dashed ${color}`,
    color: `color-mix(in oklab, ${color} 60%, var(--rbc-fg))`
  };
}
function BigCalendarSurface({
  lanes,
  defaultDate,
  height = DEFAULT_HEIGHT,
  filterEvent
}) {
  const services = useCalendarServices();
  const invalidate = useInvalidateCalendar();
  const query = useCalendarEvents();
  const events = useMemo(() => {
    const all = query.data ?? [];
    return filterEvent ? all.filter(filterEvent) : all;
  }, [query.data, filterEvent]);
  const [panel, setPanel] = useState2(null);
  const closePanel = useCallback(() => setPanel(null), []);
  const multiLane = (lanes?.length ?? 0) > 1;
  const onSelectEvent = useCallback(
    (event) => setPanel({ mode: planEventSelect(event), event, date: event.start }),
    []
  );
  const onSelectSlot = useCallback(
    ({ start }) => setPanel({ mode: "create", event: null, date: start }),
    []
  );
  const onEventDrop = useCallback(
    ({ event, start }) => {
      const newDate = start instanceof Date ? start : new Date(start);
      const plan = planEventDrop(event, newDate);
      if (plan.kind === "reAnchor") {
        void reAnchorEvent(services, event, plan.newDate).then(invalidate).catch(() => {
        });
      } else {
        setPanel({ mode: "reference", event: plan.event, date: plan.newDate });
      }
    },
    [services, invalidate]
  );
  const eventPropGetter = useCallback(
    (event) => ({ style: eventStyle(event.colorToken, event.resident) }),
    []
  );
  const draggableAccessor = useCallback((event) => event.resident, []);
  const components = useMemo(
    () => ({
      event: ({ event }) => services.renderEventBadge ? /* @__PURE__ */ jsx3(Fragment, { children: services.renderEventBadge(event) }) : /* @__PURE__ */ jsx3("span", { className: "rbc-event-title", children: event.title })
    }),
    [services]
  );
  const resources = useMemo(
    () => multiLane ? lanes.map((l) => ({ id: l.id, title: l.label })) : void 0,
    [multiLane, lanes]
  );
  const panelCtx = panel ? { mode: panel.mode, event: panel.event, date: panel.date, close: closePanel } : null;
  return /* @__PURE__ */ jsxs("div", { className: "rbc-surface", "data-loading": query.isPending ? "" : void 0, children: [
    services.renderFilters?.(),
    multiLane && services.renderLaneHeader ? /* @__PURE__ */ jsx3("div", { className: "rbc-lane-headers", children: lanes.map((lane) => /* @__PURE__ */ jsx3("div", { className: "rbc-lane-header", children: services.renderLaneHeader(lane) }, lane.id)) }) : null,
    /* @__PURE__ */ jsx3(
      DndCalendar,
      {
        localizer,
        events,
        defaultDate,
        defaultView: Views.MONTH,
        views: [Views.MONTH, Views.AGENDA],
        style: { height },
        popup: true,
        selectable: true,
        resizable: false,
        allDayAccessor: () => true,
        startAccessor: (e) => e.start,
        endAccessor: (e) => e.end,
        titleAccessor: (e) => e.title,
        resourceAccessor: multiLane ? (e) => e.laneId : void 0,
        resources,
        resourceIdAccessor: (r) => r.id,
        resourceTitleAccessor: (r) => r.title,
        draggableAccessor,
        eventPropGetter,
        components,
        onSelectEvent,
        onSelectSlot,
        onEventDrop
      }
    ),
    panelCtx && services.renderEditPanel ? services.renderEditPanel(panelCtx) : panelCtx ? /* @__PURE__ */ jsxs("div", { className: "rbc-default-panel", role: "dialog", "aria-label": "Event detail", children: [
      /* @__PURE__ */ jsx3("button", { type: "button", className: "rbc-default-panel-close", onClick: closePanel, children: "Close" }),
      /* @__PURE__ */ jsx3("div", { className: "rbc-default-panel-title", children: panelCtx.event?.title ?? "New release" }),
      /* @__PURE__ */ jsx3("div", { className: "rbc-default-panel-mode", children: panelCtx.mode })
    ] }) : null
  ] });
}
export {
  BigCalendarProvider,
  BigCalendarSurface,
  Calendar,
  DndCalendar,
  Views,
  calendarKeys,
  localizer,
  planEventDrop,
  planEventSelect,
  reAnchorEvent,
  useCalendarEvents,
  useCalendarServices,
  useInvalidateCalendar,
  useNotify,
  useOnError,
  useSubscribe
};
//# sourceMappingURL=index.js.map