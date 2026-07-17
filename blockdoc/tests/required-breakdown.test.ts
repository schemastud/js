import { describe, expect, it } from 'vitest';
import { assemblePMSchema, createLegalityReader } from '../src/core';
import type { BlockdocManifest } from '../src/core';
import type { Node as PMNode } from '@tiptap/pm/model';

// A section requires heading{1} prose+ — a section with only a heading is short
// one prose (the F6 "Missing: 1 prose" case at the section parent).
const manifest: BlockdocManifest = {
    profile: 'breakdown-fixture',
    version: 1,
    doc: { admitsChildCategories: ['section'] },
    nodes: [
        {
            name: 'sec',
            category: 'section',
            admitsChildCategories: ['heading', 'prose'],
            childConstraints: {
                heading: { required: true, max: 1 },
                prose: { min: 2 },
            },
        },
        { name: 'head', category: 'heading', admitsChildCategories: null, admitsText: true },
        { name: 'para', category: 'prose', admitsChildCategories: null, admitsText: true },
    ],
};

const schema = assemblePMSchema(manifest);
const reader = createLegalityReader(manifest);

function head(id: string) {
    return { type: 'head', attrs: { id }, content: [{ type: 'text', text: 'T' }] };
}
function para(id: string, text = 'body') {
    return { type: 'para', attrs: { id }, content: [{ type: 'text', text }] };
}
function sec(id: string, content: unknown[]) {
    return { type: 'sec', attrs: { id }, content };
}
function build(content: unknown[]): PMNode {
    return schema.nodeFromJSON({ type: 'doc', content });
}

describe('requiredBreakdown — per-parent deficits (ED-13 B7)', () => {
    it('reports a parent short of a required category', () => {
        // sec needs 2 prose; supply 1 → deficit { parentId: s, category: prose, min: 2, filled: 1 }.
        const doc = build([sec('s', [head('h'), para('p1')])]);

        const slots = reader.requiredBreakdown(doc);

        expect(slots).toEqual([{ parentId: 's', category: 'prose', min: 2, filled: 1 }]);
    });

    it('reports no deficit when every required category is satisfied', () => {
        const doc = build([sec('s', [head('h'), para('p1'), para('p2')])]);

        expect(reader.requiredBreakdown(doc)).toEqual([]);
    });
});
