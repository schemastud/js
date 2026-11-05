---
'@schemastud/frame': minor
---

`ResourcePicker`: pick a resource kind (palette / rail / catalog) or records of one kind (server typeahead with "Browse all N", or the embedded ListShell with a pick column, tri-state header, selection bar, tray and confirm bar). Its selection is `{ mode: 'ids', ids }` or `{ mode: 'set', filter, sort, exclude, collection?, filterVariant? }`. It replaces `ResourceRefWidget`'s one-page select as the `x-stud-resource-ref` field widget, which keeps its value shapes: one id, or an id array for `multiple`. A selection object appears only when the field declares `select: 'set'`. `FrameProvider` now installs the widget into seam's `defaultRegistry` as well; `registerFrameWidgets` covers any other registry. A node with an explicit `x-widget` is never shadowed. New table hooks: `FrameColumn.headerControl` and `ShadcnTable` `rowSelected`.
