# @schemastud/seam

## 0.3.0

### Minor Changes

- 9f95824: Read form copy through the shared messages peer. Hosts install and dedupe @schemastud/messages; caller copy overrides and provider-free English remain supported.

  Expose useFormValidator(options?) for provider-aware custom AJV options. Mounted forms and standalone registries follow copy changes without remounting, while provider-free validation preserves original English.

### Patch Changes

- 77daa17: Add the required @schemastud/messages >=0.1.0 <1 peer and ./messages catalog exports
  to the remaining packages. Hosts must install and dedupe the shared messages
  runtime/context. Preserve caller-copy overrides and translate mounted surfaces.

  Chat's public formatMessageTime, default message timestamps and mainframe Clock
  deliberately use en-US without a MessageProvider, rather than the runtime locale.
  For example, a de_DE runtime's 15:04 now renders as 3:04 PM without a provider;
  mount a provider with the desired locale to retain locale-specific formatting.

  Blockdoc requires @schemastud/seam ^0.3.0 for useFormValidator. The existing
  seam-messages.md minor advances seam 0.2.2 to 0.3.0 under the owner's corrected
  0.x release policy. Its development-only file:../seam link tests the unreleased
  workspace source. The peer range follows the computed train-end release.

  The standalone, non-workspace @schemastud/big-calendar requires a separate minor
  release from 0.1.0 to 0.2.0 at train end (package and own lock metadata), before
  publication. It gains the same required peer/catalog export and lazily loads
  non-English date data. This changeset cannot version a non-workspace package.

## 0.2.2

### Patch Changes

- a179834: Release `displayLabel` and `humanizeKey` (the one rendered-label rule, af0b720), which `@schemastud/frame`,
  `@splicewire/beam-accounts` and `@splicewire/tower-ux` already import.

## 0.2.1

### Patch Changes

- 0b2149e: Resolve the AJV entry point in native ESM and bundle its static draft-07 meta-schema. Packing now checks the built package directly in Node so SSR cannot inherit an import that only works through a bundler.
