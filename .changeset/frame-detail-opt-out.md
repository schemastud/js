---
'@schemastud/frame': patch
---

`SchemaView` now omits a field whose `detail` entry says `participates: false`, matching what `list-column` already does. A field with no entry keeps the read-only fallback, and `list-item` is unchanged.
