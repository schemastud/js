# @schemastud/big-calendar

The **source-blind, vocab-blind foundation calendar surface** — a dumb `BigCalendarSurface`
renderer that wraps [react-big-calendar](https://github.com/jquense/react-big-calendar) and
is driven entirely by injection. It renders whatever `FoundationCalendarEvent[]` it is handed,
emits generic intents, and delegates all vocabulary + host chrome + transport to four
injection kinds. It never learns that "calendar" / "composition" / "channel" exist.

Part of the **big-calendar-surface** build (PRD §1/§3/§7). The vocab-aware layer lives one
tier up in `@splicewire/beam-calendar` (the satellite twin), which maps the app's projection
DTO into `FoundationCalendarEvent` and mounts this twice (aggregate + single).

## The four injection kinds

Everything host-specific is injected through `<BigCalendarProvider services={…}>`; only
`client` is required, and every other kind has a dependency-free default:

| Kind | Purpose | Default |
|---|---|---|
| `client` (required) | transport — `listEvents` / `reAnchor` / `createRelease` / `editCell` / `materialize` / `override` | — |
| `notify` / `onError` | feedback; `notify.action` carries a host-side undo callback | `console.debug` / `console.error` |
| `renderEditPanel` / `renderEventBadge` / `renderFilters` / `renderLaneHeader` | host chrome slots | minimal popover / plain title bar / none / raw `laneId` |
| `subscribe` | real-time; returns an unsubscribe fn | no-op |

## Interaction (residence is the switch)

Month + all-day only — no hour time-grid. Resident drag re-anchors (optimistic + host-side
undo); a non-resident gesture routes to the reference-mode edit panel (gated
materialize/override); an empty-cell click creates. Resize is off. The interaction contract
is exported as pure functions (`planEventDrop`, `planEventSelect`, `reAnchorEvent`).

## Peers & the vendor seam

`react-big-calendar` (`>=1.19`) + `date-fns` (`>=3`) + `@tanstack/react-query` (`>=5`) +
`react` are **host-provided peers**. The only vendored-and-owned artifacts are `theme.css`
(a retokenized RBC skin over host `--rbc-*` vars) and the thin `Calendar` re-export — nothing
else imports RBC internals.

```ts
import '@schemastud/big-calendar/theme.css'; // + react-big-calendar/lib/css/react-big-calendar.css
import { BigCalendarProvider, BigCalendarSurface } from '@schemastud/big-calendar';
```

## Verification bars

- **§8a runtime:** `npm test` — the surface mounts off a pure `FoundationCalendarEvent[]`
  fixture (no Laravel); residence-gated interaction is asserted.
- **§8b static:** `npm run lint:imports` (deny-list) + `npm run typecheck`.
