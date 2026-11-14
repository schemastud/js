# @schemastud/breadcrumb

## 0.2.0

### Minor Changes

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

### Patch Changes

- 6f5a3a4: Relational facets use the kit combobox (owner-review-20261112 06).

  `@schemastud/combobox` exports `ComboboxList`, the combobox without its popover: an input over a listbox, a debounced
  search (stale answers dropped), arrows / Enter / Escape, and the ARIA combobox pattern (`role="combobox"`,
  `aria-activedescendant`, `aria-multiselectable`). `Combobox` is now a popover around it and gains `multiple` (stays open
  after a pick); `currentValue` also takes a list. The package gains a test script.

  `@schemastud/facets`' `MultiSelectFilter` renders `ComboboxList` inline for single and multiple relational and declared
  filters, keeping its chips and URL value: one Options Source request per typing pause (through the query cache's
  `filter-options` key), keyboard picking, `multiselect` toggles and stays open, `select` replaces and closes, no blur
  timer. A preselected value reads as its label from the source's first page. **New peer: `@schemastud/combobox` `^0.2.0`.**

  `@schemastud/breadcrumb` accepts `@schemastud/combobox` `^0.1.0 || ^0.2.0`.
