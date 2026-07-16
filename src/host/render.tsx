/**
 * The React host renderer: walks the reconciled remote tree and paints each node
 * from the host-owned allowlist. A node whose `element` type is NOT in the
 * allowlist is refused (rendered as a visible "blocked" marker), never painted.
 *
 * This is a pure, controlled projection of the receiver tree — no guest markup, CSS
 * or DOM ever crosses; only element *names* + serializable props do.
 */
import { createElement, Fragment, useEffect, useState, type ReactNode } from 'react';
import type {
    RemoteReceiverNode,
    RemoteReceiverParent,
    RemoteReceiverRoot,
} from '@remote-dom/core/receivers';
import { NODE_TYPE_TEXT, NODE_TYPE_ELEMENT } from '@remote-dom/core';
import type { HostReceiver } from './receiver.js';
import { DEFAULT_ALLOWLIST, type HostComponent } from './allowlist.js';

export interface RenderTreeOptions {
    allowlist: Record<string, HostComponent>;
    fire: (listenerValue: unknown, payload: unknown) => void;
}

function renderNode(node: RemoteReceiverNode, opts: RenderTreeOptions, key: number): ReactNode {
    if (node.type === NODE_TYPE_TEXT) {
        return createElement(Fragment, { key }, node.data);
    }
    if (node.type === NODE_TYPE_ELEMENT) {
        const Comp = opts.allowlist[node.element];
        if (!Comp) {
            // ALLOWLIST ENFORCEMENT — guest named a type the host does not own.
            return createElement(
                'div',
                { key, 'data-frame-remote-blocked': node.element, style: { color: '#d6336c', fontSize: 12 } },
                `⛔ blocked non-allowlisted <${String(node.element)}>`,
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

/** Pure projection: render a root node's children from an allowlist. */
export function renderRemoteTree(root: RemoteReceiverRoot, opts: RenderTreeOptions): ReactNode {
    return renderChildren(root, opts);
}

export interface RemoteSurfaceProps {
    /** The host receiver whose reconciled tree to paint. */
    host: HostReceiver;
    /** The allowlist to paint from; defaults to the built-in vocabulary. */
    allowlist?: Record<string, HostComponent>;
}

/**
 * A React component that subscribes to the host receiver and repaints the remote
 * tree from the allowlist on every mutation. This is the "editor surface" seam — a
 * first-party surface into which an untrusted publisher's block is painted, with no
 * iframe.
 */
export function RemoteSurface({ host, allowlist = DEFAULT_ALLOWLIST }: RemoteSurfaceProps): ReactNode {
    const [version, setVersion] = useState(0);
    useEffect(() => host.subscribeRoot(() => setVersion((v) => v + 1)), [host]);
    // `version` forces a re-read of the live receiver tree.
    void version;
    return renderRemoteTree(host.root, { allowlist, fire: (l, p) => host.fire(l, p) });
}
