import {
    flexRender,
    getCoreRowModel,
    useReactTable,
    type ColumnDef,
    type Header,
} from '@tanstack/react-table';
import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight, ChevronsUpDown } from 'lucide-react';
import { useMemo, useState, type MouseEvent } from 'react';
import { Button } from './button';
import { cn } from './cn';
import { parseSort, serializeSort, sortStateFor, toggleSortKey } from './sort';

// Let a column declare which `x-sort` field it sorts on. Only columns whose
// `sortField` is in the resource's `x-sort` set get a header affordance, so an
// unknown sort can never be emitted (UI-06). `sortAccessor` supplies the value a
// column sorts on under `clientSort` (in-memory sort); it is ignored by server sort.
declare module '@tanstack/react-table' {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    interface ColumnMeta<TData extends unknown, TValue> {
        sortField?: string;
        sortAccessor?: (row: TData) => string | number | Date | null | undefined;
    }
}

/** Null/undefined sort last; dates and numbers numeric; everything else locale string. */
function compareSortValues(a: unknown, b: unknown): number {
    if (a == null && b == null) return 0;
    if (a == null) return 1;
    if (b == null) return -1;
    const av = a instanceof Date ? a.getTime() : a;
    const bv = b instanceof Date ? b.getTime() : b;
    if (typeof av === 'number' && typeof bv === 'number') return av - bv;
    return String(av).localeCompare(String(bv));
}

/**
 * In-memory sort of `rows` by the active keys in `sort`, using each column's
 * `meta.sortAccessor` (falling back to the row's field of the same name). Reuses the same
 * sort vocabulary (parseSort/sortStateFor) as the server-driven path, so a client-sorted
 * table shares one sort model with the facets bar — it just resolves the order locally.
 */
function clientSortRows<TData>(
    rows: TData[],
    sort: string | null,
    columns: ColumnDef<TData, unknown>[],
): TData[] {
    const keys = parseSort(sort);
    if (keys.length === 0) return rows;

    const accessors = new Map<string, (row: TData) => unknown>();
    for (const column of columns) {
        const field = column.meta?.sortField;
        if (field) {
            accessors.set(
                field,
                column.meta?.sortAccessor ?? ((row) => (row as Record<string, unknown>)[field]),
            );
        }
    }

    const active = [...accessors.keys()]
        .map((field) => ({ field, state: sortStateFor(keys, field) }))
        .filter((entry) => entry.state.active)
        .sort((a, b) => a.state.index - b.state.index);
    if (active.length === 0) return rows;

    return [...rows].sort((ra, rb) => {
        for (const { field, state } of active) {
            const accessor = accessors.get(field)!;
            const cmp = compareSortValues(accessor(ra), accessor(rb));
            if (cmp !== 0) return state.desc ? -cmp : cmp;
        }
        return 0;
    });
}

export interface ServerPagination {
    page: number;
    lastPage: number;
    onPageChange: (page: number) => void;
}

/**
 * Shared sort state for sortable column headers. `sortableFields` are the `x-sort`
 * field names the resource declares (derive from the filter schema, never
 * hand-author); a column offers a sort affordance iff its `meta.sortField` is in
 * this set. `sort` / `onSortChange` are the *same* comma-joined `sort` param the
 * facets-bar Sort control reads and writes — headers and the Sort menu share one
 * state, never a competing mechanism.
 */
export interface DataTableSort {
    sortableFields: Set<string>;
    sort: string | null;
    onSortChange: (value: string | null) => void;
}

/**
 * The index-view table: headless TanStack Table with server-driven pagination.
 * Saved-filter / x-filter wiring layers on top per surface.
 *
 * Loading is two-phase (issue 01): the very first load with no rows yet shows shaped
 * skeleton rows (never a bare "Loading…"), while a re-filter/re-sort that already has
 * rows keeps the previous set visible but dimmed and cross-fades to the new one — no
 * blank flash. The caller passes `loading` (the query is pending) and the current `data`;
 * the table decides which phase applies from whether rows already exist.
 *
 * Skin: all colors are semantic Tailwind tokens (`bg-card`, `text-muted-foreground`, …)
 * that resolve against the host's `@theme` vars — zero hard-coded colors. The
 * `list-cross-fade` class is a host-owned motion utility (see the beam token-var
 * convention); the host defines its transition, the table only opts in by name.
 */
export function DataTable<TData>({
    columns,
    data,
    pagination,
    onRowClick,
    rowClassName,
    emptyMessage = 'Nothing here yet.',
    loading = false,
    skeletonRows = 5,
    className,
    sorting,
    clientSort,
    clientPageSize,
}: {
    columns: ColumnDef<TData, unknown>[];
    data: TData[];
    pagination?: ServerPagination;
    onRowClick?: (row: TData) => void;
    rowClassName?: (row: TData) => string | undefined;
    emptyMessage?: string;
    loading?: boolean;
    skeletonRows?: number;
    className?: string;
    /** Server-driven sort (emits a `sort` param the server honors). */
    sorting?: DataTableSort;
    /** In-memory sort for non-paginated resources — same DataTableSort shape/state, resolved
     * locally. Mutually exclusive with `sorting`. */
    clientSort?: DataTableSort;
    /** When set, paginate the (client-sorted) rows in-memory at this page size. */
    clientPageSize?: number;
}) {
    // Headers share one sort model whether the order is resolved server- or client-side.
    const headerSort = sorting ?? clientSort;

    const sortedData = useMemo(
        () => (clientSort ? clientSortRows(data, clientSort.sort, columns) : data),
        [clientSort, data, columns],
    );

    // In-memory pagination (opt-in). Page is clamped to range so a shrinking list never
    // strands the viewer on an empty page.
    const [clientPage, setClientPage] = useState(1);
    const clientLastPage = clientPageSize
        ? Math.max(1, Math.ceil(sortedData.length / clientPageSize))
        : 1;
    const safeClientPage = Math.min(clientPage, clientLastPage);
    const displayData =
        clientPageSize && clientLastPage > 1
            ? sortedData.slice(
                  (safeClientPage - 1) * clientPageSize,
                  safeClientPage * clientPageSize,
              )
            : sortedData;

    const effectivePagination: ServerPagination | undefined =
        pagination ??
        (clientPageSize
            ? { page: safeClientPage, lastPage: clientLastPage, onPageChange: setClientPage }
            : undefined);

    // First load = pending with nothing to show yet → skeleton. Re-filter = pending but we
    // already have previous rows → keep them, dimmed, and cross-fade.
    const showSkeleton = loading && data.length === 0;
    const refetching = loading && data.length > 0;
    const table = useReactTable({
        data: displayData,
        columns,
        getCoreRowModel: getCoreRowModel(),
        manualPagination: true,
    });

    return (
        <div className={cn('space-y-2', className)}>
            <div className="overflow-x-auto rounded-md border bg-card">
                <table className="w-full text-sm">
                    <thead className="border-b bg-muted/40">
                        {table.getHeaderGroups().map((headerGroup) => (
                            <tr key={headerGroup.id}>
                                {headerGroup.headers.map((header) => (
                                    <SortableHeaderCell
                                        key={header.id}
                                        header={header}
                                        sorting={headerSort}
                                    />
                                ))}
                            </tr>
                        ))}
                    </thead>
                    <tbody
                        className={cn(
                            // Keep-previous cross-fade on re-filter/re-sort, tuned by
                            // the shared motion token (UI-18) — one place to change the
                            // feel, and suppressed under prefers-reduced-motion.
                            'list-cross-fade',
                            refetching && 'opacity-40',
                        )}
                        aria-busy={loading || undefined}
                    >
                        {showSkeleton &&
                            Array.from({ length: skeletonRows }).map((_, rowIndex) => (
                                <tr
                                    key={`skeleton-${rowIndex}`}
                                    className="border-b last:border-0"
                                    data-testid="skeleton-row"
                                >
                                    {columns.map((_column, colIndex) => (
                                        <td key={colIndex} className="px-3 py-2">
                                            <div
                                                className="h-4 animate-pulse rounded bg-muted"
                                                style={{
                                                    width: `${[70, 55, 40, 60][colIndex % 4]}%`,
                                                }}
                                            />
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        {!showSkeleton && table.getRowModel().rows.length === 0 && (
                            <tr>
                                <td
                                    colSpan={columns.length}
                                    className="px-3 py-8 text-center text-muted-foreground"
                                >
                                    {emptyMessage}
                                </td>
                            </tr>
                        )}
                        {!showSkeleton &&
                            table.getRowModel().rows.map((row) => (
                                <tr
                                    key={row.id}
                                    className={cn(
                                        'border-b last:border-0',
                                        onRowClick &&
                                            'cursor-pointer transition-colors hover:bg-accent/50',
                                        rowClassName?.(row.original),
                                    )}
                                    onClick={() => onRowClick?.(row.original)}
                                >
                                    {row.getVisibleCells().map((cell) => (
                                        <td key={cell.id} className="px-3 py-2">
                                            {flexRender(
                                                cell.column.columnDef.cell,
                                                cell.getContext(),
                                            )}
                                        </td>
                                    ))}
                                </tr>
                            ))}
                    </tbody>
                </table>
            </div>

            {effectivePagination && effectivePagination.lastPage > 1 && (
                <div className="flex items-center justify-end gap-2 text-sm text-muted-foreground">
                    <span>
                        Page {effectivePagination.page} of {effectivePagination.lastPage}
                    </span>
                    <Button
                        variant="outline"
                        size="icon"
                        disabled={effectivePagination.page <= 1}
                        onClick={() =>
                            effectivePagination.onPageChange(effectivePagination.page - 1)
                        }
                    >
                        <ChevronLeft />
                    </Button>
                    <Button
                        variant="outline"
                        size="icon"
                        disabled={effectivePagination.page >= effectivePagination.lastPage}
                        onClick={() =>
                            effectivePagination.onPageChange(effectivePagination.page + 1)
                        }
                    >
                        <ChevronRight />
                    </Button>
                </div>
            )}
        </div>
    );
}

/**
 * One header cell. If sorting is wired and the column declares a `meta.sortField`
 * that the resource lists as `x-sort`, the label becomes a sort button: click sets
 * this field as the sole sort (cycling asc → desc → cleared), shift-click appends a
 * secondary key preserving order. A small ordinal badge shows the key's position in
 * a multi-column sort. Non-sortable columns render a plain, static header.
 */
function SortableHeaderCell<TData>({
    header,
    sorting,
}: {
    header: Header<TData, unknown>;
    sorting?: DataTableSort;
}) {
    const label = header.isPlaceholder
        ? null
        : flexRender(header.column.columnDef.header, header.getContext());

    const sortField = header.column.columnDef.meta?.sortField;
    const sortable =
        Boolean(sorting) && Boolean(sortField) && sorting!.sortableFields.has(sortField!);

    if (!sortable) {
        return <th className="px-3 py-2 text-left font-medium text-muted-foreground">{label}</th>;
    }

    const keys = parseSort(sorting!.sort);
    const state = sortStateFor(keys, sortField!);
    const multi = keys.length > 1;

    const onClick = (event: MouseEvent<HTMLButtonElement>) => {
        const next = toggleSortKey(keys, sortField!, event.shiftKey);
        sorting!.onSortChange(serializeSort(next));
    };

    return (
        <th className="px-3 py-2 text-left font-medium text-muted-foreground">
            <button
                type="button"
                onClick={onClick}
                aria-sort={state.active ? (state.desc ? 'descending' : 'ascending') : 'none'}
                className={cn(
                    'group -mx-1 inline-flex items-center gap-1 rounded px-1 py-0.5 hover:bg-accent',
                    state.active && 'text-foreground',
                )}
                title="Click to sort; shift-click to add a secondary sort"
            >
                <span>{label}</span>
                {state.active ? (
                    state.desc ? (
                        <ArrowDown className="size-3.5" />
                    ) : (
                        <ArrowUp className="size-3.5" />
                    )
                ) : (
                    <ChevronsUpDown className="size-3.5 opacity-0 transition-opacity group-hover:opacity-60" />
                )}
                {state.active && multi && (
                    <span className="rounded bg-muted px-1 text-[10px] leading-4 tabular-nums text-muted-foreground">
                        {state.index + 1}
                    </span>
                )}
            </button>
        </th>
    );
}
