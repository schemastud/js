import { Mark, Node, mergeAttributes } from '@tiptap/core';
import type { Attribute, Extensions, MarkConfig, NodeConfig } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';
import {
    allBlockCategories,
    attrsFromSchema,
    collectManifestEntries,
    contentExpressionFor,
    groupsFor,
    NODE_ID_ATTR,
} from '../core';
import type { BlockdocManifest, MarkManifestEntry, NodeManifestEntry } from '../core';
import type { SkinRegistry } from '@schemastud/seam';
import { resolveNodeViewComponents, tiptapNodeView } from './node-views';
import type { NodeViewRegistry, ResolvedNodeView } from './node-views';

/**
 * The manifest → Tiptap compilation. GUARDRAIL (ADR-0072): the manifest stays
 * the source of truth — every Node/Mark extension here is GENERATED, never
 * hand-authored per node type, and the structural rules (content expressions,
 * groups, attrs, doc admission, merge semantics) are the exact derivation
 * pieces exported by `core/assemble` — `assemblePMSchema` remains the
 * conformance oracle and the schema-parity test pins both compilations
 * together. What this module ADDS over the oracle is presentation only: the
 * editing DOM (parseHTML/renderHTML mirroring the retired `withEditingDOM` —
 * semantic tags for the base prose set, generic `div[data-node-type]` for
 * typed blocks) and NodeView bindings.
 */

export interface ManifestExtensionsOptions {
    /**
     * Slot-level doc admission override (category slugs) — replaces the
     * merged manifests' doc admission, mirroring the server's write-path
     * check (the same declaration `x-widget-options.docAdmits` carries).
     */
    docAdmits?: string[];
    /** NodeView registry; resolution rules are {@link resolveNodeViewComponents}. */
    nodeViews?: NodeViewRegistry;
    /**
     * Skin registry the generic node-view composes resting bodies from (ED-06).
     * Defaults to seam's default skin registry; unregistered node-types fall
     * back to seam's block-chrome skin.
     */
    skins?: SkinRegistry;
}

/**
 * Compile one manifest or an ordered composition (e.g. `[base, profile]`)
 * into Tiptap extensions: a Document whose content derives from the doc
 * admission, the implicit Text node, one generated Node per manifest node
 * (with editing DOM and, where resolution says so, a React NodeView), and one
 * generated Mark per manifest mark.
 */
export function createManifestExtensions(
    manifests: BlockdocManifest | BlockdocManifest[],
    options: ManifestExtensionsOptions = {},
): Extensions {
    const manifestList = Array.isArray(manifests) ? manifests : [manifests];
    const { doc, nodeEntries, markEntries } = collectManifestEntries(manifestList);
    const allCategories = allBlockCategories(nodeEntries);
    const admits = options.docAdmits ?? doc.admitsChildCategories;
    const nodeViews = resolveNodeViewComponents(manifestList, options.nodeViews, options.skins);

    const extensions: Extensions = [
        Node.create({
            name: 'doc',
            topNode: true,
            content: contentExpressionFor(
                { admitsChildCategories: admits, childConstraints: doc.childConstraints },
                allCategories,
            ),
        }),
    ];

    for (const entry of nodeEntries) {
        extensions.push(nodeExtensionFor(entry, allCategories, nodeViews.get(entry.name)));
    }

    // Rule 7: the text node is implicit; manifests never declare it. Emitted
    // after the manifest nodes to mirror the oracle's declaration order.
    extensions.push(Node.create({ name: 'text', group: 'inline' }));

    for (const entry of markEntries) {
        extensions.push(markExtensionFor(entry));
    }

    return extensions;
}

/**
 * Node attrs as Tiptap Attribute configs: defaults per the shared
 * `attrsFromSchema` rule; only the identity attr round-trips through the DOM
 * (`data-node-id`) — typed attrs live in the document JSON, not in HTML,
 * exactly as the retired `withEditingDOM` behaved.
 */
function nodeAttributes(entry: NodeManifestEntry): Record<string, Attribute> {
    const attributes: Record<string, Attribute> = {};

    for (const [name, spec] of Object.entries(attrsFromSchema(entry.attrsSchema, true))) {
        attributes[name] =
            name === NODE_ID_ATTR
                ? {
                      default: spec.default,
                      parseHTML: (element) => element.getAttribute('data-node-id'),
                      renderHTML: (attrs) => {
                          const id = attrs[NODE_ID_ATTR];

                          return typeof id === 'string' && id !== '' ? { 'data-node-id': id } : {};
                      },
                  }
                : {
                      default: spec.default,
                      // Parse rules may still set the attr from the tag; null here
                      // defers to them / the default.
                      parseHTML: () => null,
                      renderHTML: () => ({}),
                  };
    }

    return attributes;
}

type NodeDOM = Pick<NodeConfig, 'parseHTML' | 'renderHTML'>;

/**
 * The intrinsic HTML block/inline elements whose editing DOM is a plain element of
 * the node's own name with a single content hole (ADR-0228 d6 — a node's name is its
 * JSX tag). `pre`/`hr`/`br` are intrinsic too but carry a DOM shape the name alone
 * does not express (a `<code>` wrapper; a void element), so they stay explicit below.
 */
const INTRINSIC_HTML_ELEMENTS: ReadonlySet<string> = new Set([
    'p',
    'h1',
    'h2',
    'h3',
    'h4',
    'h5',
    'h6',
    'blockquote',
    'ul',
    'ol',
    'li',
]);

/**
 * The editing DOM for a generated node. For the base prose vocabulary the node name
 * IS the HTML tag (ADR-0228 d6), so it renders to the element of the same name; the
 * three shaped intrinsics (`pre`/`hr`/`br`) stay explicit. A typed block (a
 * PascalCase component, whose name is not an intrinsic tag) falls through to a generic
 * `div[data-node-type]` (span when inline) and normally renders through a NodeView;
 * the generic renderHTML also serves clipboard serialization.
 */
function nodeDOM(entry: NodeManifestEntry, hasContent: boolean): NodeDOM {
    switch (entry.name) {
        case 'pre':
            return {
                parseHTML: () => [{ tag: 'pre', preserveWhitespace: 'full' }],
                renderHTML: ({ HTMLAttributes }) => ['pre', HTMLAttributes, ['code', 0]],
            };
        case 'hr':
            return {
                parseHTML: () => [{ tag: 'hr' }],
                renderHTML: ({ HTMLAttributes }) => ['hr', HTMLAttributes],
            };
        case 'br':
            return {
                parseHTML: () => [{ tag: 'br' }],
                renderHTML: () => ['br'],
            };
    }

    if (INTRINSIC_HTML_ELEMENTS.has(entry.name)) {
        return {
            parseHTML: () => [{ tag: entry.name }],
            renderHTML: ({ HTMLAttributes }) => [entry.name, HTMLAttributes, 0],
        };
    }

    const tag = entry.group === 'inline' ? 'span' : 'div';

    return {
        parseHTML: () => [{ tag: `${tag}[data-node-type="${entry.name}"]` }],
        renderHTML: ({ HTMLAttributes }) =>
            hasContent
                ? [tag, mergeAttributes({ 'data-node-type': entry.name }, HTMLAttributes), 0]
                : [tag, mergeAttributes({ 'data-node-type': entry.name }, HTMLAttributes)],
    };
}

function nodeExtensionFor(
    entry: NodeManifestEntry,
    allCategories: readonly string[],
    nodeView: ResolvedNodeView | undefined,
): Node {
    const groups = groupsFor(entry);
    const content = contentExpressionFor(entry, allCategories);

    return Node.create({
        name: entry.name,
        ...(groups.length > 0 ? { group: groups.join(' ') } : {}),
        ...(entry.group === 'inline' ? { inline: true } : {}),
        ...(content !== undefined ? { content } : {}),
        addAttributes() {
            return nodeAttributes(entry);
        },
        ...nodeDOM(entry, content !== undefined),
        ...(nodeView !== undefined
            ? {
                  addNodeView() {
                      return ReactNodeViewRenderer(tiptapNodeView(nodeView));
                  },
              }
            : {}),
    });
}

type MarkDOM = Pick<MarkConfig, 'parseHTML' | 'renderHTML'>;

/**
 * The editing DOM for a generated mark, mirroring the retired
 * `withEditingDOM` semantics: semantic tags for the base set, `a[href]` for
 * link, `span[data-annotation-id]` for annotation, and a generic
 * `span[data-mark]` fallback.
 */
function markDOM(entry: MarkManifestEntry): MarkDOM {
    switch (entry.name) {
        case 'strong':
            return {
                parseHTML: () => [{ tag: 'strong' }, { tag: 'b' }],
                renderHTML: () => ['strong', 0],
            };
        case 'em':
            return {
                parseHTML: () => [{ tag: 'em' }, { tag: 'i' }],
                renderHTML: () => ['em', 0],
            };
        case 'code':
            return {
                parseHTML: () => [{ tag: 'code' }],
                renderHTML: () => ['code', 0],
            };
        case 'a':
        case 'link':
            return {
                parseHTML: () => [{ tag: 'a[href]' }],
                renderHTML: ({ mark }) => ['a', { href: String(mark.attrs.href ?? '') }, 0],
            };
        case 'annotation':
            return {
                parseHTML: () => [{ tag: 'span[data-annotation-id]' }],
                renderHTML: ({ mark }) => {
                    const id = mark.attrs[NODE_ID_ATTR];

                    return [
                        'span',
                        typeof id === 'string' && id !== ''
                            ? { 'data-annotation-id': id }
                            : { 'data-annotation': '' },
                        0,
                    ];
                },
            };
        default:
            return {
                parseHTML: () => [{ tag: `span[data-mark="${entry.name}"]` }],
                renderHTML: () => ['span', { 'data-mark': entry.name }, 0],
            };
    }
}

/** Mark attrs: shared defaults rule; DOM round-trip only where the mark's DOM carries the attr. */
function markAttributes(entry: MarkManifestEntry): Record<string, Attribute> {
    const attributes: Record<string, Attribute> = {};

    for (const [name, spec] of Object.entries(attrsFromSchema(entry.attrsSchema, false))) {
        if ((entry.name === 'link' || entry.name === 'a') && name === 'href') {
            attributes[name] = {
                default: spec.default,
                parseHTML: (element) => element.getAttribute('href'),
                renderHTML: () => ({}),
            };
            continue;
        }

        if (entry.name === 'annotation' && name === NODE_ID_ATTR) {
            attributes[name] = {
                default: spec.default,
                parseHTML: (element) => element.getAttribute('data-annotation-id'),
                renderHTML: () => ({}),
            };
            continue;
        }

        attributes[name] = {
            default: spec.default,
            parseHTML: () => null,
            renderHTML: () => ({}),
        };
    }

    return attributes;
}

function markExtensionFor(entry: MarkManifestEntry): Mark {
    const hasAttrs = Object.keys(attrsFromSchema(entry.attrsSchema, false)).length > 0;

    return Mark.create({
        name: entry.name,
        // Rule 8: pass through when present — including '' (overlap-allowing).
        ...(entry.excludes !== undefined ? { excludes: entry.excludes } : {}),
        ...(hasAttrs
            ? {
                  addAttributes() {
                      return markAttributes(entry);
                  },
              }
            : {}),
        ...markDOM(entry),
    });
}
