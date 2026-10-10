---
'@schemastud/ui': patch
---

`DataTable` gains an opt-in `stackOnMobile` prop: below the 768px breakpoint (`useIsMobile`) every row renders as a
stacked card (first column the heading, an `actions` column the footer, the rest labelled fields), so a narrow screen
never clips a row's status or actions. Loading, empty, row click, re-fetch dimming and pagination are unchanged. Rows
are keyed by their own `id` when they have one (`stacked-row-<id>`). Promoted from beam-accounts' ResponsiveRoster. A stacked field is labelled by the column's `meta.label`, then a string header, then the column id, so a column with a component header (typed `ColumnMeta.label`) keeps its readable name.
