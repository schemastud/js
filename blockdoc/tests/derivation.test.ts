import { describe, expect, it } from 'vitest';
import { assemblePMSchema } from '../src/core';
import type { BlockdocManifest } from '../src/core';
import base from './fixtures/base.manifest.json';
import contentArticle from './fixtures/content-article.manifest.json';

const schema = assemblePMSchema([base, contentArticle]);

describe('content expression derivation', () => {
    it('derives leaves from an empty admitsChildCategories list', () => {
        expect(schema.nodes.hr.spec.content).toBeUndefined();
        expect(schema.nodes.hr.isLeaf).toBe(true);
        expect(schema.nodes.br.isLeaf).toBe(true);
        expect(schema.nodes.contentOutline.isLeaf).toBe(true);
    });

    it('derives inline* textblocks from admitsText with null admitsChildCategories', () => {
        expect(schema.nodes.p.spec.content).toBe('inline*');
        expect(schema.nodes.p.isTextblock).toBe(true);
        expect(schema.nodes.h2.spec.content).toBe('inline*');
    });

    it('derives category-union repetition from admitsChildCategories lists', () => {
        expect(schema.nodes.blockquote.spec.content).toBe('(prose)*');
        expect(schema.nodes.ul.spec.content).toBe('(list_item)*');
        expect(schema.nodes.contentSection.spec.content).toBe('(section | prose)*');
        expect(schema.nodes.contentArticle.spec.content).toBe('(outline | section)*');
    });

    it('lets an explicit contentExpression override derivation', () => {
        expect(schema.nodes.pre.spec.content).toBe('text*');
        expect(schema.nodes.pre.isTextblock).toBe(true);
    });

    it('uses the category as the PM group; inline nodes join the inline group', () => {
        expect(schema.nodes.contentSection.spec.group).toBe('section');
        expect(schema.nodes.p.spec.group).toBe('prose');
        expect(schema.nodes.br.spec.group).toBe('inline');
        expect(schema.nodes.br.isInline).toBe(true);
        // Null category → no category group; untargetable by derived expressions.
        expect(schema.nodes.contentArticle.spec.group).toBeUndefined();
    });

    it('derives the doc content from doc.admitsChildCategories', () => {
        expect(schema.nodes.doc.spec.content).toBe('(section)*');
    });

    it('compiles a null doc.admitsChildCategories to a leaf doc (unconstrained is inexpressible)', () => {
        const manifest: BlockdocManifest = {
            profile: 'minimal',
            version: 1,
            doc: { admitsChildCategories: null },
            nodes: [],
            marks: [],
        };

        expect(assemblePMSchema(manifest).nodes.doc.spec.content).toBeUndefined();
    });

    it('passes mark attrsSchema and excludes through', () => {
        expect(schema.marks.link.spec.attrs).toEqual({ href: { default: null } });
        expect(schema.marks.annotation.spec.attrs).toEqual({ id: { default: null } });
        expect(schema.marks.annotation.spec.excludes).toBe('');
        expect(schema.marks.strong.spec.attrs).toBeUndefined();
    });
});
