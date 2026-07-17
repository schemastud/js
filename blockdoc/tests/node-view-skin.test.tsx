// @vitest-environment jsdom
import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import type { Node as PMNode } from '@tiptap/pm/model';
import { BlockChromeFallback, createSkinRegistry } from '@schemastud/seam';
import { GenericNodeView, resolveNodeViewComponents } from '../src/react/node-views';
import type { NodeViewComponentProps } from '../src/react/node-views';
import type { BlockdocManifest } from '../src/core';

afterEach(cleanup);

// A minimal stand-in PM node — GenericNodeView only reads type.name + attrs.
function fakeNode(name: string, attrs: Record<string, unknown>): PMNode {
    return { type: { name }, attrs } as unknown as PMNode;
}

function renderNodeView(props: Partial<NodeViewComponentProps> & { node: PMNode }) {
    const full: NodeViewComponentProps = {
        view: {} as never,
        getPos: () => 0,
        updateAttrs: () => {},
        contentRef: null,
        ...props,
    };
    return render(<GenericNodeView {...full} />);
}

describe('GenericNodeView — node-view / skin split (ED-06)', () => {
    it('draws selection chrome and composes the block-chrome fallback skin (no inline form)', () => {
        const { container } = renderNodeView({
            node: fakeNode('product', { id: 'p1', price: 9, name: 'Widget' }),
            attrsSchema: {
                type: 'object',
                properties: { price: { type: 'number' }, name: { type: 'string' } },
            },
        });

        // Editor chrome present.
        expect(container.querySelector('[data-blockdoc-chrome]')).not.toBeNull();
        // Fallback skin body with per-attr field anchors.
        expect(container.querySelector('[data-blockdoc-skin="block-chrome"]')).not.toBeNull();
        expect([...container.querySelectorAll('[data-attr]')].map((a) => a.getAttribute('data-attr'))).toEqual([
            'price',
            'name',
        ]);
        // The inline form is gone — editing moved to the inspector.
        expect(container.querySelector('form')).toBeNull();
    });

    it('shows the selection ring when the node is selected', () => {
        const { container } = renderNodeView({
            node: fakeNode('product', { id: 'p1' }),
            selected: true,
        });
        expect(container.querySelector('[data-blockdoc-selection-ring]')).not.toBeNull();
    });

    it('composes a registered skin instead of the fallback', () => {
        const skin = (n: { type: string }) => <div data-testid="custom-skin">custom:{n.type}</div>;

        const { container, getByTestId } = renderNodeView({
            node: fakeNode('product', { id: 'p1' }),
            skin,
        });

        expect(getByTestId('custom-skin').textContent).toBe('custom:product');
        expect(container.querySelector('[data-blockdoc-skin="block-chrome"]')).toBeNull();
    });

    it('passes PM content through contentRef', () => {
        const { container } = renderNodeView({
            node: fakeNode('section', { id: 's1' }),
            contentRef: () => {},
        });
        expect(container.querySelector('[data-blockdoc-content]')).not.toBeNull();
    });

    it('resolveNodeViewComponents assigns the fallback skin to a generic node-type', () => {
        const manifest: BlockdocManifest = {
            profile: 'x',
            version: 1,
            doc: { admitsChildCategories: ['product'] },
            nodes: [
                {
                    name: 'product',
                    category: 'product',
                    admitsChildCategories: [],
                    attrsSchema: { type: 'object', properties: { price: { type: 'number' } } },
                },
            ],
        };

        // Default registry → block-chrome fallback.
        expect(resolveNodeViewComponents([manifest]).get('product')?.skin).toBe(BlockChromeFallback);

        // A registered skin on a passed registry wins.
        const skins = createSkinRegistry();
        const productSkin = () => <div />;
        skins.registerSkin('product', productSkin);
        expect(resolveNodeViewComponents([manifest], undefined, skins).get('product')?.skin).toBe(productSkin);
    });
});
