# @schemastud/mainframe

The **generic Mainframe engine** — React-only, host-agnostic. The frame that hosts realm/CMS/OS
surfaces without knowing what they are.

Relocated here out of `@splicewire/beam-mainframe` (Frame OS **ADR-0011**, ticket 01) so any host
composes the frame with **no CMS and no beam dependency**. `@splicewire/beam-mainframe` re-exports
these primitives, so existing consumers are unchanged until they migrate their import sites
(ticket 02).

## What ships here (the generic seam)

- **The slot contract** (`contract.ts`) — the frozen `CORE_SLOTS`/`OPTIONAL_SLOTS`, fill-types, zones.
  Changing the core set or a core slot's fill-type is a contract break; adding an optional/custom slot
  is not.
- **`createSlotRegistry`** — an SSR-safe, append-only, per-scope bag of slot contributions.
- **`createMainframeRegistry`** — `register(mode, Mainframe)`; a Mainframe is a
  `({ slots, ctx }) => ReactNode` that owns *placement*.
- **`resolveSlots`** — collects raw contributions into `ResolvedSlots`, applying the two orthogonal
  axes: entitlement (`can`, drops contributions) and placement ordering (`(zone, order, index)`).
- **The React seam** (`react.tsx`) — `MainframeProvider` / `MainframeOutlet` / `useSlot` +
  hooks: a child-swap-under-a-stable-host delegation that preserves state across mode switches.

## What does NOT ship here

The **CMS-authoring layer** stays in `@splicewire/beam-mainframe`: `createMainframeHost`, the
`domain`/`window` modes, `useBeamUxEntry`, `isPuckBody`, edit-affordance contributions. The Frame OS
`os` mode + window manager (tickets 03–04) are added to this package on top of the seam.

## The geometry atom

This package declares `react-rnd` (MIT) as a dependency — the invisible geometry atom for the Frame OS
window frame (ticket 03). It is imported **only** at the window-frame component; the reducer, registry,
and realm-derivation stay import-free (guarded), keeping the geometry wheel swappable.
