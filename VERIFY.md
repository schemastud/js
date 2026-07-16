# VERIFY — what's proven automatically, and the one live-browser step

`@schemastud/frame-remote` is the production-shape isolation substrate for rendering
untrusted remote components. The trust boundary is **execution-context isolation**
(a QuickJS-in-WASM realm on a separate origin), not API-guarding. This file states
exactly what the automated tests prove headlessly, and the exact browser steps for
the one property that genuinely needs two live origins.

## Automated (headless) — `npm run test`

Run in Node + jsdom with the **real** `quickjs-emscripten` WASM VM and the **real**
`@remote-dom/core` receiver. 50 tests across 9 files (the isolation set below plus the
RCP-03 vocabulary, RCP-04 off-repo SDK, RCP-05 capability, and RCP-06 manifest suites):

### `containment.test.ts` (4) — layer-1 isolation, in the real VM
- The guest self-probe, run **inside the QuickJS VM**, finds every browser ambient
  BLOCKED: `document`, `document.cookie`, `window`, `window.parent`, `localStorage`,
  `fetch`, `globalThis.fetch`, `XMLHttpRequest` — all `undefined`/throw.
- There is **no `fetch` capability injected by default**.
- The **only** injected globals are the frame bridge functions
  (`__frame_mutate`, `__frame_log`, `FrameRemote`, `__frame_dispatch`).
- The probe result also reconciles through the real remote-dom receiver into a host
  tree (proves the containment report survives the full render path).

### `escape.test.ts` (3) — realm separation defeats sandbox escape
- A guest doing `Object.prototype.polluted = …` / `Array.prototype.polluted = …` /
  `Function.prototype.call = …` pollutes only its **own** VM realm — the marker is
  set in-VM (proving it ran) but the **host realm's `Object.prototype` /
  `Array.prototype` / `Function.prototype.call` are untouched**.
- Two guests in separate VMs do not share pollution.

### `limits.test.ts` (5) — a runaway guest is bounded
- An **infinite loop** (`while(true){}`) is killed by the deadline interrupt
  (`GuestFailure` kind `interrupt`), returning control well before any host hang.
- An **unbounded allocation** hits the memory ceiling (`GuestFailure` kind `memory`,
  QuickJS "out of memory") — the host never OOMs.
- A well-behaved guest under the same limits runs to completion; the VM survives a
  killed guest and disposes cleanly.

### `fidelity.test.tsx` (3) — the spike's fidelity, no iframe
- The guest-emitted tree paints through the real remote-dom receiver into a real
  host React tree; the smuggled non-allowlisted `<script>` is **dropped**.
- A real **click** round-trips guest → host → guest (counter increments).
- A **controlled input** updates through the isolation boundary (`Hello, Ada`).

### `manifest.test.tsx` (15) — RCP-06 vocabulary versioning + capability permission
- A component whose manifest declares the **current major** + **in-tier capabilities**
  is **granted** and renders (`manifest-gated block` paints).
- A **mismatched major** (older or newer) is **shimmed** by default — a structured
  `vocabulary_major_mismatch` decision, and the guest tree is **NOT painted** (asserts
  no silent runtime break). With `allowShim: false` the same mismatch is a hard
  **refuse** — never a silent pass-through either way.
- An **over-asking** `untrusted_publisher` (requests `request_save`, a `first_party`-only
  capability) is **refused at load** with a clear reason naming the tier + capability —
  asserted **before any render and before any broker call** (the broker call log is
  empty). The load-time complement to the RCP-05 per-call broker check.
- Capability is checked **before** version — an over-ask on a mismatched major still
  refuses (trust first).
- The vocabulary version is **single-sourced**: `VOCABULARY_MAJOR` is derived from
  `VOCABULARY_VERSION`, and the **documented** major (README/VERIFY) is pinned to the
  code constant (drift guard, mirrors the `vocabulary-spec` single-source test).

## The vocabulary contract is semver'd (RCP-06)

`VOCABULARY_VERSION = "1.0.0"` → publishers target **major 1**. Same major = compatible
(minor/patch are additive only); different major = incompatible (refused-or-shimmed at
load). See the README "vocabulary contract" section. The one string to bump lives in
`src/host/version.ts`; the docs are pinned to it by a test.

## NOT headless-provable — the cross-site credentialed-fetch demonstration

A `fetch` from the guest's worker origin carrying **no first-party cookie** of the
host origin is a property of **two real origins in a browser**. Node cannot
demonstrate it (there is no cross-site cookie jar). The architecture already makes it
true — the worker is served from `SANDBOX_ORIGIN` (origin B), a different registrable
site than the host page (origin A), so any guest network request is cross-site — but
to *see* it, run the two-origin demo below.

> Note: for THIS ticket the substrate injects **no fetch capability** into the VM at
> all (proven above). The demo temporarily exposes a probe path to show that *even if*
> a fetch capability were injected, the request from origin B carries no origin-A
> cookie. This is the Stage-2 gap the PRD flagged, closed by demonstration.

### One-time host setup (Herd / any local TLS-or-plain proxy)

The two dev servers bind distinct `*.test` hosts:

- Host (origin A): `http://frame-remote.test:4173`
- Sandbox (origin B): `http://sandbox.frame-remote.test:4174`

Point both hostnames at loopback (they are **different registrable sites**, which is
what makes the boundary cross-site — not merely a different port):

```
# /etc/hosts
127.0.0.1 frame-remote.test
127.0.0.1 sandbox.frame-remote.test
```

(If you prefer HTTPS + real `SameSite`/`Secure` cookie semantics, `herd link` +
`herd secure` each host and set `VITE_SANDBOX_ORIGIN=https://sandbox.frame-remote.test`
+ the host server to https. Plain http over two distinct hosts is enough to show the
cookie is not attached.)

### Run the two servers

```
cd ~/Workspaces/js/packages/schemastud/frame-remote
npm run demo          # origin A — host page + /whoami endpoint, on :4173
npm run demo:sandbox  # origin B — the VM worker, on :4174   (second terminal)
```

### The demonstration

1. Open **origin A**: `http://frame-remote.test:4173`. The untrusted block (a
   thingsontv-styled counter + name input) paints in-context; clicks and typing
   round-trip through the VM. The smuggled `<script>` shows as blocked.
2. **Plant a first-party cookie on origin A.** In the origin-A devtools console:
   ```js
   document.cookie = 'sw_session=SUPER-SECRET; path=/';
   ```
   Confirm origin A sees it: `fetch('/whoami', {credentials:'include'}).then(r=>r.json()).then(console.log)`
   → `sawFirstPartyCookie: true`. (This is the *first-party* baseline.)
3. **Trigger the guest-origin fetch.** Open the **origin-B** page in a second tab
   (`http://sandbox.frame-remote.test:4174`) and, in ITS devtools console, fetch
   origin A's endpoint — this request's origin is B:
   ```js
   fetch('http://frame-remote.test:4173/whoami', { credentials: 'include' })
     .then(r => r.json()).then(console.log);
   ```
   This is the exact network shape the guest's worker has: it lives on origin B, so
   its `fetch` to origin A is cross-site. (The demo also stashes the live worker at
   `window.__frameWorker` on origin A if you want to drive the probe through the
   actual VM worker rather than the origin-B page console.)
4. **Observe server-side.** Watch the terminal running `npm run demo` (origin A). The
   `[origin A /whoami] cookie header = …` log line for the request that originated
   from **origin B** shows **an empty cookie header** — `sawFirstPartyCookie: false`
   in its JSON response — even though origin A's own request in step 2 carried the
   cookie. The browser did not attach origin A's `sw_session` to a request whose
   origin is B. That is the credentialed-fetch containment, demonstrated.

The contrast to capture side-by-side:
| request origin | `/whoami` cookie header | `sawFirstPartyCookie` |
|---|---|---|
| A (host page itself) | `sw_session=SUPER-SECRET` | `true` |
| B (sandbox worker) | *(empty)* | `false` |

Same endpoint, same cookie planted — the only difference is the requesting origin.
This is why the boundary must be a **separate origin**, and why a scoped token is
real here (the guest structurally cannot see origin A's session) rather than illusory
(as it would be same-origin).

## `SANDBOX_ORIGIN` — the single config point

`src/config.ts` exports `SANDBOX_ORIGIN` (env `FRAME_REMOTE_SANDBOX_ORIGIN`). It is
the one place the deployment points the worker at the real sandbox origin. The demo
host reads `VITE_SANDBOX_ORIGIN` (defaults to `http://sandbox.frame-remote.test:4174`).
