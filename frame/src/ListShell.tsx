import type { ComponentType } from 'react';
import type { SchemaNode } from '@schemastud/seam';
import { ListFilters, useListFilters } from '@schemastud/facets';
import { useFrameInjection } from './context';
import { getPath } from './getPath';
import { resolveColumns } from './resolveColumns';
import { EditableCell } from './EditableCell';
import {
    DefaultCell,
    DefaultEmpty,
    DefaultLoading,
    DefaultPagination,
    DefaultTable,
    DefaultToolbar,
} from './slots/defaults';
import { useResourceList } from './data';
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
    const { useUrlState, can, registry } = useFrameInjection();
    const filters = useListFilters(resource);
    const [searchParams, setSearchParams] = useUrlState();

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

    const Toolbar = slots?.Toolbar ?? DefaultToolbar;
    const Filters = slots?.Filters ?? (() => <ListFilters {...filters} />);
    // The Table slot contract is `ComponentType<any>` (ListSlots.Table); type the
    // resolved component as such so the shell can thread sort state to slots that
    // render sortable headers (the plain default simply ignores it).
    const Table: ComponentType<any> = slots?.Table ?? DefaultTable;
    const Cell = slots?.Cell ?? DefaultCell;
    const RowActions = slots?.RowActions;
    const Empty = slots?.Empty ?? DefaultEmpty;
    const Loading = slots?.Loading ?? DefaultLoading;
    const Pagination = slots?.Pagination ?? DefaultPagination;

    const page = Number(searchParams.get('page') ?? '1');
    const onPageChange = (next: number) =>
        setSearchParams((prev) => {
            prev.set('page', String(next));
            return prev;
        });
    // Page size rides the URL (`per_page`) like every other list param, so facets folds
    // it into requestParams and the transport sends it. Changing size resets to page 1.
    const onPerPageChange = (nextPerPage: number) =>
        setSearchParams((prev) => {
            prev.set('per_page', String(nextPerPage));
            prev.set('page', '1');
            return prev;
        });

    const rows: Row[] = query.data?.data ?? [];

    const showTopPagination = paginationPlacement === 'top' || paginationPlacement === 'both';
    const showBottomPagination =
        paginationPlacement === 'bottom' || paginationPlacement === 'both';
    const paginationBar = (
        <Pagination
            page={query.data?.page ?? page}
            perPage={query.data?.perPage ?? rows.length}
            total={query.data?.total ?? rows.length}
            onPageChange={onPageChange}
            onPerPageChange={onPerPageChange}
        />
    );

    return (
        <div data-frame-shell="list">
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
                {/* The facets bar fills the row (flex:1) so it spans full-width like
                    the bespoke list surfaces; any Toolbar (e.g. a New button) sits at
                    the right edge. `minWidth:0` lets the bar's chips wrap instead of
                    forcing the row wider. */}
                <div style={{ flex: 1, minWidth: 0 }}>
                    <Filters />
                </div>
                <Toolbar
                    resource={resource}
                    canCreate={canCreate}
                    onNew={onOpen ? () => onOpen({ id: null }) : undefined}
                />
            </div>

            {query.isLoading ? (
                <Loading />
            ) : rows.length === 0 ? (
                <Empty />
            ) : (
                <>
                    {/* Top bar gets breathing room below it before the table header. */}
                    {showTopPagination && <div className="mb-3">{paginationBar}</div>}
                    <Table
                        columns={resolvedColumns}
                        rows={rows}
                        onOpen={onOpen}
                        Cell={Cell}
                        RowActions={RowActions}
                        sort={{
                            // Column headers and the facets-bar Sort control share ONE
                            // `sort` param — the shadcn Table slot renders click-to-sort
                            // headers for any column whose `sortField` the resource lists.
                            sort: filters.sort,
                            onSortChange: filters.onSortChange,
                            sortableFields: filters.sortableFields,
                        }}
                    />
                    {showBottomPagination && paginationBar}
                </>
            )}
        </div>
    );
}

/**
 * FC-23 wiring: turn a resolved column into an editable-in-place cell ONLY when
 *   (a) a manifest is present (absent ⇒ untouched — not a gate),
 *   (b) the field participates in `row-cell`, AND
 *   (c) the host supplied no `cell` override (host-closure-wins-by-field).
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

    const properties = ((schema as SchemaNode | undefined)?.properties ?? {}) as Record<string, SchemaNode>;

    return resolved.map((col) => {
        // Host override wins for its field — never wrap it.
        if (col.cell) return col;

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
