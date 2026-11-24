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
import { useCallback, useMemo as useMemo2, useState as useState2 } from "react";

// src/Calendar.tsx
import { format, getDay, parse, startOfWeek } from "date-fns";
import { enUS } from "date-fns/locale/en-US";
import { useEffect, useMemo, useState } from "react";
import { Calendar, dateFnsLocalizer, Views } from "react-big-calendar";
import { jsx as jsx2 } from "react/jsx-runtime";
var localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales: { "en-US": enUS }
});
var localeTable;
var english = (locale) => /^(en|en-us)(-u-.*)?$/i.test(locale);
function selectLocale(locale, locales) {
  const normalized = locale.toLowerCase().split("-u-")[0];
  const language = normalized.split("-")[0];
  const available = Object.values(locales);
  return available.find((item) => item.code.toLowerCase() === normalized) ?? available.find((item) => item.code.toLowerCase() === language) ?? enUS;
}
function useCalendarLocalizer(locale) {
  const [loaded, setLoaded] = useState(null);
  useEffect(() => {
    if (english(locale)) return;
    let active = true;
    const pending = localeTable ??= import("date-fns/locale").catch((error) => {
      localeTable = void 0;
      throw error;
    });
    void pending.then((table) => {
      if (active) setLoaded({ locale, value: selectLocale(locale, table) });
    }).catch(() => {
    });
    return () => {
      active = false;
    };
  }, [locale]);
  const selected = !english(locale) && loaded?.locale === locale ? loaded.value : enUS;
  return useMemo(() => dateFnsLocalizer({ format, parse, startOfWeek, getDay, locales: { [locale]: selected } }), [locale, selected]);
}
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

// src/messages.ts
import { useMessages } from "@schemastud/messages/react";

// messages.default.json
var messages_default_default = {
  version: 1,
  package: "@schemastud/big-calendar",
  sourceLocale: "en",
  namespace: "schemastud-big-calendar",
  sharesWith: null,
  messages: {
    "schemastud-big-calendar::messages.event_detail": "Event detail",
    "schemastud-big-calendar::messages.close": "Close",
    "schemastud-big-calendar::messages.new_release": "New release",
    "schemastud-big-calendar::messages.moved": "Moved \u201C:title\u201D.",
    "schemastud-big-calendar::messages.undo": "Undo",
    "schemastud-big-calendar::messages.mode.create": "create",
    "schemastud-big-calendar::messages.mode.resident-edit": "resident-edit",
    "schemastud-big-calendar::messages.mode.reference": "reference",
    "schemastud-big-calendar::messages.toolbar.date": "Date",
    "schemastud-big-calendar::messages.toolbar.time": "Time",
    "schemastud-big-calendar::messages.toolbar.event": "Event",
    "schemastud-big-calendar::messages.toolbar.allDay": "All Day",
    "schemastud-big-calendar::messages.toolbar.week": "Week",
    "schemastud-big-calendar::messages.toolbar.work_week": "Work Week",
    "schemastud-big-calendar::messages.toolbar.day": "Day",
    "schemastud-big-calendar::messages.toolbar.month": "Month",
    "schemastud-big-calendar::messages.toolbar.previous": "Back",
    "schemastud-big-calendar::messages.toolbar.next": "Next",
    "schemastud-big-calendar::messages.toolbar.yesterday": "Yesterday",
    "schemastud-big-calendar::messages.toolbar.tomorrow": "Tomorrow",
    "schemastud-big-calendar::messages.toolbar.today": "Today",
    "schemastud-big-calendar::messages.toolbar.agenda": "Agenda",
    "schemastud-big-calendar::messages.toolbar.noEventsInRange": "There are no events in this range.",
    "schemastud-big-calendar::messages.toolbar.showMore": "+:shownCount more"
  }
};

// src/messages.ts
var useCalendarMessages = () => useMessages(messages_default_default.messages);

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
import { createMessages } from "@schemastud/messages";
function planEventDrop(event, newDate) {
  return event.resident ? { kind: "reAnchor", ref: event.ref, newDate } : { kind: "confirmReference", event, newDate };
}
function planEventSelect(event) {
  return event.resident ? "resident-edit" : "reference";
}
async function reAnchorEvent(services, event, newDate) {
  const messages = createMessages(messages_default_default.messages);
  const notify = services.notify ?? (() => {
  });
  const oldDate = event.start;
  try {
    await services.client.reAnchor(event.ref, newDate);
    const msg = {
      level: "success",
      text: messages.t("schemastud-big-calendar::messages.moved", { title: event.title }),
      action: {
        label: messages.t("schemastud-big-calendar::messages.undo"),
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
  const messages = useCalendarMessages();
  const localizer2 = useCalendarLocalizer(messages.locale);
  const calendarCopy = useMemo2(() => ({
    date: messages.t("schemastud-big-calendar::messages.toolbar.date"),
    time: messages.t("schemastud-big-calendar::messages.toolbar.time"),
    event: messages.t("schemastud-big-calendar::messages.toolbar.event"),
    allDay: messages.t("schemastud-big-calendar::messages.toolbar.allDay"),
    week: messages.t("schemastud-big-calendar::messages.toolbar.week"),
    work_week: messages.t("schemastud-big-calendar::messages.toolbar.work_week"),
    day: messages.t("schemastud-big-calendar::messages.toolbar.day"),
    month: messages.t("schemastud-big-calendar::messages.toolbar.month"),
    previous: messages.t("schemastud-big-calendar::messages.toolbar.previous"),
    next: messages.t("schemastud-big-calendar::messages.toolbar.next"),
    yesterday: messages.t("schemastud-big-calendar::messages.toolbar.yesterday"),
    tomorrow: messages.t("schemastud-big-calendar::messages.toolbar.tomorrow"),
    today: messages.t("schemastud-big-calendar::messages.toolbar.today"),
    agenda: messages.t("schemastud-big-calendar::messages.toolbar.agenda"),
    noEventsInRange: messages.t("schemastud-big-calendar::messages.toolbar.noEventsInRange"),
    showMore: (count) => messages.choice("schemastud-big-calendar::messages.toolbar.showMore", count, { shownCount: messages.number(count) })
  }), [messages]);
  const invalidate = useInvalidateCalendar();
  const query = useCalendarEvents();
  const events = useMemo2(() => {
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
        void reAnchorEvent({ ...services, notify: (notice) => services.notify?.({
          ...notice,
          text: messages.t("schemastud-big-calendar::messages.moved", { title: event.title }),
          action: notice.action ? { ...notice.action, label: messages.t("schemastud-big-calendar::messages.undo") } : void 0
        }) }, event, plan.newDate).then(invalidate).catch(() => {
        });
      } else {
        setPanel({ mode: "reference", event: plan.event, date: plan.newDate });
      }
    },
    [services, invalidate, messages]
  );
  const eventPropGetter = useCallback(
    (event) => ({ style: eventStyle(event.colorToken, event.resident) }),
    []
  );
  const draggableAccessor = useCallback((event) => event.resident, []);
  const components = useMemo2(
    () => ({
      event: ({ event }) => services.renderEventBadge ? /* @__PURE__ */ jsx3(Fragment, { children: services.renderEventBadge(event) }) : /* @__PURE__ */ jsx3("span", { className: "rbc-event-title", children: event.title })
    }),
    [services]
  );
  const resources = useMemo2(
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
        localizer: localizer2,
        culture: messages.locale,
        messages: calendarCopy,
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
    panelCtx && services.renderEditPanel ? services.renderEditPanel(panelCtx) : panelCtx ? /* @__PURE__ */ jsxs("div", { className: "rbc-default-panel", role: "dialog", "aria-label": messages.t("schemastud-big-calendar::messages.event_detail"), children: [
      /* @__PURE__ */ jsx3("button", { type: "button", className: "rbc-default-panel-close", onClick: closePanel, children: messages.t("schemastud-big-calendar::messages.close") }),
      /* @__PURE__ */ jsx3("div", { className: "rbc-default-panel-title", children: panelCtx.event?.title ?? messages.t("schemastud-big-calendar::messages.new_release") }),
      /* @__PURE__ */ jsx3("div", { className: "rbc-default-panel-mode", children: messages.t(`schemastud-big-calendar::messages.mode.${panelCtx.mode}`) })
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