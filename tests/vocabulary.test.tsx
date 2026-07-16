import { describe, it, expect, afterEach } from 'vitest';
import { act } from 'react';
import { createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { RemoteComponentBridge } from '../src/bridge.js';
import { RemoteSurface } from '../src/host/render.js';
import {
    createBlockVocabulary,
    registerBlock,
    DEFAULT_BLOCK_VOCABULARY,
    type BlockVocabulary,
} from '../src/host/vocabulary.js';
import type { HostComponent } from '../src/host/allowlist.js';
import { NAMES_KNOWN_AND_UNKNOWN, INJECTION_ATTEMPTS } from './guests.js';

/**
 * RCP-03 alignment coverage: the host allowlist IS the frame component vocabulary
 * (seam's `WidgetRegistry`), not a parallel one-off. These prove:
 *   1. registering a block into the frame-aligned registry makes it paintable; an
 *      unregistered `type` resolves to nothing (visible placeholder in dev).
 *   2. an in-repo guest naming an allowlisted type paints; an unknown type is dropped.
 *   3. a guest smuggling raw HTML / dangerouslySetInnerHTML-shaped props / <script> /
 *      inline-style CSS is refused — only allowlisted types + serialized props render.
 */

describe('vocabulary — the frame-aligned (seam WidgetRegistry) block registry', () => {
    it('is seam-shaped: exposes registerWidget / resolveWidget / resolveEntry', () => {
        const vocab = createBlockVocabulary();
        expect(typeof vocab.registerWidget).toBe('function');
        expect(typeof vocab.resolveWidget).toBe('function');
        expect(typeof vocab.resolveEntry).toBe('function');
    });

    it('resolves a registered block type through seam; an unregistered type → undefined', () => {
        const vocab = createBlockVocabulary({}); // empty vocabulary
        const Panel: HostComponent = (_el, { children }) =>
            createElement('section', { 'data-panel': true }, children());

        // Unknown before registration — seam's total resolution returns nothing.
        expect(vocab.resolveBlock('Panel')).toBeUndefined();

        // Register via the SAME seam mechanism frame uses for a widget.
        registerBlock(vocab, 'Panel', Panel);
        expect(vocab.resolveBlock('Panel')).toBe(Panel);

        // A type nobody registered stays refused.
        expect(vocab.resolveBlock('DangerZone')).toBeUndefined();
    });

    it('routes resolution through seam.resolveEntry (block type expressed as a schema node)', () => {
        const vocab = createBlockVocabulary({});
        const Panel: HostComponent = (_el, { children }) => createElement('section', {}, children());
        registerBlock(vocab, 'Panel', Panel);
        // The seam registry itself carries the entry, keyed by schema `type`.
        expect(vocab.resolveEntry({ type: 'Panel' }).widget).toBe(Panel);
        expect(vocab.resolveEntry({ type: 'Nope' }).widget).toBeUndefined();
    });

    it('ships the 7 default blocks registered through the seam registry', () => {
        for (const type of ['Stack', 'Card', 'Heading', 'Text', 'Badge', 'Button', 'TextInput']) {
            expect(typeof DEFAULT_BLOCK_VOCABULARY.resolveBlock(type)).toBe('function');
        }
        expect(DEFAULT_BLOCK_VOCABULARY.resolveBlock('NotAThing')).toBeUndefined();
    });
});

describe('vocabulary — paint a custom block; drop an unregistered one (visible placeholder)', () => {
    let container: HTMLElement | null = null;
    let root: Root | null = null;
    let bridge: RemoteComponentBridge | null = null;

    afterEach(() => {
        act(() => root?.unmount());
        container?.remove();
        bridge?.dispose();
        container = null;
        root = null;
        bridge = null;
    });

    async function mount(source: string, vocabulary?: BlockVocabulary) {
        bridge = await RemoteComponentBridge.create();
        bridge.load(source);
        container = document.createElement('div');
        document.body.appendChild(container);
        root = createRoot(container);
        act(() =>
            root!.render(createElement(RemoteSurface, { host: bridge!.host, vocabulary })),
        );
    }

    it('a block registered into the vocabulary becomes paintable', async () => {
        // Extend the default vocabulary with a NEW block named by the guest tree.
        const vocab = createBlockVocabulary();
        registerBlock(vocab, 'Heading', DEFAULT_BLOCK_VOCABULARY.resolveBlock('Heading')!);
        await mount(NAMES_KNOWN_AND_UNKNOWN, vocab);
        expect(container!.textContent).toContain('known block painted');
        expect(container!.querySelector('h2')).not.toBeNull();
    });

    it('an unregistered type is dropped with a VISIBLE dev placeholder', async () => {
        await mount(NAMES_KNOWN_AND_UNKNOWN);
        // The allowlisted 'Heading' paints...
        expect(container!.textContent).toContain('known block painted');
        // ...the unknown 'DangerZone' is refused, never painted, but visibly flagged.
        expect(container!.textContent).not.toContain('should never paint');
        const placeholder = container!.querySelector('[data-frame-remote-blocked="DangerZone"]');
        expect(placeholder).not.toBeNull();
        expect(container!.textContent).toContain('unknown block <DangerZone>');
    });

    it('a block absent from a restricted vocabulary is refused', async () => {
        // A vocabulary WITHOUT Heading: even the "known" block is now unknown.
        const restricted = createBlockVocabulary({
            Card: DEFAULT_BLOCK_VOCABULARY.resolveBlock('Card')!,
        });
        await mount(NAMES_KNOWN_AND_UNKNOWN, restricted);
        expect(container!.textContent).not.toContain('known block painted');
        expect(container!.querySelector('[data-frame-remote-blocked="Heading"]')).not.toBeNull();
    });
});

describe('vocabulary — guest cannot inject markup, CSS, or DOM (only name types + serialized props)', () => {
    let container: HTMLElement | null = null;
    let root: Root | null = null;
    let bridge: RemoteComponentBridge | null = null;

    afterEach(() => {
        act(() => root?.unmount());
        container?.remove();
        bridge?.dispose();
        container = null;
        root = null;
        bridge = null;
    });

    async function mount(source: string) {
        bridge = await RemoteComponentBridge.create();
        bridge.load(source);
        container = document.createElement('div');
        document.body.appendChild(container);
        root = createRoot(container);
        act(() => root!.render(createElement(RemoteSurface, { host: bridge!.host })));
    }

    it('refuses raw HTML tags, <script>, <style>, and inert-izes dangerous props', async () => {
        await mount(INJECTION_ATTEMPTS);

        // No raw DOM the guest named crosses: no injected <div>, <script>, <style>.
        expect(container!.querySelector('script')).toBeNull();
        expect(container!.querySelector('style')).toBeNull();
        // The raw 'div' the guest named is not a vocabulary key → refused, not painted.
        expect(container!.querySelector('[data-frame-remote-blocked="div"]')).not.toBeNull();
        expect(container!.querySelector('[data-frame-remote-blocked="script"]')).not.toBeNull();
        expect(container!.querySelector('[data-frame-remote-blocked="style"]')).not.toBeNull();

        // No smuggled innerHTML rendered anywhere.
        expect(container!.innerHTML).not.toContain('onerror');
        expect(container!.innerHTML).not.toContain('<b>pwned</b>');
        expect(container!.textContent).not.toContain('body{display:none}');

        // The one allowlisted Text block DID paint its serialized text...
        expect(container!.textContent).toContain('inert text');
        // ...but its dangerouslySetInnerHTML-shaped prop was never read as markup...
        expect(container!.querySelector('b')).toBeNull();
        // ...and its style-STRING prop never became a fixed full-screen overlay
        // (the host applies its OWN first-party <p> styling, ignoring guest 'style').
        const painted = Array.from(container!.querySelectorAll('p')).find((p) =>
            p.textContent?.includes('inert text'),
        )!;
        expect(painted).toBeDefined();
        expect(painted.style.position).not.toBe('fixed');
        expect(painted.getAttribute('style') ?? '').not.toContain('inset');
    });
});
