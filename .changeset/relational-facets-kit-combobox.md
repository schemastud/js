---
"@schemastud/combobox": minor
"@schemastud/facets": minor
"@schemastud/breadcrumb": patch
---

Relational facets use the kit combobox (owner-review-20261112 06).

`@schemastud/combobox` exports `ComboboxList`, the combobox without its popover: an input over a listbox, a debounced
search (stale answers dropped), arrows / Enter / Escape, and the ARIA combobox pattern (`role="combobox"`,
`aria-activedescendant`, `aria-multiselectable`). `Combobox` is now a popover around it and gains `multiple` (stays open
after a pick); `currentValue` also takes a list. The package gains a test script.

`@schemastud/facets`' `MultiSelectFilter` renders `ComboboxList` inline for single and multiple relational and declared
filters, keeping its chips and URL value: one Options Source request per typing pause (through the query cache's
`filter-options` key), keyboard picking, `multiselect` toggles and stays open, `select` replaces and closes, no blur
timer. A preselected value reads as its label from the source's first page. **New peer: `@schemastud/combobox` `^0.2.0`.**

`@schemastud/breadcrumb` accepts `@schemastud/combobox` `^0.1.0 || ^0.2.0`.
