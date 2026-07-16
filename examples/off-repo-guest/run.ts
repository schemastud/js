/**
 * Runnable demo of the off-repo authoring path (outside the test suite).
 *
 *   npm run build                         # produce dist/ (the SDK the example installs)
 *   npx vite-node examples/off-repo-guest/run.ts
 *
 * (The automated proof lives in `tests/off-repo-sdk.test.tsx` and runs under
 * `npm run test`; this script is the same path made observable by hand.)
 *
 * Builds `component.ts` against the published `@schemastud/frame-remote/sdk` via a
 * `file:` install (see build.ts), loads it through a real QuickJS VM wired to a host
 * receiver, and prints the reconciled host tree + a click round-trip — no browser.
 */
import { buildOffRepoGuest } from './build.js';
import { RemoteComponentBridge } from '../../src/bridge.js';

async function main(): Promise<void> {
    const { source, resolvedThroughPackage } = await buildOffRepoGuest();
    console.log('resolved @schemastud/frame-remote/sdk through package exports:', resolvedThroughPackage);

    const bridge = await RemoteComponentBridge.create();
    bridge.load(source);

    const painted = (): string => JSON.stringify(bridge.host.root, null, 2);
    console.log('\n--- initial host tree (reconciled through the allowlist) ---');
    console.log(painted());

    // Round-trip a click by handler id: find the Button's onClick listener ref and fire.
    const walk = (node: unknown): unknown => {
        const n = node as { element?: string; eventListeners?: Record<string, unknown>; children?: unknown[] };
        if (n.element === 'Button' && n.eventListeners?.onClick) return n.eventListeners.onClick;
        for (const c of n.children ?? []) {
            const hit = walk(c);
            if (hit) return hit;
        }
        return undefined;
    };
    const onClick = walk(bridge.host.root);
    bridge.host.fire(onClick, {});

    console.log('\n--- after one click (guest re-rendered through the VM) ---');
    console.log(painted());

    bridge.dispose();
}

main().catch((err) => {
    console.error(err);
    process.exitCode = 1;
});
