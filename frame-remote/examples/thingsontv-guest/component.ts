/**
 * The thingsontv guest block — the FIRST CONSUMER (RCP-07).
 *
 * This file stands in for a block a satellite (thingsontv) authored as an UNTRUSTED
 * PUBLISHER and shipped to the splicewire-app blockdoc editor for polishing. It is
 * authored against ONLY the published guest SDK (`@schemastud/frame-remote/sdk`),
 * exactly as a real external publisher would — the fixture builder `file:`-installs the
 * package into a temp dir, so this specifier resolves through the package `exports` map
 * to `dist/sdk.js`, NEVER a `../src` relative import. The bytes originating from a
 * checked-in fixture rather than the thingsontv repo does not change the trust boundary:
 * the host assigns the tier, the VM isolates the realm, the broker mediates every read.
 *
 * What it proves, in the real consumer:
 *   1. INTERACTIVITY — a click round-trips by handler id through the isolated VM (the
 *      counter increments; the function never crosses the wire).
 *   2. BROKERED DATA ONLY — the "Resolve fact" button reaches host data by calling
 *      `capability('resolve', { id })` (a `$ref`/`@id`), never a raw `fetch`. The SDK
 *      exposes no `fetch`/`window`/`document`/credential — a raw network call is
 *      unspellable here. The resolved fact is painted into the host tree.
 *   3. DEGRADES ON REFUSAL — a resolve outside the token's frozen scope comes back
 *      `{ ok: false, reason }` and is shown as a refusal, not a crash.
 *
 * The block declares its `manifest` (below) at `untrusted_publisher` tier requesting
 * only `resolve` + `read_scoped`. The host reads that manifest as DATA and gates the
 * load (RCP-06) before any of this code runs.
 */
import { h, render, capability } from '@schemastud/frame-remote/sdk';

/**
 * The block's MANIFEST (RCP-06) travels alongside this bundle as DATA the host reads
 * BEFORE mounting the guest — never inside the executed bundle. It lives in the sibling
 * `manifest.ts`; see it for the declared `untrusted_publisher` tier + `resolve`/`read_scoped`
 * request. Keeping it out of `component.ts` is deliberate: the guest bundle is loaded into
 * a QuickJS SCRIPT realm (no ES module semantics), so a top-level `export` would be a load
 * error — and, more to the point, the host must be able to read the manifest as data
 * without ever evaluating the guest.
 */

/**
 * The `@id` this block resolves through the broker. In the seeded demo this is the
 * in-scope fragment's `node_id` ("Cold Holding"); the host injects it as an in-VM global
 * BEFORE loading this bundle (`globalThis.__THINGSONTV_REF__`) — a plain serializable
 * value, NOT a capability. Read off `globalThis` (a runtime member access, so no bundler
 * constant-folds it) with a literal fallback so the bundle is self-contained.
 */
const REF_KEY = '__THINGSONTV_REF__';
const injectedRef = (globalThis as Record<string, unknown>)[REF_KEY];
// Fallback matches the splicewire-app RCP-07 seeder's deterministic in-scope node_id
// (BlockdocRemoteComponentDemoSeeder::IN_SCOPE_NODE_ID), so the block resolves the seeded
// fact even when the host injects no ref.
const factRef: string = typeof injectedRef === 'string' ? injectedRef : 'nod_rcp07coldholdingfact0000';

let count = 0;
let factLine = 'No fact resolved yet — click "Resolve fact".';

function view() {
    return h('Card', {}, [
        h('Stack', { gap: 10 }, [
            h('Badge', { text: 'thingsontv · untrusted publisher · brokered reads only' }),
            h('Heading', { text: 'Cooling-safety fact card' }),
            h('Text', {
                text: `A block another app authored, rendered in-context. Clicked ${count}x.`,
            }),
            h('Button', {
                text: `Increment (${count})`,
                onClick: () => {
                    count += 1;
                    render(view());
                },
            }),
            h('Text', { text: factLine }),
            h('Button', {
                text: 'Resolve fact (brokered $ref)',
                onClick: () => {
                    // The ONLY path to host data: a brokered capability. No fetch, no
                    // credential, no host DOM — the SDK cannot even name them. A refusal
                    // comes back as data, so the block degrades instead of crashing.
                    const result = capability<{ '@id'?: string; name?: string }>('resolve', {
                        id: factRef,
                    });
                    if (result.ok && result.data) {
                        factLine = `Resolved: ${result.data.name ?? result.data['@id'] ?? '(unnamed)'}`;
                    } else {
                        factLine = `Resolve refused: ${result.reason ?? 'unknown'}`;
                    }
                    render(view());
                },
            }),
        ]),
    ]);
}

render(view());
