# @schemastud/frame

## 0.3.0

### Minor Changes

- e03f2ae: Add the `trend-card` card widget: a summary's figures drawn as a period series, with figures marked `forecast: true` drawn as a dashed segment from the last measured period. `SummaryFigure` gains an optional `forecast` field (absent or null reads as measured). Accessible as an image with a one-sentence title plus a visually hidden table of every period.
- efccfa4: `ResourcePicker`: pick a resource kind (palette / rail / catalog) or records of one kind (server typeahead with "Browse all N", or the embedded ListShell with a pick column, tri-state header, selection bar, tray and confirm bar). Its selection is `{ mode: 'ids', ids }` or `{ mode: 'set', filter, sort, exclude, collection?, filterVariant? }`. It replaces `ResourceRefWidget`'s one-page select as the `x-stud-resource-ref` field widget, which keeps its value shapes: one id, or an id array for `multiple`. A selection object appears only when the field declares `select: 'set'`. `FrameProvider` now installs the widget into seam's `defaultRegistry` as well; `registerFrameWidgets` covers any other registry. A node with an explicit `x-widget` is never shadowed. New table hooks: `FrameColumn.headerControl` and `ShadcnTable` `rowSelected`.
- c99033c: Read shared UI and frame copy through package catalogs on the one messages peer. Preserve caller copy overrides, standalone English and explicit money currency/locale. Add a Node-only AST display-copy ratchet with read-only comparison and a baseline that may only fall. Hosts install/dedupe the released messages peer; data-only host baselines are wired after train-end publication.

  Expand display-position coverage to logical children, object defaults, message parameters, formatting helpers and DOM copy; refuse stale baselines and run the read-only comparison in CI. Translate complete picker, status, trend and money sentences. DateCell deliberately uses en-US without a message provider rather than the browser locale.

### Patch Changes

- 8b39c27: `SchemaView` now omits a field whose `detail` entry says `participates: false`, matching what `list-column` already does. A field with no entry keeps the read-only fallback, and `list-item` is unchanged.
- 229af9a: The default list cell shows an enum value by its label (frame-foundation 76). **Interface addition:** `FrameColumn` gains an optional `enumLabels?: Readonly<Record<string, string>>`, a value-to-label map keyed by `String(value)`. It is additive, so no host changes. `resolveColumns` sets it from a scalar enum node of the list schema whose `enumNames` is an array as long as its `enum` (ticket 44's rule, as seam's `liftEnumNames` applies it to the form). The node may be inline, behind a local `$ref` or in a nullable `anyOf`, the shapes the PHP schema generator emits. The map is set only on a column with no `cell`, host or declared, and a host column's own `enumLabels` wins over the schema's. `DefaultCell` renders the label, and `ShadcnCell` renders a labelled value's label first, then keeps its empty and boolean handling. A value outside the map renders raw, and a column's own `cell` still wins.
- 438a5d3: The `link` list-column kind now draws as a link: its anchor, the default one or the host's `renderLink`, takes the
  card links' `text-primary hover:underline` class. It also links only a site-relative href, an `http:` / `https:` URL,
  or a protocol-relative `//host` / `/\host`, judged after trimming and dropping the tab and newline characters browsers
  ignore; any other href (`javascript:`, `data:`, `vbscript:`, any other scheme, a bare relative path) renders as `text`.
- ebedd3c: A `link` list-column kind draws a cell as a link to a row field (frame-foundation 77). **New kind:** `link`, registered for `list-column` beside `text`, `badge`, `badges`, `number` and `date`, with one option `hrefKey` naming a ROW field. The cell text is the column's own value, rendered exactly as the `text` kind renders it (its `text` options apply). A site-relative href (one leading `/`) draws through the kit's `renderLink`, the router link the cards already take, so it opens in-app; with no `renderLink` it is a plain anchor. An absolute href, `//host` included, is a plain anchor. A null, absent or empty href, or an empty value, renders exactly as `text`. **Interface addition, the row reaching a kind cell:** a list cell's RJSF registry now carries `formContext: { row }`, so every `list-column` kind, frame's or a host's, can read the whole row as `props.registry.formContext.row`. It is additive: no option, no `widgetProps` or seam change. The one new export is `type LinkCellOptions` (the `link` kind's wire options, `hrefKey` over the `text` options) from `@schemastud/frame/wire`, beside the other cell option types; the main barrel is unchanged. `createFrameRegistry` registers `link` with the kit's `renderLink` after frame's built-ins and before the host's `widgets`, so a host that registers `link` for `list-column` still replaces frame's.
- 8852ccd: Widen the `@schemastud/messages` devDependency range from `^0.1.0` to `>=0.1.0 <1`, the shape these packages' messages
  peer already has (frame-foundation 81). A messages minor such as 0.2.1 then stays inside every sibling's range, so the
  workspace installs at its release commit instead of fetching messages from the registry.

  Also widen chat's optional `@schemastud/blockdoc` peer to `^0.1.0 || ^0.2.0 || ^0.3.0`: blockdoc's release line is at 0.3.0, and
  chat imports nothing from blockdoc (a comment and a bundler external only), so every released blockdoc minor works with it.

- Updated dependencies [8852ccd]
- Updated dependencies [e9b5f62]
- Updated dependencies [e4320b4]
- Updated dependencies [6f5a3a4]
- Updated dependencies [77daa17]
- Updated dependencies [9f95824]
- Updated dependencies [c99033c]
  - @schemastud/facets@0.3.0
  - @schemastud/seam@0.3.0
  - @schemastud/ui@0.2.0

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
