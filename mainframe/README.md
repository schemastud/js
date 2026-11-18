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

## The mode registry

`createMainframeRegistry()` (`src/mainframe-registry.ts`) binds a mode name to the Mainframe that places its
slots. Each call makes its own registry, so each provider scope has its own. It is a
[`@schemastud/registry`](../registry/README.md) registry rooted at `mainframe.modes`.

**Duplicate policy: `Supersede`, declared.** Registering a mode that is already registered replaces it. The
later registration wins and keeps the earlier one's place in `modes()` and `all()`. Nothing throws and nothing
warns. That is what the registry did as a plain map; what is new is that the policy is declared and the
displaced registration is recorded, so a caller that wants to warn on a re-registration can read it and call
`devWarn` itself.

```ts
const mainframes = createMainframeRegistry();

mainframes.register('desk', DeskMainframe, undefined, '@splicewire/beam-ux');
mainframes.register('desk', HostDesk, undefined, 'app/host'); // replaces, in place

mainframes.get('desk')?.component;       // HostDesk
mainframes.modeRegistrant?.('desk');     // 'app/host'
mainframes.supersededModes?.('desk');    // [{ registration: { mode: 'desk', component: DeskMainframe, … }, by: '@splicewire/beam-ux', supersededBy: 'app/host' }]
```

- **The registrant is optional.** The fourth argument of `register` names who is registering, such as a
  package name. Left out, the registrant reads back as `null`.
- **Reading it back.** `modeRegistrant(mode)` and `supersededModes(mode)` are optional members of
  `MainframeRegistry`, so a hand-written registry or a test double still satisfies the type. A registry from
  `createMainframeRegistry()` always has them. `SupersededMainframe` is exported from the module, not the
  package root.
- **A miss is `undefined`.** A mode nothing is registered under answers `undefined` from `get`, and so does a
  name that only prefixes registered names (`os`, with `os.window` registered). `MainframeOutlet` relies on it
  to dev-warn and render nothing. A name that is not a string misses too.
- **Any string is a mode name.** `Desk`, `a/b`, `os.window`, the empty string and a name beginning with
  `mainframe.modes` register and resolve as they did in a map. Names are compared exactly: no case folding, no
  trimming. A name that is not a string is registered under its string form (`5` and `'5'` are one mode, where
  a map kept two); the registration keeps the mode as given.

**Who relied on replacing.** Before the policy was declared, callers were searched for a mode registered twice
in one registry (2026-11-18).

- The search: files naming `createMainframeRegistry` or `MainframeRegistry` (`git grep -l` over every tracked
  file of this repository; `grep -rlE` over the `src` of the 18 `beam-*` packages of the beam JS workspace, of
  `splicewire/tower-ux` and of the flagship's `ui`), then every `.register(` call in them, and every caller of
  `registerOsMode`. A second search for `createMainframeRegistry` under all of `~/Workspaces/js/packages` found
  only worktree copies of the same beam packages.
- No call site registers a mode twice in one registry. Every caller makes a fresh registry and registers each
  mode once: `beam-ux` (`desk`, `window`, `focus`; `surface`), `beam-mainframe` (`domain`, `window`; the story
  harness's one `mode` per memo), `beam-inertia` (`surface`), the flagship's one gate test (`desk`), and this
  package's `buildDesktopChrome` and tests. `tower-ux` names neither.
- `registerOsMode` documents re-registering as replacing ("last-wins"). Nothing calls it twice on one
  registry, and `Supersede` keeps that promise.
- No test, here or in those repositories, registered a mode twice before `src/__tests__/mode-registry.test.ts`
  was written to pin the policy.
- What the zero means: no call site, as written, depends on replacement. It does not show that no host does.
  The search reads calls on a registry from those files, so a registry passed elsewhere under another name, and
  any host outside the searched roots, is not covered. `Supersede` is declared because it is what the registry
  already did and a host replacing a package's mode is an override, not because the search found nobody.

## What does NOT ship here

The **CMS-authoring layer** stays in `@splicewire/beam-mainframe`: `createMainframeHost`, the
`domain`/`window` modes, `useBeamUxEntry`, `isPuckBody`, edit-affordance contributions. The Frame OS
`os` mode + window manager (tickets 03–04) are added to this package on top of the seam.

## The geometry atom

This package declares `react-rnd` (MIT) as a dependency — the invisible geometry atom for the Frame OS
window frame (ticket 03). It is imported **only** at the window-frame component; the reducer, registry,
and realm-derivation stay import-free (guarded), keeping the geometry wheel swappable.
