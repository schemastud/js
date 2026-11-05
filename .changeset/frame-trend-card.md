---
'@schemastud/frame': minor
---

Add the `trend-card` card widget: a summary's figures drawn as a period series, with figures marked `forecast: true` drawn as a dashed segment from the last measured period. `SummaryFigure` gains an optional `forecast` field (absent or null reads as measured). Accessible as an image with a one-sentence title plus a visually hidden table of every period.
