# @schemastud/ui

## 0.2.0

### Minor Changes

- e9b5f62: Add the shared message runtime and explicit catalog collector. ui now peer-requires @schemastud/messages; hosts must install and dedupe one copy before upgrading. Publish messages before or with ui. MoneyFormat.locale is optional: explicit locale → message locale → en-US; currency remains explicit.
- c99033c: Read shared UI and frame copy through package catalogs on the one messages peer. Preserve caller copy overrides, standalone English and explicit money currency/locale. Add a Node-only AST display-copy ratchet with read-only comparison and a baseline that may only fall. Hosts install/dedupe the released messages peer; data-only host baselines are wired after train-end publication.

  Expand display-position coverage to logical children, object defaults, message parameters, formatting helpers and DOM copy; refuse stale baselines and run the read-only comparison in CI. Translate complete picker, status, trend and money sentences. DateCell deliberately uses en-US without a message provider rather than the browser locale.

### Patch Changes

- e4320b4: Accessibility (owner-review 18, P2-a11y): `DetailSwap` moves focus with the phone stack — `push` focuses the detail's `[data-swap-focus]` element or first heading (handing focus to it when a loading detail renders it), `back` focuses `focusOnBack` (the opener by identity), the marker, or the control the push left from; it never moves focus that is outside the pane or into a hidden pane, and `soft-cut` never moves focus (`manageFocus={false}` opts out). `SaveButton` is `aria-disabled` with a guarded click instead of natively `disabled`, so it keeps focus while saving and does not submit its form; `Button` carries `aria-disabled:` twins of its disabled look. `DataTable` puts `data-row-id` on each row's Open control.

## 0.1.2

### Patch Changes

- 8cbe626: `DataTable` gains an opt-in `stackOnMobile` prop: below the 768px breakpoint (`useIsMobile`) every row renders as a
  stacked card (first column the heading, an `actions` column the footer, the rest labelled fields), so a narrow screen
  never clips a row's status or actions. Loading, empty, row click, re-fetch dimming and pagination are unchanged. Rows
  are keyed by their own `id` when they have one (`stacked-row-<id>`). Promoted from beam-accounts' ResponsiveRoster. A stacked field is labelled by the column's `meta.label`, then a string header, then the column id, so a column with a component header (typed `ColumnMeta.label`) keeps its readable name.

## 0.1.1

### Patch Changes

- Export the shared StatTile primitive used by collection card renderers.
