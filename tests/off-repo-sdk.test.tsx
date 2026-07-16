import { describe, it, expect, afterEach, beforeAll } from 'vitest';
import { act } from 'react';
import { createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { RemoteComponentBridge } from '../src/bridge.js';
import { RemoteSurface } from '../src/host/render.js';
import { buildOffRepoGuest } from '../examples/off-repo-guest/build.js';
import * as sdk from '../src/guest/sdk.js';

/**
 * RCP-04 acceptance core — the published guest authoring SDK.
 *
 * A component authored OUTSIDE this repo, against ONLY `@schemastud/frame-remote/sdk`
 * (resolved through the built `dist` + `exports` via a `file:` install — not a
 * relative `../src` import), builds to a guest bundle, loads through the real QuickJS
 * VM, and renders through the real host receiver into the allowlisted host tree —
 * round-tripping a click by handler id. And: the SDK's export surface exposes only the
 * vocabulary + authoring API, never host DOM / window / credential / receiver.
 */

// Building the off-repo fixture does a `file:` npm install + esbuild bundle; give it
// real headroom (network-free, but install + bundle take a moment).
const BUILD_TIMEOUT = 120_000;

describe('off-repo SDK — a component built outside the repo renders through the host', () => {
    let source = '';
    let resolvedThroughPackage = false;

    beforeAll(async () => {
        const built = await buildOffRepoGuest();
        source = built.source;
        resolvedThroughPackage = built.resolvedThroughPackage;
    }, BUILD_TIMEOUT);

    let bridge: RemoteComponentBridge | null = null;
    let container: HTMLElement | null = null;
    let root: Root | null = null;

    afterEach(() => {
        act(() => root?.unmount());
        container?.remove();
        bridge?.dispose();
        bridge = null;
        container = null;
        root = null;
    });

    async function mount() {
        bridge = await RemoteComponentBridge.create();
        bridge.load(source);
        container = document.createElement('div');
        document.body.appendChild(container);
        root = createRoot(container);
        act(() => root!.render(createElement(RemoteSurface, { host: bridge!.host })));
    }

    it('resolves the SDK through the package exports map (built dist, not src)', () => {
        expect(source.length).toBeGreaterThan(0);
        expect(resolvedThroughPackage).toBe(true);
        // The bundle binds to the in-VM bridge global — the only runtime dependency.
        expect(source).toContain('FrameRemote');
    });

    it('paints the off-repo-authored tree through the allowlisted host receiver', async () => {
        await mount();
        expect(container!.textContent).toContain('Authored outside the repo');
        expect(container!.textContent).toContain('off-repo · built against @schemastud/frame-remote/sdk');
        // Real allowlisted blocks painted: Card > Stack > Badge/Heading/Text/Button.
        expect(container!.querySelector('h2')).not.toBeNull();
        expect(container!.querySelector('button')).not.toBeNull();
    });

    it('round-trips a click by handler id (guest -> host -> guest)', async () => {
        await mount();
        const button = container!.querySelector('button')!;
        expect(button.textContent).toBe('Increment (0)');

        act(() => button.dispatchEvent(new MouseEvent('click', { bubbles: true })));
        expect(container!.querySelector('button')!.textContent).toBe('Increment (1)');
        expect(container!.textContent).toContain('Clicked 1x');

        act(() => container!.querySelector('button')!.dispatchEvent(new MouseEvent('click', { bubbles: true })));
        expect(container!.querySelector('button')!.textContent).toBe('Increment (2)');
    });
});

describe('off-repo SDK — the guest surface excludes host DOM / window / credentials', () => {
    it('exports only the vocabulary + authoring API', () => {
        // The published surface is exactly: h, text, render, defineComponent, and the
        // RCP-05 brokered-capability call `capability` (+ types, which erase at runtime).
        // No host receiver, no VM, no allowlist internals — `capability` reaches host
        // authority only through the injected token + broker, never a credential.
        const runtimeExports = Object.keys(sdk).sort();
        expect(runtimeExports).toEqual(['capability', 'defineComponent', 'h', 'render', 'text']);
    });

    it('names no host DOM, window, credential, or receiver surface', async () => {
        // Grep the BUILT SDK bundle (what a publisher installs) for any host/dom/
        // credential reference. The only global it may name is the in-VM FrameRemote
        // bridge; nothing else can even be spelled against this surface.
        const { readFile } = await import('node:fs/promises');
        const { fileURLToPath } = await import('node:url');
        const { resolve, dirname } = await import('node:path');
        const here = dirname(fileURLToPath(import.meta.url));
        const built = await readFile(resolve(here, '..', 'dist', 'sdk.js'), 'utf8');

        // Strip the guard's own error-message string, which mentions "VM" but names no
        // capability — the grep targets identifiers, not prose.
        const code = built.replace(/"[^"]*"/g, '""');
        for (const forbidden of [
            'document',
            'window',
            'localStorage',
            'fetch',
            'XMLHttpRequest',
            'RemoteReceiver',
            'HostReceiver',
            'credential',
            'cookie',
            'quickjs',
        ]) {
            expect(code, `SDK bundle must not name ${forbidden}`).not.toContain(forbidden);
        }
        // It DOES bind to the in-VM bridge global — the one allowed runtime touchpoint.
        expect(built).toContain('FrameRemote');
    });
});
