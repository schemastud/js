import { useLayoutEffect, useMemo, useRef, useState, type ComponentType } from 'react';
import type { SchemaNode } from '@schemastud/seam';
import { ListFilters, useListFilters } from '@schemastud/facets';
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
import { useResourceList } from './data';
import { useListPagination } from './useListPagination';
import type { ContextManifest } from './contexts';
import type { FrameColumn, ListShellProps, Row } from './types';

/**
 * The list surface, generalized from the app substrate. Renders any resource from
 * its schema + host-supplied columns with no per-resource UI code: the facets bar
 * is fully schema-driven (rides FilterSchemaController where a filter schema
 * exists), pagination is transport-driven, columns resolve through the columns seam.
 */
export function ListShell({
    resource,
    columns,
    onOpen,
    slots,
    manifest,
    onCellCommit,
    paginationPlacement = 'both',
}: ListShellProps) {
    const { can, registry, listSlots, transport } = useFrameInjection();
    const filters = useListFilters(resource);

    const query = useResourceList(resource, filters.requestParams);

    // Manifest folds list-column participation into the columns; absent → passthrough.
    const resolvedColumns = withEditableCells(
        resolveColumns(resource, filters.schema, columns, manifest),
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
    const Toolbar = slots?.Toolbar ?? listSlots?.Toolbar ?? DefaultToolbar;
    // The default is rendered INLINE, not wrapped in a component: an inline `() => <ListFilters/>`
    // was a new component type on every shell render, so each re-render remounted the whole filters
    // row (facets bar, saved views) and dropped its local state mid-interaction.
    const FiltersSlot = slots?.Filters ?? listSlots?.Filters;
    // The Table slot contract is `ComponentType<any>` (ListSlots.Table); type the
    // resolved component as such so the shell can thread sort state to slots that
    // render sortable headers (the plain default simply ignores it).
    const Table: ComponentType<any> = slots?.Table ?? listSlots?.Table ?? DefaultTable;
    const Cards = slots?.Cards ?? listSlots?.Cards ?? DefaultCards;
    const Cell = slots?.Cell ?? listSlots?.Cell ?? DefaultCell;
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
    // The resource's declared RECORD actions this actor may press (ADR-0005). Rendered by frame BESIDE
    // whatever row-actions slot resolved, never through it: an action is a declaration, and a host's
    // own RowActions slot is presentation that knows nothing about it.
    const recordActions = resolveActions(manifest, 'record', transport);
    const notice = useInlineNotice();
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
                                  manifest={manifest}
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
            notice.onNotice,
            onOpen,
            manifest,
        ],
    );
    const Empty = slots?.Empty ?? listSlots?.Empty ?? DefaultEmpty;
    const ErrorState = slots?.ErrorState ?? listSlots?.ErrorState ?? DefaultErrorState;
    const Loading = slots?.Loading ?? listSlots?.Loading ?? DefaultLoading;
    const Pagination = slots?.Pagination ?? listSlots?.Pagination ?? DefaultPagination;

    // The controls row (filters, saved views, Toolbar) keeps a gap above the content only while it
    // renders something: every slot in it may render nothing (a resource with no filter vocabulary,
    // no saved views and no create verb), and an empty row must not push the table down. Measured,
    // because a slot returning null leaves no trace the shell can read before layout.
    const controlsRef = useRef<HTMLDivElement>(null);
    const [controlsShown, setControlsShown] = useState(true);
    useLayoutEffect(() => {
        const el = controlsRef.current;
        if (!el) return;
        const measure = () => setControlsShown(el.offsetHeight > 0);
        measure();
        if (typeof ResizeObserver === 'undefined') return;
        const observer = new ResizeObserver(measure);
        observer.observe(el);
        return () => observer.disconnect();
    }, []);

    const rows: Row[] = query.data?.data ?? [];
    const pagination = useListPagination(
        resource,
        query.data,
        query.isFetching || query.isPlaceholderData,
    );
    const showTopPagination =
        pagination.visible && (paginationPlacement === 'top' || paginationPlacement === 'both');
    const showBottomPagination =
        pagination.visible && (paginationPlacement === 'bottom' || paginationPlacement === 'both');
    const paginationBar = pagination.props ? <Pagination {...pagination.props} /> : null;

    return (
        <div data-frame-shell="list">
            {/* `marginBottom`: the filters row (facets bar, saved views, Toolbar) sat flush on the
                table or the empty-state box beneath it (beam VR pass 2, frame console). */}
            <div
                ref={controlsRef}
                data-frame-list-controls=""
                style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '1rem',
                    marginBottom: controlsShown ? '0.75rem' : 0,
                }}
            >
                {/* The facets bar fills the row (flex:1) so it spans full-width like
                    the bespoke list surfaces; any Toolbar (e.g. a New button) sits at
                    the right edge. `minWidth:0` lets the bar's chips wrap instead of
                    forcing the row wider. */}
                <div style={{ flex: 1, minWidth: 0 }}>
                    {FiltersSlot ? <FiltersSlot /> : <ListFilters {...filters} />}
                </div>
                <ResourceActionBar
                    resource={resource}
                    manifest={manifest}
                    onNavigate={navigate}
                    onNotice={notice.onNotice}
                />
                <Toolbar
                    resource={resource}
                    canCreate={canCreate}
                    framesCreate={framesCreate}
                    singularLabel={manifest?.singularLabel || undefined}
                    onNew={onOpen ? () => onOpen({ id: null }) : undefined}
                />
            </div>

            {notice.element}
            {query.isLoading ? (
                <Loading />
            ) : query.isError ? (
                // BEFORE `rows.length === 0`, not after: a failed read also has zero rows, so
                // ordering these the other way is exactly the bug this branch exists to end —
                // every 5xx on every Frame list rendered as "No records." (api-surface-coherence 107).
                <ErrorState error={query.error} retry={() => void query.refetch()} />
            ) : (
                <>
                    {/* Top bar gets breathing room below it before the table header. */}
                    {showTopPagination && <div className="mb-3">{paginationBar}</div>}
                    {rows.length === 0 ? (
                        <Empty />
                    ) : cardsPath && manifest ? (
                        <Cards
                            resource={resource}
                            rows={rows}
                            manifest={manifest}
                            schema={rootSchema}
                            onOpen={onOpen}
                            Card={BoundCard}
                        />
                    ) : (
                        <Table
                            columns={resolvedColumns}
                            rows={rows}
                            onOpen={onOpen}
                            Cell={Cell}
                            RowActions={BoundRowActions}
                            sort={{
                                // Column headers and the facets-bar Sort control share ONE
                                // `sort` param — the shadcn Table slot renders click-to-sort
                                // headers for any column whose `sortField` the resource lists.
                                sort: filters.sort,
                                onSortChange: filters.onSortChange,
                                sortableFields: filters.sortableFields,
                            }}
                        />
                    )}
                    {showBottomPagination && paginationBar}
                </>
            )}
        </div>
    );
}

// The cards gate lives in its own module (a card asks it too, of another resource); the
// shell re-exports it so the public import path is unchanged.
export { listItemRendersCards };

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
    onCellCommit: ListShellProps['onCellCommit'],
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
