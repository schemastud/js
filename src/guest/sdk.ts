/**
 * `@schemastud/frame-remote/sdk` — the published guest AUTHORING surface.
 *
 * This is the module a remote publisher imports and authors a component against,
 * off-repo. Its whole job is authoring-DX parity with writing a local frame block:
 * you `h('Card', {...}, [...])`, declare props with autocomplete, register handlers by
 * writing an `onClick`/`onInput` callback, and compose children — and the type of the
 * allowlisted block is the type of the block the host actually paints. Name a type the
 * host does not own, or pass a prop it never reads, and it is a COMPILE error (the
 * allowlist is the vocabulary — see vocabulary-spec.ts, single-sourced with the host
 * allowlist).
 *
 * Isolation is preserved by construction: this module exposes ONLY the vocabulary +
 * `h`/`text`/`render`. It cannot NAME a host DOM, `window`, `document`, `fetch`, a
 * credential, or the host receiver — none of them are imported, referenced, or in the
 * types. Authoring against it cannot even spell those. The one thing it touches at
 * runtime is the in-VM `FrameRemote` bridge (`globalThis.FrameRemote`, installed by
 * the guest runtime, runtime.ts) — the exact same primitive an in-repo guest string
 * uses ambiently. So the SAME authored component shape works whether it is written as
 * an in-repo guest (RCP-03) or built off-repo through this SDK and loaded via the VM:
 * the trusted → untrusted graduation needs no rewrite.
 *
 * Why bind to a global instead of importing the runtime: the authored bundle is
 * evaluated *inside the QuickJS realm*, where `FrameRemote` already exists as a global
 * (the host injected the runtime before loading guest source). There is no module to
 * import in that realm; the SDK is a thin, fully-inlinable typed façade over the
 * ambient bridge. It carries no host/VM/quickjs code, so a bundle built against it is
 * host-free.
 */
import type { BlockProps, BlockType } from '../host/vocabulary-spec.js';

export type { BlockType, BlockProps, HandlerProp } from '../host/vocabulary-spec.js';

/**
 * An authored element descriptor — the same `{ type, props, children }` shape the
 * in-VM runtime's `h(...)` produces. Opaque to the author; produced by `h`/`text` and
 * consumed by `render` (or nested as a child).
 */
export interface Element {
    readonly type: string;
    readonly props: Record<string, unknown>;
    readonly children: readonly Node[];
}

/** A text leaf descriptor. */
export interface TextNode {
    readonly text: string;
}

/** Anything that can be a child: an element, a text leaf, or a bare string/number. */
export type Node = Element | TextNode | string | number;

/**
 * The result of a brokered capability call (RCP-05). Either an allowed result the host
 * ran server-side, or a refusal reason — never a credential, and never thrown.
 */
export interface CapabilityResult<T = unknown> {
    readonly ok: boolean;
    readonly data?: T;
    readonly reason?: string;
}

/** The ambient in-VM bridge the guest runtime installs. Present only inside the VM. */
interface FrameRemoteBridge {
    h(type: string, props?: Record<string, unknown>, children?: unknown): Element;
    text(value: unknown): TextNode;
    render(tree: Node | readonly Node[]): void;
    capability(name: string, args?: unknown): CapabilityResult;
}

/**
 * Resolve the ambient bridge the host injected into the VM realm. Not exported: an
 * author never touches it. Throwing here (rather than importing anything) is what keeps
 * the SDK host-free — there is no fallback that could reach a browser global.
 */
function bridge(): FrameRemoteBridge {
    const fr = (globalThis as { FrameRemote?: FrameRemoteBridge }).FrameRemote;
    if (!fr) {
        throw new Error(
            '@schemastud/frame-remote/sdk: FrameRemote bridge is not present. ' +
                'This module must be evaluated inside the frame-remote guest VM.',
        );
    }
    return fr;
}

/**
 * Author an allowlisted block. `T` is constrained to the vocabulary, so:
 *   - `h('Card', ...)` is fine; `h('Marquee', ...)` is a compile error (not in the
 *     vocabulary — the allowlist is the type).
 *   - the `props` argument is typed to that block's `BlockProps[T]` — autocomplete on
 *     its props, an error on a prop the host never reads, and handler props typed by
 *     the payload the host mints for that event.
 * The children arg mirrors the in-VM runtime: a single node, an array, or omitted.
 */
export function h<T extends BlockType>(
    type: T,
    props?: BlockProps[T],
    children?: Node | readonly Node[],
): Element {
    return bridge().h(type, props as Record<string, unknown> | undefined, children);
}

/** Author a text leaf (equivalent to passing a bare string child). */
export function text(value: string | number): TextNode {
    return bridge().text(value);
}

/**
 * Paint a tree as the block's current view. Call it again (typically from a handler)
 * to re-render — the runtime diffs against the host root. This is the whole render
 * surface: the author declares a tree, the host paints it through the allowlist.
 */
export function render(tree: Node | readonly Node[]): void {
    bridge().render(tree);
}

/**
 * Optional ergonomic wrapper for a stateful component: `defineComponent(setup)` runs
 * `setup` immediately, giving the author a `render` bound to this component. This is
 * purely authoring sugar over `render`; it adds no capability. A component that keeps
 * state in a closure and calls `ctx.render(view())` from a handler is the parity shape
 * with the in-repo interactive guest.
 */
/**
 * Invoke a brokered capability by NAME (RCP-05) — the guest's one path to host
 * authority. The guest holds an injected scoped token it can never read; calling
 * `capability('resolve', { id })` routes through the host, which presents that token to
 * the server-side broker, runs the capability inside the token's grant + scope, and
 * returns the result. Anything outside the grant or scope comes back
 * `{ ok: false, reason }` — a mis-asking guest degrades, it never crashes and never
 * reaches a credential, a host DOM, or a raw fetch. This is the whole trust surface.
 */
export function capability<T = unknown>(name: string, args?: unknown): CapabilityResult<T> {
    return bridge().capability(name, args) as CapabilityResult<T>;
}

export interface ComponentContext {
    /** Paint (or repaint) this component's tree. */
    render: (tree: Node | readonly Node[]) => void;
    /** Invoke a brokered capability by name — same as the free {@see capability}. */
    capability: <T = unknown>(name: string, args?: unknown) => CapabilityResult<T>;
}

export function defineComponent(setup: (ctx: ComponentContext) => void): void {
    setup({ render, capability });
}
