---
'@schemastud/frame': patch
---

The default list cell shows an enum value by its label (frame-foundation 76). **Interface addition:** `FrameColumn` gains an optional `enumLabels?: Readonly<Record<string, string>>`, a value-to-label map keyed by `String(value)`. It is additive, so no host changes. `resolveColumns` sets it from a scalar enum node of the list schema whose `enumNames` is an array as long as its `enum` (ticket 44's rule, as seam's `liftEnumNames` applies it to the form). The node may be inline, behind a local `$ref` or in a nullable `anyOf`, the shapes the PHP schema generator emits. The map is set only on a column with no `cell`, host or declared, and a host column's own `enumLabels` wins over the schema's. `DefaultCell` renders the label, and `ShadcnCell` renders a labelled value's label first, then keeps its empty and boolean handling. A value outside the map renders raw, and a column's own `cell` still wins.
