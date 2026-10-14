# @schemastud/seam

## 0.2.2

### Patch Changes

- a179834: Release `displayLabel` and `humanizeKey` (the one rendered-label rule, af0b720), which `@schemastud/frame`,
  `@splicewire/beam-accounts` and `@splicewire/tower-ux` already import.

## 0.2.1

### Patch Changes

- 0b2149e: Resolve the AJV entry point in native ESM and bundle its static draft-07 meta-schema. Packing now checks the built package directly in Node so SSR cannot inherit an import that only works through a bundler.
