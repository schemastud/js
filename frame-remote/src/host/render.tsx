/**
 * The React host renderer: walks the reconciled remote tree and paints each node by
 * resolving its element `type` through the host-owned, FRAME-ALIGNED block vocabulary
 * (`@schemastud/seam`'s `WidgetRegistry`, the same seam frame paints widgets through
 * — see vocabulary.ts). A node whose `type` resolves to nothing is refused — a visible
 * "unknown block" placeholder in dev, nothing in prod — never painted.
 *
 * This is a pure, controlled projection of the receiver tree — no guest markup, CSS
 * or DOM ever crosses; only element *names* (allowlisted vocabulary keys) + serializable
 * props do. The guest can *name* a `type` and pass serialized props; it cannot inject a
 * component, markup, raw HTML, or a handler function — events bridge back by handler id.
 */
import { createElement, Fragment, useEffect, useState, type ReactNode } from 'react';
import type {
    RemoteReceiverNode,
    RemoteReceiverParent,
    RemoteReceiverRoot,
} from '@remote-dom/core/receivers';
import { NODE_TYPE_TEXT, NODE_TYPE_ELEMENT } from '@remote-dom/core';
import type { HostReceiver } from './receiver.js';
import { DEFAULT_BLOCK_VOCABULARY, type BlockVocabulary } from './vocabulary.js';

/** True in a dev build; a refused block shows a visible placeholder only in dev. */
function isDev(): boolean {
    return typeof process === 'undefined' || process.env?.NODE_ENV !== 'production';
}

export interface RenderTreeOptions {
    /** The frame-aligned block vocabulary to resolve element types through. */
    vocabulary: BlockVocabulary;
    fire: (listenerValue: unknown, payload: unknown) => void;
}

function renderNode(node: RemoteReceiverNode, opts: RenderTreeOptions, key: number): ReactNode {
    if (node.type === NODE_TYPE_TEXT) {
        return createElement(Fragment, { key }, node.data);
    }
    if (node.type === NODE_TYPE_ELEMENT) {
        // Resolve the guest-named type through the frame vocabulary — total: a type
        // no one registered resolves to `undefined` and is refused.
        const Comp = opts.vocabulary.resolveBlock(node.element);
        if (!Comp) {
            // VOCABULARY ENFORCEMENT — guest named a type the host does not own.
            if (!isDev()) return null; // prod: nothing rendered.
            return createElement(
                'div',
                { key, 'data-frame-remote-blocked': node.element, style: { color: 'var(--stud-danger)', fontSize: 12 } },
                `⛔ unknown block <${String(node.element)}> — not in host vocabulary`,
            );
        }
        const children = () => renderChildren(node, opts);
        return createElement(Fragment, { key }, Comp(node, { fire: opts.fire, children }));
    }
    // comment nodes render nothing
    return null;
}

function renderChildren(parent: RemoteReceiverParent, opts: RenderTreeOptions): ReactNode {
    return parent.children.map((child, i) => renderNode(child, opts, i));
}

/** Pure projection: render a root node's children through a block vocabulary. */
export function renderRemoteTree(root: RemoteReceiverRoot, opts: RenderTreeOptions): ReactNode {
    return renderChildren(root, opts);
}

export interface RemoteSurfaceProps {
    /** The host receiver whose reconciled tree to paint. */
    host: HostReceiver;
    /** The block vocabulary to paint from; defaults to the built-in frame-aligned one. */
    vocabulary?: BlockVocabulary;
}

/**
 * A React component that subscribes to the host receiver and repaints the remote
 * tree from the frame-aligned block vocabulary on every mutation. This is the
 * "editor surface" seam — a first-party surface into which an untrusted publisher's
 * block is painted, with no iframe.
 */
export function RemoteSurface({ host, vocabulary = DEFAULT_BLOCK_VOCABULARY }: RemoteSurfaceProps): ReactNode {
    const [version, setVersion] = useState(0);
    useEffect(() => host.subscribeRoot(() => setVersion((v) => v + 1)), [host]);
    // `version` forces a re-read of the live receiver tree.
    void version;
    return renderRemoteTree(host.root, { vocabulary, fire: (l, p) => host.fire(l, p) });
}
