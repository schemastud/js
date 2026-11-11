import { RemoteReceiver, RemoteReceiverRoot, RemoteReceiverNode, RemoteReceiverElement } from '@remote-dom/core/receivers';
export { RemoteReceiverElement, RemoteReceiverNode, RemoteReceiverRoot } from '@remote-dom/core/receivers';
import { RemoteMutationRecord } from '@remote-dom/core';
import { ReactNode } from 'react';
import { WidgetRegistry } from '@schemastud/seam';
export { c as BLOCK_TYPES, a as BlockProps, B as BlockType, d as CAPABILITY_NAMES, C as CapabilityName, b as ComponentManifest, E as EvaluateManifestOptions, H as HandlerProp, L as LoadDecision, e as LoadDecisionKind, f as TIER_CAPABILITIES, T as TrustTier, g as evaluateManifest, i as isKnownCapability, r as readManifest, t as tierGrants } from './manifest-DGhDZotE.js';

/**
 * The host-side receiver: the trusted end of the remote-dom connection.
 *
 * It wraps a real `@remote-dom/core` `RemoteReceiver` (the DOM-agnostic one, so it
 * works in Node/jsdom and in a real browser identically). The guest's mutation
 * stream flows in through `receiver.connection.mutate(...)`; the reconciled tree is
 * read from `receiver.root`. Events flow back OUT through the caller-supplied
 * `dispatchToGuest` — never a function across the wire, only a handler id + JSON
 * payload (see protocol.ts).
 *
 * This class is deliberately framework-agnostic: it exposes the plain receiver tree
 * + a subscribe hook + a `fire(...)` back-channel. The React renderer (render.tsx)
 * sits on top; a non-React host could paint the same tree.
 */

interface HostReceiverOptions {
    /**
     * Called when a painted component fires a browser event. The embedder forwards
     * this to the guest VM (`GuestVm.dispatchEvent`). The handler id is the value
     * the guest stored on the element's event listener; the payload is host-minted
     * (e.g. `{ value }` for an input).
     */
    dispatchToGuest: (handlerId: string, payload: unknown) => void;
}
declare class HostReceiver {
    private readonly options;
    readonly receiver: RemoteReceiver;
    constructor(options: HostReceiverOptions);
    /** The plain-JS root of the reconciled remote tree. */
    get root(): RemoteReceiverRoot;
    /**
     * Apply a batch of guest mutation records. This is the single inbound seam from
     * the isolated guest — wire it to the VM's `onMutate`.
     */
    applyMutations(records: readonly RemoteMutationRecord[]): void;
    /**
     * Subscribe to changes on the root's children (top-level tree). Returns an
     * unsubscribe function.
     */
    subscribeRoot(onChange: (root: RemoteReceiverRoot) => void): () => void;
    subscribeNode(node: {
        id: string;
    }, onChange: (node: RemoteReceiverNode) => void): () => void;
    /**
     * Fire an event back to the guest by handler id. `listenerValue` is whatever the
     * guest wrote as the event-listener property — we accept the `{ __frameRemoteHandler }`
     * ref shape and drop anything else (a guest that sent a non-ref is simply inert).
     */
    fire(listenerValue: unknown, payload: unknown): void;
}

/**
 * The host-owned allowlisted component vocabulary.
 *
 * These are real first-party React components with first-party styles. The guest
 * may only *name* these element types (in its remote-dom `element` field); any type
 * not in this map is DROPPED by the renderer, never painted. This is the whole
 * portability + security contract: "our guardrails, their discretion."
 *
 * Ports the spike's 7 types to production shape. Each renderer receives the
 * reconciled remote element plus a `fire` back-channel (by handler id) and a
 * `children` slot.
 */

interface RenderContext {
    /** Fire an event back to the guest. `listenerValue` is the guest's stored ref. */
    fire: (listenerValue: unknown, payload: unknown) => void;
    /** Render this element's children (already reconciled). */
    children: () => ReactNode;
}
type HostComponent = (element: RemoteReceiverElement, ctx: RenderContext) => ReactNode;
/**
 * The default vocabulary. A host can extend/replace this map — the registry is
 * host-owned by construction.
 */
declare const DEFAULT_ALLOWLIST: Record<string, HostComponent>;

/**
 * A frame-aligned block registry. Its public shape is exactly seam's `WidgetRegistry`
 * (`registerWidget` / `resolveWidget` / `resolveEntry`), plus a `resolveBlock`
 * convenience that maps a bare block-type key to its host renderer (or `undefined`).
 */
interface BlockVocabulary extends WidgetRegistry {
    /** Resolve a remote block's element type-name to its host renderer, or `undefined`. */
    resolveBlock: (type: string) => HostComponent | undefined;
}
/**
 * Register a block component into a frame-aligned vocabulary. This is the SAME
 * mechanism frame uses to register a widget — the block's `type` is the vocabulary
 * key, exactly as a widget's key is its schema type / `x-widget` name.
 */
declare function registerBlock(registry: WidgetRegistry, type: string, component: HostComponent): void;
/**
 * Build a fresh frame-aligned block vocabulary seeded with the default allowlist.
 * The seven RCP-01 host components are registered through seam's `registerWidget`
 * seam, so behaviour is preserved but the mechanism is now the frame vocabulary.
 */
declare function createBlockVocabulary(allowlist?: Record<string, HostComponent>): BlockVocabulary;
/**
 * The default frame-aligned vocabulary: the seven first-party blocks, resolved
 * through seam. A host extends it with `registerBlock(vocab, ...)` exactly as it
 * extends the frame widget registry.
 */
declare const DEFAULT_BLOCK_VOCABULARY: BlockVocabulary;

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

interface RenderTreeOptions {
    /** The frame-aligned block vocabulary to resolve element types through. */
    vocabulary: BlockVocabulary;
    fire: (listenerValue: unknown, payload: unknown) => void;
}
/** Pure projection: render a root node's children through a block vocabulary. */
declare function renderRemoteTree(root: RemoteReceiverRoot, opts: RenderTreeOptions): ReactNode;
interface RemoteSurfaceProps {
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
declare function RemoteSurface({ host, vocabulary }: RemoteSurfaceProps): ReactNode;

/**
 * The SEMVER of the block vocabulary contract — the single source of truth for "which
 * vocabulary a component was built against". This is the CODE-version seam RCP-06 adds:
 * the data-manifest parity (a remote block *names* an allowlisted type) never covered
 * "the component's code targets a DIFFERENT SHAPE of that vocabulary than the host now
 * ships". `vocabulary-spec.ts` owns WHAT the vocabulary is (the type/prop shapes);
 * this module owns WHICH VERSION of that shape the host is currently on.
 *
 * ## The compatibility rule (documented in README + VERIFY, pinned by a test)
 * We version the vocabulary by semver and gate on the MAJOR only:
 *   - **same major** = COMPATIBLE. A minor/patch bump is ADDITIVE ONLY — a new
 *     allowlisted block, a new optional prop, a new capability the host *offers*. A
 *     component built against `2.0` still renders on host `2.7`: everything it names
 *     still exists and still means the same thing.
 *   - **different major** = INCOMPATIBLE. A major bump is the ONLY place a block may be
 *     removed/renamed or a prop's meaning may change. A component built against major N
 *     cannot be trusted to render correctly on major M≠N, so the host must NOT paint it
 *     as if nothing changed (that is the "silent runtime break" RCP-06 forbids).
 *
 * A publisher targets a stable major (`vocabularyMajor` in their manifest) and is
 * guaranteed forward-compatibility across every minor/patch the host ships under it.
 *
 * ## Single-sourced
 * `VOCABULARY_MAJOR` is derived from `VOCABULARY_VERSION` — there is exactly one string
 * to bump. The documented major (README/VERIFY) is pinned to this constant by
 * `version.test.ts`, mirroring the `vocabulary-spec` drift guard: the docs and the code
 * cannot silently disagree about which major publishers may target.
 */
/**
 * The vocabulary contract version, semver. Bump the MAJOR only on a breaking vocabulary
 * change (a removed/renamed block, a changed prop meaning, a removed capability); bump
 * minor/patch for purely additive changes. This is the one string that moves.
 */
declare const VOCABULARY_VERSION: "1.0.0";
/**
 * The current vocabulary MAJOR, derived from {@link VOCABULARY_VERSION}. The host
 * compares a component's declared `vocabularyMajor` against THIS number at load time
 * (manifest.ts) — same major renders, different major is refused-or-shimmed.
 */
declare const VOCABULARY_MAJOR: number;

export { type BlockVocabulary, DEFAULT_ALLOWLIST, DEFAULT_BLOCK_VOCABULARY, type HostComponent, HostReceiver, type HostReceiverOptions, RemoteSurface, type RemoteSurfaceProps, type RenderContext, type RenderTreeOptions, VOCABULARY_MAJOR, VOCABULARY_VERSION, createBlockVocabulary, registerBlock, renderRemoteTree };
