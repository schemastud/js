import { describe, it, expect, afterEach } from 'vitest';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { RemoteComponentBridge } from '../src/bridge.js';
import { RemoteSurface } from '../src/host/render.js';
import { createElement } from 'react';
import { INTERACTIVE_COMPONENT } from './guests.js';

/**
 * Fidelity: a guest-emitted tree paints through the REAL remote-dom receiver into a
 * real host React tree (jsdom), a real click round-trips guest -> host -> guest, and
 * a controlled input updates — all with no iframe. The guest logic runs in the real
 * QuickJS VM; only the host paint is jsdom.
 */
describe('fidelity — real events + controlled input round-trip, no iframe', () => {
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
        bridge.load(INTERACTIVE_COMPONENT);
        container = document.createElement('div');
        document.body.appendChild(container);
        root = createRoot(container);
        act(() => root!.render(createElement(RemoteSurface, { host: bridge!.host })));
    }

    it('paints the guest tree from the allowlist and DROPS the smuggled <script>', async () => {
        await mount();
        expect(container!.textContent).toContain('Polish this block');
        expect(container!.textContent).toContain('thingsontv · remote block');
        // The smuggled non-allowlisted <script> is refused, not painted.
        expect(container!.querySelector('script')).toBeNull();
        expect(container!.querySelector('[data-frame-remote-blocked="script"]')).not.toBeNull();
        expect(container!.textContent).toContain('blocked non-allowlisted <script>');
    });

    it('a real click round-trips guest -> host -> guest and increments', async () => {
        await mount();
        const button = container!.querySelector('button')!;
        expect(button.textContent).toBe('Increment (0)');

        act(() => button.dispatchEvent(new MouseEvent('click', { bubbles: true })));
        expect(container!.querySelector('button')!.textContent).toBe('Increment (1)');

        act(() => container!.querySelector('button')!.dispatchEvent(new MouseEvent('click', { bubbles: true })));
        expect(container!.querySelector('button')!.textContent).toBe('Increment (2)');
        expect(container!.textContent).toContain('Clicked 2x');
    });

    it('a controlled input updates through the isolation boundary', async () => {
        await mount();
        const inputEl = container!.querySelector('input') as HTMLInputElement;

        // Drive a React controlled-input change (native setter + input event).
        const setter = Object.getOwnPropertyDescriptor(
            window.HTMLInputElement.prototype,
            'value',
        )!.set!;
        act(() => {
            setter.call(inputEl, 'Ada');
            inputEl.dispatchEvent(new Event('input', { bubbles: true }));
        });

        const updated = container!.querySelector('input') as HTMLInputElement;
        expect(updated.value).toBe('Ada');
        expect(container!.textContent).toContain('Hello, Ada');
    });
});
