import { ComponentType, ReactNode } from 'react';
import { SchemaNode } from '@schemastud/seam';
import { ListFiltersState } from '@schemastud/facets';
import { R as ResourceKey, F as FrameColumn, a as RowOf, b as ContextManifest, O as OpenedOf, c as FieldOf, L as ListSlots, d as ResourceCollectionAddress, P as PaginationSlotProps, e as FrameNotice } from './types-C1zrU238.js';

/** What `useListShell` takes: `ListShell`'s behaviour props. */
/** What `useListShell` takes, typed by the resource key (ruling 03). */
interface ListShellOptions<K extends ResourceKey = ResourceKey> extends ListShellOptionsOf<K> {
}
/** What `useListShell` returns, typed by the resource key (ruling 03). */
interface ListShellState<K extends ResourceKey = ResourceKey> extends ListShellStateOf<K> {
}
/** @internal `ListShellOptions` over any string key: frame's own untyped view. Not a root export. */
interface ListShellOptionsOf<K extends string> {
    resource: K;
    /** Per-field overrides on the columns. With a manifest the columns are its `list-column` set. */
    columns?: FrameColumn<RowOf<K>>[];
    /** Else the injection's lookup (a kit's manifest). */
    manifest?: ContextManifest;
    onOpen?: (record: OpenedOf<K>) => void;
    onCellCommit?: (record: RowOf<K>, field: FieldOf<RowOf<K>>, value: unknown) => void;
    /** Per slot: this page's, then the injection's `listSlots`, then frame's default. */
    slots?: Partial<ListSlots>;
}
/** A list's behaviour: the request, the rows and their state, and what renders them. `ListShell` renders it. */
/** @internal `ListShellState` over any string key: frame's own untyped view. Not a root export. */
interface ListShellStateOf<K extends string> {
    resource: K;
    manifest: ContextManifest | undefined;
    /** Facets' filter state: values, sort, sortable fields, the filter schema. */
    filters: ListFiltersState;
    /** The effective request: facets' request params with the selected collection. */
    requestParams: Record<string, string>;
    collection: {
        choices: ResourceCollectionAddress[];
        selected: string | undefined;
        select(stem: string): void;
    };
    /** One discriminant, so a failed read (which also has no rows) is never shown as empty. */
    status: 'loading' | 'error' | 'empty' | 'ready';
    rows: RowOf<K>[];
    error: unknown;
    retry(): void;
    /** A length-aware page's total; `null` for a cursor page or before data. */
    total: number | null;
    /** A request is in flight (fetching, or the rows shown are the previous request's): the busy dim. */
    pending: boolean;
    /** The rows shown belong to the previous request. */
    placeholder: boolean;
    /** With `empty`, it can still be visible, so an emptied high page can page back. */
    pagination: {
        visible: boolean;
        props: PaginationSlotProps | null;
    };
    /** Resolved through the manifest, with `row-cell` editable cells wired. */
    columns: FrameColumn<RowOf<K>>[];
    view: 'table' | 'cards';
    rootSchema: SchemaNode;
    /** The cards path's card, bound to the manifest. */
    Card: ComponentType<{
        record: RowOf<K>;
    }>;
    /** Declared row actions and the record actions this actor may press, bound; absent when the resource has none. */
    RowActions: ComponentType<{
        record: RowOf<K>;
    }> | undefined;
    /** The resource-scope action bar, bound to the resource, `navigate` and `notice`; `undefined` when none is pressable. */
    ResourceActions: ComponentType | undefined;
    create: {
        canCreate: boolean;
        framesCreate: boolean;
        singularLabel: string | undefined;
        onNew: (() => void) | undefined;
    };
    notice: {
        element: ReactNode;
        onNotice: (notice: FrameNotice) => void;
    };
    /** `onOpen`, as the action bar's navigate. */
    navigate: ((record: RowOf<K>) => void) | undefined;
    /** Each slot resolved across its three tiers. `Filters` absent means facets' own bar; `RowActions` absent means none. */
    slots: Required<Omit<ListSlots, 'Filters' | 'RowActions'>> & Pick<Partial<ListSlots>, 'Filters' | 'RowActions'>;
}
/**
 * A list's behaviour as a hook (ruling 02 §6): the request (collection, filters, sort, paging), rows and their
 * state, resolved columns with editable cells, the create affordance, declared row and record actions as bound
 * components, the table-or-cards decision and the resolved slot set. `ListShell` is its default rendering; a
 * custom table calls it and draws its own markup. It reads `manifestFor` and `can` from the injection and never
 * a kit's `useManifest()`, so it works under any provider.
 */
declare function useListShell<K extends ResourceKey = ResourceKey>(options: ListShellOptions<K>): ListShellState<K>;

export { type ListShellState as L, type ListShellOptions as a, useListShell as u };
