import { createContext, useContext, useMemo, useRef, useState, type ReactNode } from 'react';

// ED-05 — the single `EditShellMount` context a heavyweight widget plugs into at
// mount (provided by the `mounts:'widget'` route, ED-04). It carries ALL FIVE
// shell↔widget concerns as ONE handshake rather than N ad-hoc channels, and is
// scoped to the mount — a fresh controller per WidgetSurface, gone on
// navigate-away (the provider unmounts with the route).
//
// Selection vs reveal (banked build-time question, resolved): selection is
// persistent state ("this node IS selected"); reveal is an imperative one-shot
// ("scroll to it NOW"). They are distinct — a pane can reveal without changing
// selection, and can re-reveal the already-selected node (which a state-only
// channel cannot express). So the channel carries BOTH `selectNode` (state) and
// `revealNode` (verb).

export type FlushFn = () => void | Promise<void>;

/** The node-attrs channel impl a widget plugs in (real impl lands in ED-07). */
export interface NodeAccess {
    getNode(nodeId: string): unknown | null;
    setNodeAttrs(nodeId: string, attrs: Record<string, unknown>): void;
}

/** A required-child deficit: a parent short of `min` children of a category (ED-13). */
export interface RequiredSlot {
    parentId: string;
    category: string;
    min: number;
    filled: number;
}

/** The document conformance the editor publishes for the status bar (ED-14). */
export interface Conformance {
    /** PM descendant node count. */
    nodes: number;
    /** Sum of every required-child minimum across the doc. */
    requiredTotal: number;
    /** How many required slots are satisfied. */
    requiredFilled: number;
    /** Whether a loaded doc satisfies the PM schema. */
    grammarValid: boolean;
    /** Ids of structurally-incomplete nodes (absent-category on the parent id,
     * present-but-empty on the child id — both listed). */
    incompleteNodeIds: readonly string[];
    /** Per-parent required-category deficits (ED-13 B7) — drives the Missing cards. */
    requiredSlots?: readonly RequiredSlot[];
}

export interface EditShellMountValue {
    // --- selection channel (bare nodeId — no type/schema resolution here) ---
    selectedNodeId: string | null;
    selectNode(nodeId: string | null): void;
    /** Imperative scroll-into-view; delegates to the widget's registered handler. */
    revealNode(nodeId: string): void;
    registerRevealHandler(handler: (nodeId: string) => void): () => void;

    // --- dirty/saved state (widget → shell, drives the ● Saved indicator) ---
    dirty: boolean;
    markDirty(dirty: boolean): void;
    /** A commit is in flight — drives the "Saving…" pill state (ED-10). */
    saving: boolean;
    markSaving(saving: boolean): void;

    // --- commitBus flush registration (shell drains before persist + navigate) ---
    registerFlush(flush: FlushFn): () => void;
    flush(): Promise<void>;

    // --- palette channel (method seams; impls land in ED-07/09) ---
    candidates: readonly unknown[];
    publishCandidates(candidates: readonly unknown[]): void;
    registerInsertHandler(handler: (candidate: unknown) => void): () => void;
    insert(candidate: unknown): void;

    // --- node-attrs channel (method seams; impl lands in ED-07) ---
    registerNodeAccess(access: NodeAccess): () => void;
    getNode(nodeId: string): unknown | null;
    setNodeAttrs(nodeId: string, attrs: Record<string, unknown>): void;

    // --- conformance channel (widget → status bar, ED-14) ---
    conformance: Conformance | null;
    publishConformance(conformance: Conformance | null): void;
}

const EditShellMountContext = createContext<EditShellMountValue | null>(null);

/**
 * Create the mount controller. State (selection / dirty / candidates) is React
 * state so panes re-render; the registration slots (flush set, reveal / insert /
 * node-access handlers) are refs a widget plugs into and unplugs on unmount.
 */
export function useEditShellMountController(): EditShellMountValue {
    const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
    const [dirty, setDirty] = useState(false);
    const [saving, setSaving] = useState(false);
    const [candidates, setCandidates] = useState<readonly unknown[]>([]);
    const [conformance, setConformance] = useState<Conformance | null>(null);

    const flushes = useRef<Set<FlushFn>>(new Set());
    const revealHandler = useRef<((nodeId: string) => void) | null>(null);
    const insertHandler = useRef<((candidate: unknown) => void) | null>(null);
    const nodeAccess = useRef<NodeAccess | null>(null);

    return useMemo<EditShellMountValue>(
        () => ({
            selectedNodeId,
            selectNode: setSelectedNodeId,
            revealNode: (nodeId) => revealHandler.current?.(nodeId),
            registerRevealHandler: (handler) => {
                revealHandler.current = handler;
                return () => {
                    if (revealHandler.current === handler) revealHandler.current = null;
                };
            },

            dirty,
            markDirty: setDirty,
            saving,
            markSaving: setSaving,

            registerFlush: (flush) => {
                flushes.current.add(flush);
                return () => {
                    flushes.current.delete(flush);
                };
            },
            flush: async () => {
                for (const flush of flushes.current) {
                    await flush();
                }
            },

            candidates,
            publishCandidates: setCandidates,
            registerInsertHandler: (handler) => {
                insertHandler.current = handler;
                return () => {
                    if (insertHandler.current === handler) insertHandler.current = null;
                };
            },
            insert: (candidate) => insertHandler.current?.(candidate),

            registerNodeAccess: (access) => {
                nodeAccess.current = access;
                return () => {
                    if (nodeAccess.current === access) nodeAccess.current = null;
                };
            },
            getNode: (nodeId) => nodeAccess.current?.getNode(nodeId) ?? null,
            setNodeAttrs: (nodeId, attrs) => nodeAccess.current?.setNodeAttrs(nodeId, attrs),

            conformance,
            publishConformance: setConformance,
        }),
        [selectedNodeId, dirty, saving, candidates, conformance],
    );
}

export function EditShellMountProvider({
    value,
    children,
}: {
    value: EditShellMountValue;
    children: ReactNode;
}) {
    return <EditShellMountContext.Provider value={value}>{children}</EditShellMountContext.Provider>;
}

/** Read the mount handshake; throws outside a `mounts:'widget'` route. */
export function useEditShellMount(): EditShellMountValue {
    const value = useContext(EditShellMountContext);
    if (!value) {
        throw new Error(
            '@schemastud/frame: useEditShellMount() outside an EditShellMount — a mounts:"widget" route (WidgetSurface) provides it.',
        );
    }
    return value;
}
