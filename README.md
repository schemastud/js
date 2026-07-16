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
  interrupt + memory/stack limits, and runs the untrusted source. The in-VM SDK
  (`GUEST_RUNTIME_SOURCE`) is what a publisher authors against: `FrameRemote.h`,
  `FrameRemote.render`.
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

## Scripts

- `npm run build` — tsup (esm + dts), entries `.`, `./guest`, `./host`
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

RCP-01 substrate. Not yet published. Downstream: RCP-02+ add the guest SDK publish,
the capability API + scoped-token mint, and the first consumer (a thingsontv block
in the splicewire-app editor).
