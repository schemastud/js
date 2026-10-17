// @vitest-environment jsdom
import { getSchema } from '@tiptap/core';
import { DOMSerializer, type Node as PMNode } from '@tiptap/pm/model';
import { describe, expect, it } from 'vitest';
import { normalizeLegacyNodeNames } from '../src/core/legacy-prose-names';
import { createManifestExtensions } from '../src/react/manifest-extensions';
import base from './fixtures/base.manifest.json';

/**
 * ADR-0228 d6 — a base prose node's name is now its JSX/HTML tag. The editing DOM
 * each node renders to must be unchanged from the pre-07c vocabulary:
 *
 *   paragraph        -> p          -> <p>
 *   heading (level N) -> h2..h6     -> <h2>..<h6>   (the level is the tag; h2 floor, h1 is the page title)
 *   bullet_list      -> ul         -> <ul>
 *   ordered_list     -> ol         -> <ol>
 *   list_item        -> li         -> <li>
 *   code_block       -> pre        -> <pre><code>   (the <code> wrapper is preserved)
 *   horizontal_rule  -> hr         -> <hr>
 *   hard_break       -> br         -> <br>
 *
 * This is the proof that the rename changes names, not rendered DOM.
 */
// A minimal doc-bearing manifest so the schema has a root (the base fixture's doc is null).
const docManifest = { profile: 'doc', version: 1, doc: { admitsChildCategories: ['prose'] }, nodes: [], marks: [] };
const schema = getSchema(createManifestExtensions([base as never, docManifest as never]));
const serializer = DOMSerializer.fromSchema(schema);

function html(node: PMNode): string {
    const host = document.createElement('div');
    host.appendChild(serializer.serializeNode(node));

    return host.innerHTML;
}

const text = (s: string): PMNode => schema.text(s);
const prose = (name: string, content?: PMNode): PMNode => schema.nodes[name]!.create(null, content);

describe('each renamed base node renders to the HTML element of its own name (ADR-0228 d6)', () => {
    it('p -> <p>', () => {
        expect(html(prose('p', text('x')))).toBe('<p>x</p>');
    });

    it.each(['h2', 'h3', 'h4', 'h5', 'h6'])('%s -> <%s>', (name) => {
        expect(html(prose(name, text('x')))).toBe(`<${name}>x</${name}>`);
    });

    it('blockquote -> <blockquote>', () => {
        expect(html(prose('blockquote', prose('p', text('q'))))).toBe('<blockquote><p>q</p></blockquote>');
    });

    it('bullet_list -> <ul> and ordered_list -> <ol>, over <li>', () => {
        const li = prose('li', prose('p', text('i')));

        expect(html(prose('ul', li))).toBe('<ul><li><p>i</p></li></ul>');
        expect(html(prose('ol', li))).toBe('<ol><li><p>i</p></li></ol>');
    });

    it('code_block -> <pre><code> (the code wrapper survives)', () => {
        expect(html(prose('pre', text('code();')))).toBe('<pre><code>code();</code></pre>');
    });

    it('horizontal_rule -> <hr> (void)', () => {
        expect(html(schema.nodes.hr!.create())).toBe('<hr>');
    });

    it('hard_break -> <br> (void)', () => {
        expect(html(schema.nodes.br!.create())).toBe('<br>');
    });
});

/**
 * EP-07c READ-COMPAT: a document stored before EP-07c B's migration still holds the
 * pre-07c node names. normalize-on-load maps them to the current names, so the schema
 * accepts the document and it renders to the SAME DOM as its migrated form.
 */
describe('an un-migrated old-name document renders the same DOM as its migrated form', () => {
    const render = (stored: unknown): string => html(schema.nodeFromJSON(normalizeLegacyNodeNames(stored)));

    it('paragraph -> <p>', () => {
        expect(render({ type: 'paragraph', content: [{ type: 'text', text: 'x' }] })).toBe('<p>x</p>');
    });

    it('heading keeps the h2 floor (level 1 -> <h2>, level 4 -> <h4>)', () => {
        expect(render({ type: 'heading', attrs: { level: 1 }, content: [{ type: 'text', text: 'T' }] })).toBe('<h2>T</h2>');
        expect(render({ type: 'heading', attrs: { level: 4 }, content: [{ type: 'text', text: 'T' }] })).toBe('<h4>T</h4>');
    });

    it('bullet_list/ordered_list/list_item -> <ul>/<ol>/<li>', () => {
        const item = () => ({ type: 'list_item', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'i' }] }] });

        expect(render({ type: 'bullet_list', content: [item()] })).toBe('<ul><li><p>i</p></li></ul>');
        expect(render({ type: 'ordered_list', content: [item()] })).toBe('<ol><li><p>i</p></li></ol>');
    });

    it('hard_break -> <br>', () => {
        const stored = { type: 'paragraph', content: [{ type: 'text', text: 'a' }, { type: 'hard_break' }, { type: 'text', text: 'b' }] };

        expect(render(stored)).toBe('<p>a<br>b</p>');
    });
});
