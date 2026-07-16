# @schemastud/frame-remote

Production-shape **isolation substrate** for rendering untrusted remote components
in-context inside a first-party surface — without handing the publisher your origin,
session, or credentials.

The trust boundary is **execution-context isolation, not API-guarding.** Untrusted
guest code runs inside a **QuickJS-in-WASM** realm (no ambient browser globals),
hosted in a **Worker served from a separate origin**, and emits a real
[`@remote-dom/core`](https://github.com/Shopify/remote-dom) mutation stream. The
trusted host reconciles that stream and paints from a **host-owned allowlist** of
components. The guest can only *name* allowlisted types; anything else is dropped.

This is RCP-01 of the remote-component-portability seam. See `VERIFY.md` for exactly
what the automated tests prove and the one live-browser step (cross-site
credentialed fetch).

## The architecture

```
 UNTRUSTED GUEST                 ISOLATION                     TRUSTED HOST
 (publisher source)                                            (first-party page)

 FrameRemote.h(...)  ─┐   ┌─ QuickJS VM (WASM realm) ─┐   ┌─ RemoteReceiver ─┐
 FrameRemote.render() │   │  · no document/window/    │   │  (@remote-dom)   │
                      ├──▶│    cookie/localStorage/    │──▶│  reconciles the  │
 handlers (by id) ◀───┘   │    fetch                   │   │  mutation stream │
                          │  · deadline + memory caps  │   │                  │
                          │  Worker @ SEPARATE ORIGIN  │   └── allowlist ─────┘
                          └────────────────────────────┘       paints React
        events flow back by handler id ── never a function across the wire
```

- **Guest VM** (`src/guest/`): `GuestVm` instantiates a `quickjs-emscripten`
  context, injects ONLY a `__frame_mutate` bridge (no fetch), sets a deadline
  interrupt + memory/stack limits, and runs the untrusted source. The in-VM runtime
  (`GUEST_RUNTIME_SOURCE`) installs the `FrameRemote.h` / `FrameRemote.render` bridge
  the guest authors against.
- **Guest authoring SDK** (`src/guest/sdk.ts`, published as
  `@schemastud/frame-remote/sdk`): the typed surface a remote publisher authors a
  component against **off-repo**. Same `h`/`text`/`render` shape as an in-repo guest,
  but typed against the vocabulary (autocomplete on allowlisted block props; a compile
  error on a type or prop the host does not own). Host-free by construction — it names
  no `window`/`document`/`fetch`/receiver, only the in-VM `FrameRemote` bridge — so a
  bundle built against it loads straight through the VM. See
  `examples/off-repo-guest/`.
- **Host receiver** (`src/host/`): `HostReceiver` wraps a real `@remote-dom/core`
  `RemoteReceiver`; `RemoteSurface` (React) subscribes and paints the reconciled
  tree from `DEFAULT_ALLOWLIST`, dropping non-allowlisted types.
- **Bridge** (`src/bridge.ts`): `RemoteComponentBridge` wires a VM to a receiver for
  the in-process case (tests). The demo splits the same two halves across the
  separate-origin Worker boundary.

## Usage (in-process bridge)

```ts
import { RemoteComponentBridge, RemoteSurface } from '@schemastud/frame-remote';

const bridge = await RemoteComponentBridge.create({ limits: { deadlineMs: 1000 } });
bridge.load(untrustedPublisherSource);

// React:
<RemoteSurface host={bridge.host} />
```

For the real deployment, host the VM in a Worker served from `SANDBOX_ORIGIN`
(`src/config.ts`) and relay the `mutate`/`event` messages (see `demo/`).

## Authoring a remote component (the published SDK)

A remote publisher installs the package and authors against `@schemastud/frame-remote/sdk` —
the same shape as an in-repo guest, but typed against the host vocabulary:

```ts
import { h, render } from '@schemastud/frame-remote/sdk';

let count = 0;
const view = () =>
    h('Card', {}, [
        h('Heading', { text: 'A remote block' }),
        h('Button', {
            text: `Clicked ${count}`,
            onClick: () => {
                count += 1;
                render(view());
            },
        }),
        // h('Marquee', ...)  // ← compile error: not an allowlisted block type
    ]);
render(view());
```

Build it (any bundler, esm) and load the bundle through the VM (`bridge.load(source)`).
The SDK names no `window`/`document`/`fetch`/receiver — only the in-VM `FrameRemote`
bridge — so the bundle is host-free. `examples/off-repo-guest/` builds exactly this
against the package's published `exports` (a `file:` install, not a relative import)
and renders it through the host receiver; `tests/off-repo-sdk.test.tsx` asserts it.

## The vocabulary contract (semver) + the component manifest (RCP-06)

The block vocabulary is a **versioned contract**. A publisher targets a stable **major**
and is guaranteed forward-compatibility across every minor/patch the host ships under it.

- **Current vocabulary version:** `VOCABULARY_VERSION = "1.0.0"` → **major `1`.** Publishers
  target **major 1**. (`VOCABULARY_MAJOR` is derived from this one string — the single
  source of truth, pinned by `tests/manifest.test.tsx`.)
- **Compatibility rule — gate on the MAJOR only:**
  - **same major = compatible.** Minor/patch bumps are **additive only** (a new block, a
    new optional prop, a new capability the host offers). A component built for `1.0` still
    renders on host `1.7`.
  - **different major = incompatible.** A major bump is the only place a block may be
    removed/renamed or a prop's meaning may change — so a wrong-major component is never
    painted as-is.

A remote component ships a small **manifest** the host reads **before render**:

```ts
import type { ComponentManifest } from '@schemastud/frame-remote/sdk';

export const manifest: ComponentManifest = {
    vocabularyMajor: 1,                        // the major this component was built against
    capabilities: ['resolve', 'read_scoped'],  // the brokered capabilities it will call
};
```

The host runs the load gate on that **data**, before any guest code executes:

```ts
import { readManifest, evaluateManifest } from '@schemastud/frame-remote';

const parsed = readManifest(rawManifest);          // strict: malformed = refused, not "assumed compatible"
if (!parsed.ok) return refuse(parsed.reason);

const decision = evaluateManifest(parsed.manifest, {
    tier: hostAssignedTier,   // 'first_party' | 'untrusted_publisher' — the HOST decides, not the manifest
    allowShim: true,          // version mismatch → shim (default) vs hard refuse
});
// decision.kind: 'grant' → mount the guest; 'shim' → paint a host-owned placeholder;
//                'refuse' → render nothing, decision.reason / decision.message say why.
```

**Two enforcement axes, decided before render (never a silent runtime break):**

1. **Version compatibility.** Declared major ≠ host major → **shim by default** (a
   host-owned "built for vocabulary vX, host is vY" placeholder instead of the guest tree),
   or **refuse** if `allowShim: false`. A compatibility gap is surfaced, never swallowed.
2. **Capability permission at load.** The manifest's capabilities are checked against the
   host-assigned **tier** (`TIER_CAPABILITIES`: `first_party` = resolve + read + save;
   `untrusted_publisher` = resolve + read). An over-ask (e.g. an `untrusted_publisher`
   requesting `request_save`) is **refused at load with a clear reason — before the guest
   mounts and before the broker is ever called.** This is the load-time complement to the
   RCP-05 broker's per-call refusal: the same trust boundary enforced at two moments
   (defense in depth). Capability is checked **first** — a trust violation short-circuits
   before any compatibility consideration.

## Scripts

- `npm run build` — tsup (esm + dts), entries `.`, `./guest`, `./sdk`, `./host`
- `npm run test` — vitest (real QuickJS WASM + real remote-dom)
- `npm run typecheck` — `tsc --noEmit`
- `npm run demo` / `npm run demo:sandbox` — the two-origin browser harness

## Real dependencies

- `@remote-dom/core@^1.11.1` — host `RemoteReceiver` + the low-level
  `RemoteConnection.mutate([...records])` protocol the guest drives from inside the
  VM (no DOM / custom-elements path needed).
- `quickjs-emscripten@^0.32.0` — QuickJS compiled to WASM; `getQuickJS()` →
  `newRuntime()` → `newContext()`, bounded by `setInterruptHandler`
  (`shouldInterruptAfterDeadline`), `setMemoryLimit`, `setMaxStackSize`.

## Status

RCP-01 substrate + RCP-04 published guest authoring SDK (`@schemastud/frame-remote/sdk`)
+ RCP-05 brokered capability surface + RCP-06 vocabulary versioning + capability-permission
manifest gate (semver'd vocabulary contract, major **1**; load-time refuse/shim/grant).
Not yet published to npm (the `npm publish` under the ticket-02 name is user-gated).
Downstream: the first consumer (a thingsontv block in the splicewire-app editor).
