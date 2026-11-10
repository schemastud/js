import { useCallback, useEffect, useMemo, useRef, type ComponentType, type ReactNode } from 'react';
import type { SchemaNode } from '@schemastud/seam';
import { useListFilters, type ListFiltersState } from '@schemastud/facets';
import { useFrameInjection } from './context';
import { getPath } from './getPath';
import { resolveColumns } from './resolveColumns';
import { EditableCell } from './EditableCell';
import { SchemaView } from './SchemaView';
import { listItemRendersCards } from './listItemRendersCards';
import {
    DefaultCards,
    DefaultCell,
    DefaultEmpty,
    DefaultErrorState,
    DefaultLoading,
    DefaultPagination,
    DefaultRowActions,
    DefaultTable,
    DefaultToolbar,
} from './slots/defaults';
import { resolveRowActions } from './rowActions';
import { resolveActions } from './actions';
import { RecordActionButtons, ResourceActionBar, useInlineNotice } from './ResourceActions';
import { useRowList } from './data';
import { useListPagination } from './useListPagination';
import type { ContextManifest } from './contexts';
import type { FieldOf, ResourceKey, RowOf } from './resources';
import type {
    FrameColumn,
    FrameNotice,
    ListSlots,
    OpenedOf,
    PaginationSlotProps,
    ResourceCollectionAddress,
    Row,
} from './types';

/** No host column overrides: the manifest's `list-column` set is the column set. A constant, so memos stay stable. */
const NO_COLUMNS: FrameColumn[] = [];

/** What `useListShell` takes: `ListShell`'s behaviour props. */
/** What `useListShell` takes, typed by the resource key (ruling 03). */
export interface ListShellOptions<K extends ResourceKey = ResourceKey> extends ListShellOptionsOf<K> {}
/** What `useListShell` returns, typed by the resource key (ruling 03). */
export interface ListShellState<K extends ResourceKey = ResourceKey> extends ListShellStateOf<K> {}

/** @internal `ListShellOptions` over any string key: frame's own untyped view. Not a root export. */
export interface ListShellOptionsOf<K extends string> {
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
export interface ListShellStateOf<K extends string> {
    resource: K;
    manifest: ContextManifest | undefined;
    /** Facets' filter state: values, sort, sortable fields, the filter schema. */
    filters: ListFiltersState;
    /** The effective request: facets' request params with the selected collection. */
    requestParams: Record<string, string>;
    collection: { choices: ResourceCollectionAddress[]; selected: string | undefined; select(stem: string): void };
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
    pagination: { visible: boolean; props: PaginationSlotProps | null };
    /** Resolved through the manifest, with `row-cell` editable cells wired. */
    columns: FrameColumn<RowOf<K>>[];
    view: 'table' | 'cards';
    rootSchema: SchemaNode;
    /** The cards path's card, bound to the manifest. */
    Card: ComponentType<{ record: RowOf<K> }>;
    /** Declared row actions and the record actions this actor may press, bound; absent when the resource has none. */
    RowActions: ComponentType<{ record: RowOf<K> }> | undefined;
    /** The resource-scope action bar, bound to the resource, `navigate` and `notice`; `undefined` when none is pressable. */
    ResourceActions: ComponentType | undefined;
    create: { canCreate: boolean; framesCreate: boolean; singularLabel: string | undefined; onNew: (() => void) | undefined };
    notice: { element: ReactNode; onNotice: (notice: FrameNotice) => void };
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
export function useListShell<K extends ResourceKey = ResourceKey>(options: ListShellOptions<K>): ListShellState<K> {
    return useListShellOf(options);
}

/** @internal `useListShell` over any string key, which the shell calls (ruling 03: typed at the boundary). Not a root export. */
export function useListShellOf<K extends string>(options: ListShellOptionsOf<K>): ListShellStateOf<K> {
    // Typed by the key at the boundary (ruling 03); the behaviour itself reads rows as `Row`.
    const {
        resource,
        columns = NO_COLUMNS,
        manifest: manifestOption,
        onOpen,
        onCellCommit,
        slots,
    } = options as unknown as {
        resource: string;
        columns?: FrameColumn[];
        manifest?: ContextManifest;
        onOpen?: (record: Row | { id: null }) => void;
        onCellCommit?: (record: Row, field: string, value: unknown) => void;
        slots?: Partial<ListSlots>;
    };
    const { can, registry, listSlots, transport, useUrlState, manifestFor, notify } = useFrameInjection();
    // Handed in, else the injection's lookup (a kit's manifest).
    const manifest = manifestOption ?? manifestFor?.(resource);
    const [searchParams, setSearchParams] = useUrlState();
    const collections = manifest?.collections ?? [];
    const requestedCollection = searchParams.get('collection');
    const selectedCollection = collections.find((choice) => choice.stem === requestedCollection)?.stem
        ?? collections[0]?.stem;
    // Frame and Facets ship together; the source-level Facets hook accepts the
    // selected Collection in this slice even when a checked-in sibling dist is stale.
    const filters = (useListFilters as (resource: string, collection?: string) => ListFiltersState)(
        resource,
        selectedCollection,
    );
    const requestParams = selectedCollection
        ? { ...filters.requestParams, collection: selectedCollection }
        : filters.requestParams;

    useEffect(() => {
        if (!selectedCollection || requestedCollection === selectedCollection) return;
        setSearchParams((previous) => {
            const next = new URLSearchParams(previous);
            next.set('collection', selectedCollection);
            next.delete('page');
            next.delete('cursor');
            return next;
        });
    }, [requestedCollection, selectedCollection, setSearchParams]);

    const selectCollection = (stem: string) =>
        setSearchParams((previous) => {
            const next = new URLSearchParams(previous);
            next.set('collection', stem);
            for (const key of [...next.keys()]) {
                if (key === 'page' || key === 'cursor' || key === 'sort' || key === 'filterVariant' || key.startsWith('filter[')) {
                    next.delete(key);
                }
            }
            return next;
        });

    const query = useRowList(resource, requestParams);

    // Manifest folds list-column participation into the columns; absent → passthrough.
    const resolvedColumns = withEditableCells(
        resolveColumns(resource, filters.schema, columns, manifest, registry),
        manifest,
        filters.schema,
        registry,
        onCellCommit,
    );
    const canCreate = can('create', resource);
    // Does FRAME own the create affordance here? Resolved server-side onto the manifest from the
    // resource's `creatable` gate + its declared `createAffordance` slot. Absent a manifest (the
    // pure-passthrough path) it stays true, so every pre-manifest surface is byte-identical.
    //
    // ⚠️ Kept SEPARATE from `canCreate` rather than ANDed into it. See ToolbarSlotProps.
    const framesCreate = (manifest?.createAffordance ?? 'frame') === 'frame';

    // Slot resolution is PER SLOT across three tiers: this page's own `slots`, then the
    // injection's app-wide `listSlots` default (a host names its design system once at the
    // provider), then frame's plain-HTML default. A page overriding `Table` therefore still
    // inherits the host's `Cell`/`Empty`/`Pagination` instead of dropping back to bare HTML
    // for every key it did not restate.
    const resolvedSlots: ListShellStateOf<string>['slots'] = {
        Toolbar: slots?.Toolbar ?? listSlots?.Toolbar ?? DefaultToolbar,
        // Absent here means facets' own bar, which the renderer draws INLINE (see ListShell).
        Filters: slots?.Filters ?? listSlots?.Filters,
        // The Table slot contract is `ComponentType<any>` (ListSlots.Table), so the shell can thread
        // sort state to slots that render sortable headers (the plain default simply ignores it).
        Table: slots?.Table ?? listSlots?.Table ?? DefaultTable,
        Cards: slots?.Cards ?? listSlots?.Cards ?? DefaultCards,
        Cell: slots?.Cell ?? listSlots?.Cell ?? DefaultCell,
        Empty: slots?.Empty ?? listSlots?.Empty ?? DefaultEmpty,
        ErrorState: slots?.ErrorState ?? listSlots?.ErrorState ?? DefaultErrorState,
        Loading: slots?.Loading ?? listSlots?.Loading ?? DefaultLoading,
        Pagination: slots?.Pagination ?? listSlots?.Pagination ?? DefaultPagination,
    };
    // The cards path (realm-dashboards ticket 03). The root node a `list-item` entry resolves
    // against is the resource's list/filter schema — the same node `withEditableCells` reads its
    // properties from — with a bare object standing in until it arrives.
    const rootSchema = useMemo<SchemaNode>(
        () => (filters.schema as SchemaNode | undefined) ?? { type: 'object' },
        [filters.schema],
    );
    const cardsPath = manifest ? listItemRendersCards(manifest, rootSchema, registry) : false;
    // Memoized for the same reason `BoundRowActions` is: the Cards slot receives a COMPONENT
    // TYPE, and a fresh closure per render would remount every card on every render.
    const BoundCard = useMemo(
        () =>
            manifest
                ? ({ record }: { record: Row }) => (
                      <SchemaView
                          schema={rootSchema}
                          record={record}
                          manifest={manifest}
                          context="list-item"
                          registry={registry}
                      />
                  )
                : () => null,
        [manifest, rootSchema, registry],
    );
    // The verbs the RESOURCE declared. Frame's own row-actions column appears only when this is
    // non-empty — the gate is the DECLARATION, never the availability of a component. Gating it
    // on the design-system preset instead would have grown a delete column on every list at the
    // flagship the moment `shadcnListSlots` was named at the provider, which it is.
    const declaredRowActions = resolveRowActions(manifest);
    // Host tiers stay UNCONDITIONAL (unchanged): naming this slot on a page, or app-wide, is an
    // explicit statement. Frame's default is the last resort and the only declaration-gated one.
    const RowActions =
        slots?.RowActions ??
        listSlots?.RowActions ??
        (declaredRowActions.length > 0 ? DefaultRowActions : undefined);
    resolvedSlots.RowActions = RowActions;
    // The resource's declared RECORD actions this actor may press (ADR-0005). Rendered by frame BESIDE
    // whatever row-actions slot resolved, never through it: an action is a declaration, and a host's
    // own RowActions slot is presentation that knows nothing about it.
    const recordActions = resolveActions(manifest, 'record', transport);
    const inline = useInlineNotice();
    const onNotice = useCallback(
        (n: FrameNotice) => (notify ? notify(n) : inline.onNotice?.(n)),
        [notify, inline.onNotice],
    );
    const notice = { element: inline.element, onNotice };
    // The bound action components read the manifest through a ref: a refreshed but equal manifest must not change
    // their component type, which would remount them and close an open action dialog.
    const manifestRef = useRef(manifest);
    manifestRef.current = manifest;
    const navigate = onOpen ? (record: Row) => onOpen(record) : undefined;
    // Bind the three resource-level props once. Memoized because the Table receives a COMPONENT
    // TYPE: a fresh closure every render remounts the button, which drops the delete mutation's
    // own `isPending` and flickers the control mid-request.
    const BoundRowActions = useMemo(
        () =>
            RowActions && recordActions.length === 0
                ? ({ record }: { record: Row }) => (
                      // Byte-identical to the pre-action row for a resource that declares none.
                      <RowActions
                          record={record}
                          resource={resource}
                          actions={declaredRowActions}
                          singularLabel={manifest?.singularLabel || undefined}
                      />
                  )
                : recordActions.length > 0
                ? ({ record }: { record: Row }) => (
                      <div style={{ display: 'flex', gap: '0.25rem', justifyContent: 'flex-end' }}>
                          {recordActions.length > 0 ? (
                              <RecordActionButtons
                                  resource={resource}
                                  manifest={manifestRef.current}
                                  record={record}
                                  compact
                                  onNavigate={navigate}
                                  onNotice={notice.onNotice}
                              />
                          ) : null}
                          {RowActions ? (
                              <RowActions
                                  record={record}
                                  resource={resource}
                                  actions={declaredRowActions}
                                  singularLabel={manifest?.singularLabel || undefined}
                              />
                          ) : null}
                      </div>
                  )
                : undefined,
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [
            RowActions,
            resource,
            declaredRowActions.join(','),
            manifest?.singularLabel,
            recordActions.map((a) => a.key).join(','),
            onNotice,
            onOpen,
        ],
    );

    // The resource-scope actions, bound and memoized like the row actions so a press is not remounted mid-request.
    const resourceActionKeys = resolveActions(manifest, 'resource', transport).map((a) => a.key).join(',');
    const BoundResourceActions = useMemo(
        () =>
            resourceActionKeys === ''
                ? undefined
                : () => (
                      <ResourceActionBar resource={resource} manifest={manifestRef.current} onNavigate={navigate} onNotice={onNotice} />
                  ),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [resourceActionKeys, resource, onOpen, onNotice],
    );

    const rows: Row[] = query.data?.data ?? [];
    const pagination = useListPagination(resource, query.data, query.isFetching || query.isPlaceholderData);
    // Error before empty: a failed read also has zero rows, and ordering these the other way is exactly the
    // bug that rendered every 5xx on every Frame list as "No records." (api-surface-coherence 107).
    const status = query.isLoading ? 'loading' : query.isError ? 'error' : rows.length === 0 ? 'empty' : 'ready';

    return {
        resource,
        manifest,
        filters,
        collection: { choices: collections, selected: selectedCollection, select: selectCollection },
        status,
        rows,
        error: query.error,
        retry: () => void query.refetch(),
        total: query.data && !('nextCursor' in query.data) && typeof query.data.total === 'number' ? query.data.total : null,
        pending: query.isFetching || query.isPlaceholderData,
        placeholder: query.isPlaceholderData,
        requestParams,
        pagination: { visible: pagination.visible, props: pagination.props ?? null },
        columns: resolvedColumns,
        view: cardsPath && manifest ? 'cards' : 'table',
        rootSchema,
        Card: BoundCard,
        RowActions: BoundRowActions,
        ResourceActions: BoundResourceActions,
        create: {
            canCreate,
            framesCreate,
            singularLabel: manifest?.singularLabel || undefined,
            onNew: onOpen ? () => onOpen({ id: null }) : undefined,
        },
        notice,
        navigate,
        slots: resolvedSlots,
    } as unknown as ListShellStateOf<K>;
}

/**
 * FC-23 wiring: turn a resolved column into an editable-in-place cell ONLY when
 *   (a) a manifest is present (absent ⇒ untouched — not a gate),
 *   (b) the field participates in `row-cell`, AND
 *   (c) the HOST supplied no `cell` override (host-closure-wins-by-field).
 *
 * ⚠️ (c) is `cellSource !== 'host'`, not `!col.cell`, and the difference is load-bearing.
 * `resolveColumns` now also synthesizes a `cell` from the manifest's declared presentation
 * kind (`#[Column('badge')]`), and that is frame's own default rather than a host saying
 * "leave this alone". Testing for the mere presence of a `cell` would mean declaring a
 * presentation kind on a `row-cell` field silently turned it read-only — a declaration
 * revoking a different declaration, invisibly. An explicit `row-cell` participation
 * outranks a presentation default; a host closure still outranks both.
 * The EditableCell inherits the `edit` binding per FC-03 and renders a read-only
 * projection for suppressed-heavyweight / unbound-non-heavyweight fields. Every
 * other column passes through unchanged.
 */
function withEditableCells(
    resolved: FrameColumn[],
    manifest: ContextManifest | undefined,
    schema: unknown,
    registry: ReturnType<typeof useFrameInjection>['registry'],
    onCellCommit: ((record: Row, field: string, value: unknown) => void) | undefined,
): FrameColumn[] {
    if (!manifest) return resolved;

    const properties = ((schema as SchemaNode | undefined)?.properties ?? {}) as Record<
        string,
        SchemaNode
    >;

    return resolved.map((col) => {
        // Host override wins for its field — never wrap it. A `'declared'` cell is frame's
        // own presentation default and IS overridable here (see the docblock).
        if (col.cell && col.cellSource !== 'declared') return col;

        // FLAT on purpose: `byNode` is keyed by the full pointer, dots included, so
        // `byNode['commerce.plan']` is the correct lookup and traversing would look for a
        // `commerce` node that does not exist. Only the VALUE read below is path-resolved.
        const byCtx = manifest.byNode[col.field];
        const rowCell = byCtx?.['row-cell'];
        if (!rowCell?.participates) return col;

        const edit = byCtx?.edit;
        // Also flat, and unreachable for a dotted pointer: a JSON Schema nests through a
        // `properties` hop per level, so plain dot-traversal would be the wrong traversal — and a
        // producer that folds a sub-projection onto a row is refused `row-cell` participation
        // where it declares it, because a folded slice has no write arm for `onCellCommit` to
        // reach. The refusal is what keeps this line honest; do not "fix" it by traversing.
        const node: SchemaNode = properties[col.field] ?? { type: 'string' };

        return {
            ...col,
            cell: (record: Row) => (
                <EditableCell
                    node={node}
                    rowCell={rowCell}
                    edit={edit}
                    value={getPath(record, col.field)}
                    registry={registry}
                    onCommit={(value) => onCellCommit?.(record, col.field, value)}
                />
            ),
        };
    });
}
