// src/registry.ts
var sources = [];
function registerNavSource(source) {
  sources.push(source);
}
function getNavSources() {
  return [...sources].sort(
    (a, b) => (a.order ?? Infinity) - (b.order ?? Infinity)
  );
}
function clearNavSources() {
  sources.length = 0;
}
async function resolveNavNodes(list = getNavSources()) {
  const loaded = await Promise.all(
    list.map(async (source) => {
      try {
        return await source.load();
      } catch {
        return [];
      }
    })
  );
  return loaded.flat();
}
var leafSlug = (href) => href?.split("/").filter(Boolean).pop();
var byOrder = (a, b) => (a.order ?? Infinity) - (b.order ?? Infinity);
function groupNodes(nodes) {
  const groups = /* @__PURE__ */ new Map();
  for (const node of nodes) {
    const key = node.group ?? "";
    const list = groups.get(key) ?? [];
    list.push(node);
    groups.set(key, list);
  }
  const declaredGroupOrder = (items) => items.find((i) => i.groupOrder !== void 0)?.groupOrder ?? Infinity;
  return [...groups.entries()].sort(([, a], [, b]) => declaredGroupOrder(a) - declaredGroupOrder(b)).map(([group, items]) => {
    const leaves = new Set(
      items.map((i) => leafSlug(i.href)).filter(Boolean)
    );
    const childrenOf = /* @__PURE__ */ new Map();
    for (const item of items) {
      if (item.parent && leaves.has(item.parent)) {
        const list = childrenOf.get(item.parent) ?? [];
        list.push(item);
        childrenOf.set(item.parent, list);
      }
    }
    const roots = items.filter((item) => !(item.parent && leaves.has(item.parent))).map((item) => {
      const slug = leafSlug(item.href);
      const children = (slug && childrenOf.get(slug) || []).sort(
        byOrder
      );
      return children.length > 0 ? { ...item, children } : { ...item };
    }).sort(byOrder);
    return {
      group,
      groupOrder: declaredGroupOrder(items),
      items: roots
    };
  });
}
function buildNavTree(nodes, trackOrder) {
  const byTrack = /* @__PURE__ */ new Map();
  for (const node of nodes) {
    const key = node.track ?? "";
    const list = byTrack.get(key) ?? [];
    list.push(node);
    byTrack.set(key, list);
  }
  const keys = trackOrder ? [
    ...trackOrder.filter((t) => byTrack.has(t)),
    ...[...byTrack.keys()].filter((t) => !trackOrder.includes(t))
  ] : [...byTrack.keys()];
  return keys.map((track) => ({
    track,
    groups: groupNodes(byTrack.get(track) ?? [])
  })).filter((t) => t.groups.length > 0);
}
var flattenItems = (items) => items.flatMap((item) => [item, ...item.children ?? []]);
var leadHref = (group) => flattenItems(group.items).find((i) => i.href)?.href;
function navTrail(tree, href) {
  if (!href) {
    return null;
  }
  for (const track of tree) {
    for (const group of track.groups) {
      const flat = flattenItems(group.items);
      const active = flat.find((i) => i.href === href);
      if (!active) {
        continue;
      }
      const groupSiblings = track.groups.map((g) => {
        const lead = leadHref(g);
        return lead ? { label: g.group, href: lead } : null;
      }).filter((s) => s !== null);
      const pageSiblings = flat.filter((i) => i.href).map((i) => ({ label: i.title, href: i.href }));
      return {
        trackKey: track.track,
        group: {
          label: group.group,
          current: leadHref(group) ?? href,
          siblings: groupSiblings
        },
        page: {
          label: active.title,
          href,
          siblings: pageSiblings
        }
      };
    }
  }
  return null;
}

// src/ExpandableNav.tsx
import {
  useEffect,
  useMemo,
  useState
} from "react";
import { jsx, jsxs } from "react/jsx-runtime";
var groupKey = (track, group) => `${track}::${group}`;
function readPersisted(prefix, key) {
  if (typeof window === "undefined") {
    return void 0;
  }
  try {
    const raw = window.localStorage.getItem(`${prefix}:${key}`);
    return raw === null ? void 0 : raw === "1";
  } catch {
    return void 0;
  }
}
function writePersisted(prefix, key, open) {
  if (typeof window === "undefined") {
    return;
  }
  try {
    window.localStorage.setItem(`${prefix}:${key}`, open ? "1" : "0");
  } catch {
  }
}
function usePrefersReducedMotion() {
  const [reduce, setReduce] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) {
      return;
    }
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduce(mq.matches);
    update();
    mq.addEventListener?.("change", update);
    return () => mq.removeEventListener?.("change", update);
  }, []);
  return reduce;
}
var groupHasActive = (items, href) => !!href && items.some(
  (item) => item.href === href || (item.children ?? []).some((child) => child.href === href)
);
var defaultChevron = (_open) => /* @__PURE__ */ jsx(
  "svg",
  {
    viewBox: "0 0 16 16",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "1.75",
    strokeLinecap: "round",
    strokeLinejoin: "round",
    width: "1em",
    height: "1em",
    "aria-hidden": "true",
    children: /* @__PURE__ */ jsx("path", { d: "m6 4 4 4-4 4" })
  }
);
function ExpandableNav({
  items,
  renderLink,
  currentHref,
  trackOrder,
  trackLabel = (t) => t,
  storagePrefix = "schemastud-nav:open",
  initialGroupState = "expanded",
  classes = {},
  renderChevron = defaultChevron,
  "aria-label": ariaLabel = "Navigation"
}) {
  const reduceMotion = usePrefersReducedMotion();
  const fromRegistry = items === void 0;
  const sources2 = useMemo(
    () => fromRegistry ? getNavSources() : [],
    [fromRegistry]
  );
  const [loaded, setLoaded] = useState(
    () => Object.fromEntries(sources2.map((s) => [s.id, null]))
  );
  useEffect(() => {
    let alive = true;
    for (const source of sources2) {
      source.load().then((nodes) => {
        if (alive) {
          setLoaded((prev) => ({ ...prev, [source.id]: nodes }));
        }
      }).catch(() => {
        if (alive) {
          setLoaded((prev) => ({ ...prev, [source.id]: [] }));
        }
      });
    }
    return () => {
      alive = false;
    };
  }, [sources2]);
  const pending = sources2.filter((s) => loaded[s.id] === null);
  const tree = useMemo(() => {
    const nodes = items ?? sources2.flatMap((s) => loaded[s.id] ?? []);
    return buildNavTree(nodes, trackOrder);
  }, [items, sources2, loaded, trackOrder]);
  const [openState, setOpenState] = useState({});
  const isOpen = (track, group, items2) => {
    const key = groupKey(track, group);
    if (key in openState) {
      return openState[key];
    }
    if (groupHasActive(items2, currentHref)) {
      return true;
    }
    const persisted = readPersisted(storagePrefix, key);
    if (persisted !== void 0) {
      return persisted;
    }
    return initialGroupState === "expanded";
  };
  const toggle = (track, group, open) => {
    const key = groupKey(track, group);
    const next = !open;
    writePersisted(storagePrefix, key, next);
    setOpenState((prev) => ({ ...prev, [key]: next }));
  };
  return /* @__PURE__ */ jsxs("nav", { className: classes.nav, "aria-label": ariaLabel, children: [
    tree.map((navTrack) => /* @__PURE__ */ jsxs("div", { className: classes.track, children: [
      /* @__PURE__ */ jsx("p", { className: classes.trackLabel, children: trackLabel(navTrack.track) }),
      navTrack.groups.map((group) => {
        const open = isOpen(
          navTrack.track,
          group.group,
          group.items
        );
        const panelId = `sn-${navTrack.track}-${group.group}`.replace(
          /\s+/g,
          "-"
        );
        const panelStyle = {
          display: "grid",
          gridTemplateRows: open ? "1fr" : "0fr",
          transition: reduceMotion ? void 0 : "grid-template-rows 200ms ease"
        };
        const chevronStyle = {
          display: "inline-flex",
          transition: reduceMotion ? void 0 : "transform 180ms ease",
          transform: open ? "rotate(90deg)" : "none"
        };
        return /* @__PURE__ */ jsxs("div", { className: classes.group, children: [
          /* @__PURE__ */ jsxs(
            "button",
            {
              type: "button",
              className: classes.header,
              "aria-expanded": open,
              "aria-controls": panelId,
              onClick: () => toggle(
                navTrack.track,
                group.group,
                open
              ),
              children: [
                /* @__PURE__ */ jsx(
                  "span",
                  {
                    className: classes.chevron,
                    style: chevronStyle,
                    "aria-hidden": "true",
                    children: renderChevron(open)
                  }
                ),
                /* @__PURE__ */ jsx("span", { children: group.group })
              ]
            }
          ),
          /* @__PURE__ */ jsx(
            "div",
            {
              id: panelId,
              style: panelStyle,
              "aria-hidden": !open,
              children: /* @__PURE__ */ jsx(
                "div",
                {
                  className: classes.panelInner,
                  style: {
                    overflow: "hidden",
                    minHeight: 0,
                    visibility: open ? void 0 : "hidden"
                  },
                  children: group.items.map((item) => /* @__PURE__ */ jsxs(
                    "div",
                    {
                      className: classes.item,
                      children: [
                        renderLink(item, {
                          active: item.href === currentHref
                        }),
                        item.children && item.children.length > 0 && /* @__PURE__ */ jsx(
                          "div",
                          {
                            className: classes.children,
                            children: item.children.map(
                              (child) => /* @__PURE__ */ jsx(
                                "div",
                                {
                                  className: classes.item,
                                  children: renderLink(
                                    child,
                                    {
                                      active: child.href === currentHref
                                    }
                                  )
                                },
                                child.href ?? child.title
                              )
                            )
                          }
                        )
                      ]
                    },
                    item.href ?? item.title
                  ))
                }
              )
            }
          )
        ] }, group.group);
      })
    ] }, navTrack.track)),
    pending.length > 0 && /* @__PURE__ */ jsx("div", { className: classes.loading, "aria-live": "polite", children: pending.map((s) => /* @__PURE__ */ jsx("span", { children: "Loading\u2026" }, s.id)) })
  ] });
}

// src/OnThisPage.tsx
import { useEffect as useEffect2, useState as useState2 } from "react";

// src/headings.ts
var DEFAULT_HEADING_SELECTOR = "h2[id], h3[id]";
function scopeHeadingSelector(container, selector) {
  return container ? selector.split(",").map((s) => `${container} ${s.trim()}`).join(", ") : selector;
}
function scanHeadings(options = {}) {
  const { container, selector = DEFAULT_HEADING_SELECTOR } = options;
  const doc = options.doc ?? (typeof document !== "undefined" ? document : void 0);
  if (!doc) {
    return [];
  }
  return Array.from(
    doc.querySelectorAll(
      scopeHeadingSelector(container, selector)
    )
  ).map((el) => ({
    id: el.id,
    text: el.textContent ?? "",
    // 'H2' → 2, 'H3' → 3, … (falls back to 2 for a non-h tag).
    level: Number(el.tagName.slice(1)) || 2
  }));
}

// src/OnThisPage.tsx
import { jsx as jsx2, jsxs as jsxs2 } from "react/jsx-runtime";
function OnThisPage({
  routeKey,
  container,
  selector,
  title = "On this page",
  minHeadings = 2,
  classes = {},
  "aria-label": ariaLabel = "On this page"
}) {
  const [headings, setHeadings] = useState2([]);
  const [activeId, setActiveId] = useState2("");
  useEffect2(() => {
    if (typeof document === "undefined") {
      return;
    }
    const items = scanHeadings({ container, selector });
    setHeadings(items);
    if (items.length === 0) {
      return;
    }
    const nodes = items.map((h) => document.getElementById(h.id)).filter((el) => el !== null);
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting).sort(
          (a, b) => a.boundingClientRect.top - b.boundingClientRect.top
        );
        if (visible[0]) setActiveId(visible[0].target.id);
      },
      { rootMargin: "-80px 0px -66% 0px", threshold: 0 }
    );
    nodes.forEach((n) => observer.observe(n));
    const onScroll = () => {
      const atBottom = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2;
      if (atBottom) setActiveId(nodes[nodes.length - 1].id);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", onScroll);
    };
  }, [routeKey, container, selector]);
  if (headings.length < minHeadings) {
    return null;
  }
  return /* @__PURE__ */ jsxs2("nav", { className: classes.root, "aria-label": ariaLabel, children: [
    title != null && /* @__PURE__ */ jsx2("p", { className: classes.title, children: title }),
    /* @__PURE__ */ jsx2("ul", { className: classes.list, children: headings.map((h) => /* @__PURE__ */ jsx2("li", { className: classes.item, children: /* @__PURE__ */ jsx2(
      "a",
      {
        href: `#${h.id}`,
        onClick: () => setActiveId(h.id),
        "aria-current": h.id === activeId ? "true" : void 0,
        className: [
          classes.link,
          h.level === 3 ? classes.linkLevel3 : "",
          h.id === activeId ? classes.linkActive : ""
        ].filter(Boolean).join(" "),
        children: h.text
      }
    ) }, h.id)) })
  ] });
}
export {
  DEFAULT_HEADING_SELECTOR,
  ExpandableNav,
  OnThisPage,
  buildNavTree,
  clearNavSources,
  getNavSources,
  navTrail,
  registerNavSource,
  resolveNavNodes,
  scanHeadings,
  scopeHeadingSelector
};
//# sourceMappingURL=index.js.map