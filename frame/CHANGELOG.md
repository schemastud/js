# @schemastud/frame

## 0.3.0

### Minor Changes

- Typed list results, cursor pages, resource summaries and typed creation. **Breaking for custom transports and slots:**

  - `FrameTransport` gains required `summary(resource, params)` and `create(resource, data)`; `list` returns
    `ResourcePage<Result>` (offset or cursor) instead of `Paginated<Row>`; `save` now takes a non-null id (creation goes
    through `create`). `FrameCrudTransport` picks `create` too.
  - `useResourceList` resolves a `ResourcePage<Row>`; `parseResourcePage`, `ResourcePage` and `CursorPaginated` are exported.
  - `PaginationSlotProps` is a union discriminated by `mode: 'offset' | 'cursor'`; cursor mode carries
    `hasNext`/`hasPrevious`/`isFirst` and `onNext`/`onPrevious`/`onFirst`.
  - `SaveBarSlotProps` requires `canSubmit` (validated edits); declared filters drive the list through facets.
  - `FrameActionError` and `useBrowserUrlState` (from facets) are exported from the root.

### Patch Changes

- 13d0a50: Render the rows of a `recent-list` whose target binds no `list-item` widget through a new
  `record-line` default (text · event/status badge · short time, never a bare id), and hide the
  list pager when the response is a single page.
- Updated dependencies
  - @schemastud/facets@0.2.2

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
