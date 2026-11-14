# @schemastud/frame

## 0.3.0

### Minor Changes

- e03f2ae: Add the `trend-card` card widget: a summary's figures drawn as a period series, with figures marked `forecast: true` drawn as a dashed segment from the last measured period. `SummaryFigure` gains an optional `forecast` field (absent or null reads as measured). Accessible as an image with a one-sentence title plus a visually hidden table of every period.
- efccfa4: `ResourcePicker`: pick a resource kind (palette / rail / catalog) or records of one kind (server typeahead with "Browse all N", or the embedded ListShell with a pick column, tri-state header, selection bar, tray and confirm bar). Its selection is `{ mode: 'ids', ids }` or `{ mode: 'set', filter, sort, exclude, collection?, filterVariant? }`. It replaces `ResourceRefWidget`'s one-page select as the `x-stud-resource-ref` field widget, which keeps its value shapes: one id, or an id array for `multiple`. A selection object appears only when the field declares `select: 'set'`. `FrameProvider` now installs the widget into seam's `defaultRegistry` as well; `registerFrameWidgets` covers any other registry. A node with an explicit `x-widget` is never shadowed. New table hooks: `FrameColumn.headerControl` and `ShadcnTable` `rowSelected`.
- c99033c: Read shared UI and frame copy through package catalogs on the one messages peer. Preserve caller copy overrides, standalone English and explicit money currency/locale. Add a Node-only AST display-copy ratchet with read-only comparison and a baseline that may only fall. Hosts install/dedupe the released messages peer; data-only host baselines are wired after train-end publication.

  Expand display-position coverage to logical children, object defaults, message parameters, formatting helpers and DOM copy; refuse stale baselines and run the read-only comparison in CI. Translate complete picker, status, trend and money sentences. DateCell deliberately uses en-US without a message provider rather than the browser locale.

### Patch Changes

- 8b39c27: `SchemaView` now omits a field whose `detail` entry says `participates: false`, matching what `list-column` already does. A field with no entry keeps the read-only fallback, and `list-item` is unchanged.
- Updated dependencies [e9b5f62]
- Updated dependencies [e4320b4]
- Updated dependencies [6f5a3a4]
- Updated dependencies [77daa17]
- Updated dependencies [9f95824]
- Updated dependencies [c99033c]
  - @schemastud/ui@0.2.0
  - @schemastud/facets@0.3.0
  - @schemastud/seam@0.3.0

## 0.2.2

### Patch Changes

- 13d0a50: Render the rows of a `recent-list` whose target binds no `list-item` widget through a new
  `record-line` default (text · event/status badge · short time, never a bare id), and hide the
  list pager when the response is a single page.
- 8cbe626: The generic list table no longer clips a wide list on a narrow screen: below 768px each record renders as a stacked
  card (first column the heading, the others labelled fields, row actions the footer), and at desktop width the table's
  wrapper scrolls sideways (`overflow-x-auto`) instead of hiding its right edge (`overflow-hidden`).
- Updated dependencies [a179834]
- Updated dependencies [a179834]
- Updated dependencies [8cbe626]
  - @schemastud/facets@0.2.2
  - @schemastud/seam@0.2.2
  - @schemastud/ui@0.1.2

## 0.2.1

### Patch Changes

- f3caefe: Isolate resource reads, cached placeholders and pending mutations by injected transport.
  Prevent delayed saved-view application from crossing providers, retain existing query prefixes,
  and expose resourceQueryKey for transport-specific cache consumers.
- Updated dependencies [f3caefe]
  - @schemastud/facets@0.2.1

## 0.2.0

### Minor Changes

- Export the shared resource transport and collection card renderers used by Beam's packaged console.

### Patch Changes

- Updated dependencies
- Updated dependencies
  - @schemastud/facets@0.2.0
  - @schemastud/ui@0.1.1
