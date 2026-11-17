---
'@schemastud/nav': minor
---

`ExpandableNav` takes an optional `groupLabel?: (group: string) => string` that maps a group key to its heading text, defaulting to the raw key (mirrors `trackLabel`). Only the heading changes: the persisted open/closed key, the panel id behind `aria-controls` and the React key stay on the raw group key, so a translated heading keeps each reader's saved rail state across locales. Without the prop the output is unchanged.
