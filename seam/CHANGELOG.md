# @schemastud/seam

## 0.2.1

### Patch Changes

- 0b2149e: Resolve the AJV entry point in native ESM and bundle its static draft-07 meta-schema. Packing now checks the built package directly in Node so SSR cannot inherit an import that only works through a bundler.
