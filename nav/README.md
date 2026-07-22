# @schemastud/nav

A host-agnostic suite of **navigation primitives** for content/doc sites. A deliberate
umbrella: the pieces below share a model (and a house style — **no CSS, no router**; the
host injects link rendering, class names, and the current path), and the package is meant
to grow more nav primitives over time (a prev/next **pager**, a **top nav**, **tabs**, a
mobile drawer) rather than fragment into a package each. Components are named for the
specific thing they are — `ExpandableNav`, `OnThisPage`, … — so the umbrella never hides
what you're importing, and tree-shaking keeps a consumer paying only for what it uses.

## Members

- **Nav-source registry (compose-many).** `registerNavSource({ id, order?, load })` —
  any package contributes nav data via a lazy `load()` returning typed `NavNode`s. All
  registered sources concatenate; registration is additive.
- **Pure tree builder.** `buildNavTree(nodes, trackOrder?)` groups by `group`, nests one
  level by `parent` leaf slug, and sorts (`groupOrder` across groups, `order` within). The
  `NavNode` model is `track → group → item` — a hierarchical **list/side-nav** shape.
- **`<ExpandableNav>`.** A collapsible sidebar over the seam: `<button aria-expanded>`
  group disclosures, the active guide's group open on load, localStorage persistence,
  `initialGroupState: 'expanded' | 'collapsed'`, and injected `classes` + `renderLink`.
  The only inline styles are the grid-rows collapse animation + chevron rotation, both
  suppressed under `prefers-reduced-motion`.
- **`navTrail(tree, href)`.** The breadcrumb trail (track → group → page) derived from the
  same tree, with sibling lists for searchable switcher crumbs. Pairs with — does **not**
  replace — `@schemastud/breadcrumb` (this derives the *data*; that renders the *trail*).
- **`<OnThisPage>`.** An automatic in-page table of contents: reads id-bearing headings from
  the rendered DOM, builds `#anchor` links, and drives an `IntersectionObserver` scroll-spy.
  Injected `classes`, heading `selector`/`container`, and a `routeKey` that re-scans on
  navigation.

The same composed tree feeds both the sidebar and the breadcrumb, so they never disagree.

## Scope

**In:** navigation *structure* for a content site — the list/tree/side nav, its data model,
the in-page TOC, the breadcrumb-trail derivation, and future nav primitives (pager, top nav,
tabs). **Out:** standalone UI atoms that already have a home — breadcrumb *rendering*
(`@schemastud/breadcrumb`), the searchable dropdown (`@schemastud/combobox`). This package
composes those; it doesn't re-implement them.
