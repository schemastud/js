/* eslint-disable */
// =============================================================================
// story-fixtures — shared Storybook fixtures for the @schemastud/blockdoc catalog
// (component-seams map, ticket 21). NOT part of the shipped package: tsup builds only
// the explicit `core`/`react`/`rjsf` index graphs (see tsup.config.ts), so this file
// — imported solely by *.stories.tsx — never enters `dist`.
//
// blockdoc is a self-contained Tiptap editor island: unlike frame/facets it needs NO
// injection provider to render, only a MANIFEST (compiled to the PM schema) and an
// optional DOC-JSON value. This file supplies both — an inline base+profile manifest
// (mirroring the real `block-schema:export-manifest` shape, copied from the package's
// own test fixture so a story renders off package source alone, never `@/*` or tests/)
// plus representative documents (empty, rich, single-block) the stories replay.
// =============================================================================
import type { BlockdocManifest } from '../core';
import { NODE_ID_ATTR } from '../core';
import type { DocJson } from './commit-controller';

// ── The base prose manifest ──────────────────────────────────────────────────
// The vendored base set: paragraph/heading/lists/blockquote/code + the inline marks
// (strong/em/code/link). It owns no `doc` node (that is the profile's job).
export const BASE_MANIFEST: BlockdocManifest = {
    profile: 'base',
    version: 1,
    doc: null,
    nodes: [
        {
            name: 'paragraph',
            description: 'A paragraph of inline prose.',
            group: 'block',
            category: 'prose',
            admitsChildCategories: null,
            admitsText: true,
            contentExpression: null,
            attrsSchema: { type: 'object', properties: { id: { type: ['string', 'null'] } } },
        },
        {
            name: 'heading',
            description: 'A section heading at a given level.',
            group: 'block',
            category: 'prose',
            admitsChildCategories: null,
            admitsText: true,
            contentExpression: null,
            attrsSchema: {
                type: 'object',
                properties: { id: { type: ['string', 'null'] }, level: { type: 'integer', default: 1 } },
            },
        },
        {
            name: 'blockquote',
            description: 'A quoted run of prose blocks.',
            group: 'block',
            category: 'prose',
            admitsChildCategories: ['prose'],
            admitsText: false,
            contentExpression: null,
            attrsSchema: { type: 'object', properties: { id: { type: ['string', 'null'] } } },
        },
        {
            name: 'bullet_list',
            description: 'An unordered list.',
            group: 'block',
            category: 'prose',
            admitsChildCategories: ['list_item'],
            admitsText: false,
            contentExpression: null,
            attrsSchema: { type: 'object', properties: { id: { type: ['string', 'null'] } } },
        },
        {
            name: 'ordered_list',
            description: 'An ordered list.',
            group: 'block',
            category: 'prose',
            admitsChildCategories: ['list_item'],
            admitsText: false,
            contentExpression: null,
            attrsSchema: { type: 'object', properties: { id: { type: ['string', 'null'] } } },
        },
        {
            name: 'list_item',
            description: 'One list item holding prose blocks.',
            group: 'block',
            category: 'list_item',
            admitsChildCategories: ['prose'],
            admitsText: false,
            contentExpression: null,
            attrsSchema: { type: 'object', properties: { id: { type: ['string', 'null'] } } },
        },
        {
            name: 'code_block',
            description: 'A block of literal code text.',
            group: 'block',
            category: 'prose',
            admitsChildCategories: null,
            admitsText: true,
            contentExpression: 'text*',
            attrsSchema: { type: 'object', properties: { id: { type: ['string', 'null'] } } },
        },
        {
            name: 'horizontal_rule',
            description: 'A thematic break.',
            group: 'block',
            category: 'prose',
            admitsChildCategories: [],
            admitsText: false,
            contentExpression: null,
            attrsSchema: { type: 'object', properties: { id: { type: ['string', 'null'] } } },
        },
        {
            name: 'hard_break',
            description: 'A forced line break within inline content.',
            group: 'inline',
            category: null,
            admitsChildCategories: [],
            admitsText: false,
            contentExpression: null,
            attrsSchema: { type: 'object', properties: { id: { type: ['string', 'null'] } } },
        },
    ],
    marks: [
        { name: 'strong' },
        { name: 'em' },
        { name: 'code' },
        { name: 'link', attrsSchema: { type: 'object', properties: { href: { type: 'string' } } } },
        {
            name: 'annotation',
            attrsSchema: { type: 'object', properties: { id: { type: ['string', 'null'] } } },
            excludes: '',
        },
    ],
};

// ── The profile manifest ──────────────────────────────────────────────────────
// A representative profile: it owns the `doc` node (admitting prose + a typed
// `callout` block) and declares one typed block, `callout`, whose non-id attr
// (`tone`) means it renders through the GenericNodeView + seam skin chrome (not native
// PM). This gives the palette a non-prose entry to insert and exercises the block
// selection-chrome / skin-fallback path.
export const PROFILE_MANIFEST: BlockdocManifest = {
    profile: 'story',
    version: 1,
    doc: { admitsChildCategories: ['prose', 'callout'] },
    nodes: [
        {
            name: 'callout',
            description: 'A highlighted aside with a tone.',
            group: 'block',
            category: 'callout',
            admitsChildCategories: ['prose'],
            admitsText: false,
            contentExpression: null,
            attrsSchema: {
                type: 'object',
                properties: {
                    id: { type: ['string', 'null'] },
                    tone: { type: 'string', default: 'info', enum: ['info', 'warn', 'success'] },
                },
            },
        },
    ],
};

/** The ordered pair a host compiles into the island's PM schema. */
export const STORY_MANIFESTS: BlockdocManifest[] = [BASE_MANIFEST, PROFILE_MANIFEST];

// ── Document fixtures ───────────────────────────────────────────────────────
function para(id: string, ...content: unknown[]): unknown {
    return { type: 'paragraph', attrs: { [NODE_ID_ATTR]: id }, content };
}
function text(value: string, marks?: unknown[]): unknown {
    return marks ? { type: 'text', text: value, marks } : { type: 'text', text: value };
}

/** An empty document — the null/`{}` host default initializes to this. */
export const EMPTY_DOC: DocJson = { type: 'doc', content: [] };

/** A single populated paragraph — the minimal non-empty render. */
export const SINGLE_BLOCK_DOC: DocJson = {
    type: 'doc',
    content: [para('p-intro', text('A single paragraph of prose.'))],
};

/** A rich, multi-block document exercising headings, marks, a list, a quote and a
 *  typed `callout` (which draws through the generic node-view + skin chrome). */
export const RICH_DOC: DocJson = {
    type: 'doc',
    content: [
        { type: 'heading', attrs: { [NODE_ID_ATTR]: 'h-1', level: 1 }, content: [text('Release notes')] },
        para(
            'p-1',
            text('The editor commits '),
            text('on a trailing debounce', [{ type: 'strong' }]),
            text(' and on blur — see the '),
            text('changelog', [{ type: 'link', attrs: { href: 'https://example.com' } }]),
            text('.'),
        ),
        {
            type: 'bullet_list',
            attrs: { [NODE_ID_ATTR]: 'ul-1' },
            content: [
                {
                    type: 'list_item',
                    attrs: { [NODE_ID_ATTR]: 'li-1' },
                    content: [para('li-1-p', text('Node ids survive an external rebuild.'))],
                },
                {
                    type: 'list_item',
                    attrs: { [NODE_ID_ATTR]: 'li-2' },
                    content: [para('li-2-p', text('The selection is remapped by id.'))],
                },
            ],
        },
        {
            type: 'blockquote',
            attrs: { [NODE_ID_ATTR]: 'bq-1' },
            content: [para('bq-1-p', text('One save path — attr edits ride the same commit pipe as typing.'))],
        },
        {
            type: 'callout',
            attrs: { [NODE_ID_ATTR]: 'callout-1', tone: 'warn' },
            content: [para('callout-1-p', text('A typed block renders through the generic node-view chrome.'))],
        },
    ],
};
