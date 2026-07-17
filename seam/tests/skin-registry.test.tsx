import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { BlockChromeFallback } from '../src/block-chrome';
import { createSkinRegistry } from '../src/skin-registry';
import type { SkinNode } from '../src/types';

describe('skin registry', () => {
    it('resolves a registered skin by node-type', () => {
        const registry = createSkinRegistry();
        const citation = (node: SkinNode) => <div data-testid="citation">{node.type}</div>;

        registry.registerSkin('citation', citation);

        expect(registry.hasSkin('citation')).toBe(true);
        expect(registry.resolveSkin('citation')).toBe(citation);
    });

    it('falls back to block-chrome for an unregistered node-type', () => {
        const registry = createSkinRegistry();

        expect(registry.hasSkin('unknown-block')).toBe(false);
        expect(registry.resolveSkin('unknown-block')).toBe(BlockChromeFallback);

        const skin = registry.resolveSkin('unknown-block');
        const { container, getByText } = render(<>{skin({ type: 'unknown-block' })}</>);

        expect(container.querySelector('[data-blockdoc-skin="block-chrome"]')).not.toBeNull();
        expect(getByText('unknown-block')).toBeTruthy();
        expect(getByText('Edit via the inspector →')).toBeTruthy();
    });

    it('the fallback emits one field anchor per attr from the attrs schema', () => {
        const node: SkinNode = { type: 'callout', attrs: { title: 'Note', tone: 'warning' } };
        const attrsSchema = {
            type: 'object',
            properties: { title: { type: 'string' }, tone: { type: 'string' }, dismissible: { type: 'boolean' } },
        };

        const { container } = render(<>{BlockChromeFallback(node, { attrsSchema })}</>);

        const anchors = container.querySelectorAll('[data-attr]');
        expect(anchors).toHaveLength(3); // one per schema property, even the unset one
        expect([...anchors].map((a) => a.getAttribute('data-attr'))).toEqual([
            'title',
            'tone',
            'dismissible',
        ]);
    });

    it('the fallback anchors the actual attrs when no schema is given', () => {
        const node: SkinNode = { type: 'callout', attrs: { title: 'Note', tone: 'warning' } };

        const { container } = render(<>{BlockChromeFallback(node)}</>);

        expect(container.querySelectorAll('[data-attr]')).toHaveLength(2);
    });

    it('registries are isolated per consumer', () => {
        const a = createSkinRegistry();
        a.registerSkin('citation', () => <div />);

        const b = createSkinRegistry();
        expect(b.hasSkin('citation')).toBe(false);
        expect(b.resolveSkin('citation')).toBe(BlockChromeFallback);
    });
});
