import { describe, expect, it } from 'vitest';
import { assemblePMSchema, createLegalityReader } from '../src/core';
import type { BlockdocManifest, InsertableCandidate } from '../src/core';
import type { Node as PMNode } from '@tiptap/pm/model';

// ED-03 — enriched insert candidates. Fixture mixes container grammar (arity) with
// two reference-carrying leaves (single edge + pick-many edge).
const manifest: BlockdocManifest = {
    profile: 'candidates-fixture',
    version: 1,
    doc: { admitsChildCategories: ['section', 'product', 'gallery'] },
    nodes: [
        {
            name: 'sec',
            category: 'section',
            admitsChildCategories: ['heading', 'prose'],
            childConstraints: {
                heading: { required: true, max: 1, reason: 'a section needs a title' },
                prose: { min: 1 },
            },
        },
        {
            name: 'product',
            category: 'product',
            admitsChildCategories: [],
            attrsSchema: {
                type: 'object',
                properties: {
                    id: { type: ['string', 'null'] },
                    catalogRef: { type: 'string', 'x-dereference-target': 'catalog' },
                },
            },
        },
        {
            name: 'collection',
            category: 'gallery',
            admitsChildCategories: [],
            attrsSchema: {
                type: 'object',
                properties: {
                    id: { type: ['string', 'null'] },
                    items: { type: 'array', items: { 'x-dereference-target': 'catalog' } },
                },
            },
        },
        { name: 'head', category: 'heading', admitsChildCategories: null, admitsText: true },
        { name: 'para', category: 'prose', admitsChildCategories: null, admitsText: true },
    ],
};

const schema = assemblePMSchema(manifest);
const reader = createLegalityReader(manifest);

function head(id: string) {
    return { type: 'head', attrs: { id }, content: [{ type: 'text', text: 'Title' }] };
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
function posOf(doc: PMNode, id: string): number {
    let found = -1;
    doc.descendants((node, pos) => {
        if (node.attrs.id === id) {
            found = pos;
            return false;
        }
        return true;
    });
    if (found === -1) throw new Error(`no node with id ${id}`);
    return found;
}
function byType(candidates: InsertableCandidate[], nodeType: string): InsertableCandidate | undefined {
    return candidates.find((c) => c.nodeType === nodeType);
}

describe('insertableCandidatesAt', () => {
    it('mirrors insertableAt legality but returns enriched per-node-type candidates', () => {
        const doc = build([sec('s', [head('h'), para('p')])]);

        const categories = reader.insertableAt(doc, 0).sort();
        const candidateCategories = [...new Set(reader.insertableCandidatesAt(doc, 0).map((c) => c.category))].sort();

        // Same category legality set as the bare read (parity).
        expect(candidateCategories).toEqual(categories);
    });

    it('carries category, nodeType, label, and arity for a legal candidate', () => {
        // At a gap inside a section: prose is legal; its category floor is min 1.
        const doc = build([sec('s', [head('h'), para('p')])]);
        const candidates = reader.insertableCandidatesAt(doc, posOf(doc, 'p'));

        const prose = byType(candidates, 'para');
        expect(prose).toBeDefined();
        expect(prose!.category).toBe('prose');
        expect(prose!.label).toBe('prose');
        expect(prose!.arity).toEqual({ min: 1, max: null });
    });

    it('excludes an at-max category (heading is capped at 1)', () => {
        const doc = build([sec('s', [head('h'), para('p')])]);
        const candidates = reader.insertableCandidatesAt(doc, posOf(doc, 'p'));

        // A second heading is illegal (max 1) — not offered.
        expect(byType(candidates, 'head')).toBeUndefined();
    });

    it('carries a single reference edge target', () => {
        const doc = build([sec('s', [head('h'), para('p')])]);
        const product = byType(reader.insertableCandidatesAt(doc, 0), 'product');

        expect(product).toBeDefined();
        expect(product!.edgeTarget).toEqual({ attr: 'catalogRef', target: 'catalog', pickMany: false });
    });

    it('marks a pick-many array edge target', () => {
        const doc = build([sec('s', [head('h'), para('p')])]);
        const collection = byType(reader.insertableCandidatesAt(doc, 0), 'collection');

        expect(collection).toBeDefined();
        expect(collection!.edgeTarget).toEqual({ attr: 'items', target: 'catalog', pickMany: true });
    });

    it('leaves edgeTarget null for a node-type with no reference attr', () => {
        const doc = build([sec('s', [head('h'), para('p')])]);
        const section = byType(reader.insertableCandidatesAt(doc, 0), 'sec');

        expect(section).toBeDefined();
        expect(section!.edgeTarget).toBeNull();
    });
});
