# @schemastud/facets

## 0.2.1

### Patch Changes

- f3caefe: Isolate resource reads, cached placeholders and pending mutations by injected transport.
  Prevent delayed saved-view application from crossing providers, retain existing query prefixes,
  and expose resourceQueryKey for transport-specific cache consumers.

## 0.2.0

### Minor Changes

- Expose resource filter variants and honor saved-view mutation permissions.
