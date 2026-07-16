import type { SchemaNode } from '@schemastud/seam';
import { ListFilters, useListFilters } from '@schemastud/facets';
import { useFrameInjection } from './context';
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
export function ListShell({ resource, columns, onOpen, slots, manifest, onCellCommit }: ListShellProps) {
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
    const Table = slots?.Table ?? DefaultTable;
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

    const rows: Row[] = query.data?.data ?? [];

    return (
        <div data-frame-shell="list">
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem' }}>
                <Filters />
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
                    <Table
                        columns={resolvedColumns}
                        rows={rows}
                        onOpen={onOpen}
                        Cell={Cell}
                        RowActions={RowActions}
                    />
                    <Pagination
                        page={query.data?.page ?? page}
                        perPage={query.data?.perPage ?? rows.length}
                        total={query.data?.total ?? rows.length}
                        onPageChange={onPageChange}
                    />
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

        const byCtx = manifest.byNode[col.field];
        const rowCell = byCtx?.['row-cell'];
        if (!rowCell?.participates) return col;

        const edit = byCtx?.edit;
        const node: SchemaNode = properties[col.field] ?? { type: 'string' };

        return {
            ...col,
            cell: (record: Row) => (
                <EditableCell
                    node={node}
                    rowCell={rowCell}
                    edit={edit}
                    value={record[col.field]}
                    registry={registry}
                    onCommit={(value) => onCellCommit?.(record, col.field, value)}
                />
            ),
        };
    });
}
