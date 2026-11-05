---
'@schemastud/ui': patch
---

Accessibility (owner-review 18, P2-a11y): `DetailSwap` moves focus with the phone stack — `push` focuses the detail's `[data-swap-focus]` element or first heading (handing focus to it when a loading detail renders it), `back` focuses `focusOnBack` (the opener by identity), the marker, or the control the push left from; it never moves focus that is outside the pane or into a hidden pane, and `soft-cut` never moves focus (`manageFocus={false}` opts out). `SaveButton` is `aria-disabled` with a guarded click instead of natively `disabled`, so it keeps focus while saving and does not submit its form; `Button` carries `aria-disabled:` twins of its disabled look. `DataTable` puts `data-row-id` on each row's Open control.
