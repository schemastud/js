// @vitest-environment jsdom
import { cleanup, render, waitFor } from '@testing-library/react';
import { createRef } from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { BlockdocEditor } from '../src/react/BlockdocEditor';
import type { BlockdocEditorHandle } from '../src/react/BlockdocEditor';
import type { BlockdocManifest } from '../src/core';

afterEach(cleanup);

const manifest: BlockdocManifest = {
    profile: 'node-attrs-fixture',
    version: 1,
    doc: { admitsChildCategories: ['product'] },
    nodes: [
        {
            name: 'product',
            category: 'product',
            admitsChildCategories: [],
            attrsSchema: {
                type: 'object',
                properties: {
                    id: { type: ['string', 'null'] },
                    price: { type: 'number' },
                    label: { type: 'string' },
                },
            },
        },
    ],
};

const doc = {
    type: 'doc',
    content: [{ type: 'product', attrs: { id: 'prod-1', price: 3, label: 'Gadget' } }],
};

async function mountEditor() {
    const ref = createRef<BlockdocEditorHandle>();
    render(<BlockdocEditor ref={ref} manifests={manifest} value={doc} palette={false} />);
    await waitFor(() => expect(ref.current?.editor).not.toBeNull());
    return ref;
}

describe('node-attrs channel (ED-07)', () => {
    it('getNode returns type + id-stripped schema + id-stripped attrs', async () => {
        const ref = await mountEditor();

        const view = ref.current!.getNode('prod-1');

        expect(view).not.toBeNull();
        expect(view!.type).toBe('product');
        expect(view!.attrs).toEqual({ price: 3, label: 'Gadget' }); // no id
        expect(Object.keys(view!.attrsSchema?.properties ?? {})).toEqual(['price', 'label']); // no id
    });

    it('setNodeAttrs writes back through the doc, reflected by a later getNode', async () => {
        const ref = await mountEditor();

        ref.current!.setNodeAttrs('prod-1', { price: 9 });

        const view = ref.current!.getNode('prod-1');
        expect(view!.attrs.price).toBe(9);
        expect(view!.attrs.label).toBe('Gadget'); // untouched
    });

    it('returns null for a missing node id without throwing', async () => {
        const ref = await mountEditor();

        expect(() => ref.current!.getNode('does-not-exist')).not.toThrow();
        expect(ref.current!.getNode('does-not-exist')).toBeNull();
        // setNodeAttrs on a missing node is a no-op, not a throw.
        expect(() => ref.current!.setNodeAttrs('does-not-exist', { price: 1 })).not.toThrow();
    });

    it('delete-then-getNode returns null (selection raced a delete)', async () => {
        const ref = await mountEditor();

        ref.current!.editor!.commands.clearContent();

        expect(ref.current!.getNode('prod-1')).toBeNull();
    });
});
