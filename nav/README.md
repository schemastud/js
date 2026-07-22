# @schemastud/nav

A host-agnostic docs/site navigation kit. Ships **no CSS and no router** — the host
injects link rendering, class names, and the current path.

- **Nav-source registry (compose-many).** `registerNavSource({ id, order?, load })` —
  any package contributes nav data via a lazy `load()` returning typed `NavNode`s. All
  registered sources concatenate; registration is additive.
- **Pure tree builder.** `buildNavTree(nodes, trackOrder?)` groups by `group`, nests one
  level by `parent` leaf slug, and sorts (`groupOrder` across groups, `order` within).
- **`<ExpandableNav>`.** A collapsible sidebar over the seam: `<button aria-expanded>`
  group disclosures, the active guide's group open on load, localStorage persistence,
  `initialGroupState: 'expanded' | 'collapsed'`, and injected `classes` + `renderLink`.
  The only inline styles are the grid-rows collapse animation + chevron rotation, both
  suppressed under `prefers-reduced-motion`.
- **`navTrail(tree, href)`.** The breadcrumb trail (track → group → page) derived from the
  same tree, with sibling lists for searchable switcher crumbs (pairs with
  `@schemastud/breadcrumb`).
- **`<OnThisPage>`.** An automatic in-page table of contents: reads id-bearing headings from
  the rendered DOM, builds `#anchor` links, and drives an `IntersectionObserver` scroll-spy.
  Injected `classes`, heading `selector`/`container`, and a `routeKey` that re-scans on
  navigation — no router, no CSS.

The same composed tree feeds both the sidebar and the breadcrumb, so they never disagree.
