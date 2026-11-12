import * as react from 'react';
import { ReactNode } from 'react';
import { k as Row, R as ResourceKey, v as WidgetShellProps } from './types-C1zrU238.js';
import { SchemaNode, WidgetRegistry } from '@schemastud/seam';
import '@schemastud/facets';
import '@rjsf/utils';
import '@schemastud/ui';

type FlushFn = () => void | Promise<void>;
/** The node-attrs channel impl a widget plugs in (real impl lands in ED-07). */
interface NodeAccess {
    getNode(nodeId: string): unknown | null;
    setNodeAttrs(nodeId: string, attrs: Record<string, unknown>): void;
}
/** A required-child deficit: a parent short of `min` children of a category (ED-13). */
interface RequiredSlot {
    parentId: string;
    category: string;
    min: number;
    filled: number;
}
/** The document conformance the editor publishes for the status bar (ED-14). */
interface Conformance {
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
interface EditShellMountValue {
    selectedNodeId: string | null;
    selectNode(nodeId: string | null): void;
    /** Imperative scroll-into-view; delegates to the widget's registered handler. */
    revealNode(nodeId: string): void;
    registerRevealHandler(handler: (nodeId: string) => void): () => void;
    dirty: boolean;
    markDirty(dirty: boolean): void;
    /** A commit is in flight — drives the "Saving…" pill state (ED-10). */
    saving: boolean;
    markSaving(saving: boolean): void;
    registerFlush(flush: FlushFn): () => void;
    flush(): Promise<void>;
    candidates: readonly unknown[];
    publishCandidates(candidates: readonly unknown[]): void;
    registerInsertHandler(handler: (candidate: unknown) => void): () => void;
    insert(candidate: unknown): void;
    registerNodeAccess(access: NodeAccess): () => void;
    getNode(nodeId: string): unknown | null;
    setNodeAttrs(nodeId: string, attrs: Record<string, unknown>): void;
    conformance: Conformance | null;
    publishConformance(conformance: Conformance | null): void;
}
/**
 * Create the mount controller. State (selection / dirty / candidates) is React
 * state so panes re-render; the registration slots (flush set, reveal / insert /
 * node-access handlers) are refs a widget plugs into and unplugs on unmount.
 */
declare function useEditShellMountController(): EditShellMountValue;
declare function EditShellMountProvider({ value, children, }: {
    value: EditShellMountValue;
    children: ReactNode;
}): react.JSX.Element;
/** Read the mount handshake; throws outside a `mounts:'widget'` route. */
declare function useEditShellMount(): EditShellMountValue;

/**
 * What a full-surface (heavyweight) editor receives from `WidgetSurface` (`WidgetShell`, `FiveRegionEditShell`):
 * frame's own props, not RJSF's (ruling 04 §5). The lock is `readonly`, RJSF's spelling, the one every widget
 * receives; `formData` and `value` both carry the record, because hosts read either.
 */
interface HeavyweightWidgetProps<R = Row> {
    schema: SchemaNode;
    /** The whole record. */
    formData: R;
    /** The same record. */
    value: R;
    readonly: boolean;
    onChange?: (data: R) => void;
    onSubmit?: (data: R) => void;
    editShellMount: EditShellMountValue;
}
/**
 * The pure, props-driven surface: resolve the named heavyweight widget from the
 * registry and mount it full-surface over the record. The `edit` context never
 * suppresses a heavyweight widget (only `row-cell` does), so it mounts whole.
 */
declare function WidgetSurface({ schema, record, widget, registry: registryProp, readOnly, onChange, onSubmit, mount: mountProp, }: {
    schema: SchemaNode;
    record?: Row;
    widget: string;
    registry?: WidgetRegistry;
    readOnly?: boolean;
    onChange?: (data: Row) => void;
    onSubmit?: (data: Row) => void;
    /** The EditShellMount handshake; a standalone surface makes its own. */
    mount?: EditShellMountValue;
}): react.JSX.Element;
/**
 * The route shell (peer of EditShell): fetches the resource's form schema +
 * record and mounts its heavyweight widget full-surface. `splicewire` mode so the
 * widget receives the host-enriched schema. Non-widget routes (EditShell /
 * ListShell) are untouched, and heavyweight-in-cell suppression still lives in
 * `resolveWidgetFor` unchanged.
 */
declare function WidgetShell<K extends ResourceKey = ResourceKey>(typed: WidgetShellProps<K>): react.JSX.Element;

type CollapseLevel = 0 | 1 | 2;
interface CollapseModes {
    palette: 'pane' | 'rail' | 'drawer';
    inspector: 'pane' | 'drawer';
    canvasFullBleed: boolean;
}
declare function deriveCollapseLevel(width: number): CollapseLevel;
declare function collapseModes(level: CollapseLevel): CollapseModes;

interface FiveRegionEditShellProps {
    /** The resolved form schema the editor widget mounts over. */
    schema: SchemaNode;
    /** The record the editor edits. */
    record?: Row;
    /** The registered heavyweight editor-widget name mounted in the canvas. */
    widget: string;
    /** Widget registry (falls back to the seam context). */
    registry?: WidgetRegistry;
    readOnly?: boolean;
    /** Extra top-bar content, rendered beside the save pill / mode toggle. */
    topBar?: ReactNode;
    /** Palette region content — defaults to the hoisted PalettePane (ED-09). */
    palette?: ReactNode;
    /** Inspector region content; omitted retains the schema-driven Inspector. */
    inspector?: ReactNode;
    /** Status region content — a stub until ED-14. */
    status?: ReactNode;
    /**
     * Persistence is autosave-by-default; the manual Save action shows only when
     * a host turns autosave OFF (ED-10).
     */
    autosave?: boolean;
    onSave?: () => void;
    /** Show the `Rich | Source` toggle. Defaults on; the editor always opens Rich. */
    sourceToggle?: boolean;
    /** Force a responsive collapse level (0/1/2); otherwise derived from width (ED-11). */
    collapseLevel?: CollapseLevel;
}
declare function FiveRegionEditShell({ schema, record, widget, registry, readOnly, topBar, palette, inspector, status, autosave, onSave, sourceToggle, collapseLevel, }: FiveRegionEditShellProps): react.JSX.Element;

declare function Inspector(): react.JSX.Element;

declare function PalettePane(): react.JSX.Element;

declare function MissingSlots(): react.JSX.Element | null;

declare function SavePill(): react.JSX.Element;

declare function StatusBar(): react.JSX.Element;

export { type CollapseLevel, type CollapseModes, type Conformance, EditShellMountProvider, type EditShellMountValue, FiveRegionEditShell, type FiveRegionEditShellProps, type FlushFn, type HeavyweightWidgetProps, Inspector, MissingSlots, type NodeAccess, PalettePane, type RequiredSlot, SavePill, StatusBar, WidgetShell, WidgetShellProps, WidgetSurface, collapseModes, deriveCollapseLevel, useEditShellMount, useEditShellMountController };
