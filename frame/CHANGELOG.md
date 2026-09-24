# @schemastud/frame

## 0.2.2

### Patch Changes

- 13d0a50: Render the rows of a `recent-list` whose target binds no `list-item` widget through a new
  `record-line` default (text · event/status badge · short time, never a bare id), and hide the
  list pager when the response is a single page.

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
