import {
    flexRender,
    getCoreRowModel,
    useReactTable,
    type ColumnDef,
    type Header,
} from '@tanstack/react-table';
import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight, ChevronsUpDown } from 'lucide-react';
import { useId, useMemo, useState, type MouseEvent, type ReactNode } from 'react';
import { Button } from './button';
import { cn } from './cn';
import { useIsMobile } from './use-mobile';
import { parseSort, serializeSort, sortStateFor, toggleSortKey } from './sort';

// Let a column declare which `x-sort` field it sorts on. Only columns whose
// `sortField` is in the resource's `x-sort` set get a header affordance, so an
// unknown sort can never be emitted (UI-06). `sortAccessor` supplies the value a
// column sorts on under `clientSort` (in-memory sort); it is ignored by server sort. `label` names a column whose header
// is a component, where a plain-text name is needed (the stacked card's field label).
declare module '@tanstack/react-table' {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    interface ColumnMeta<TData extends unknown, TValue> {
        sortField?: string;
        sortAccessor?: (row: TData) => string | number | Date | null | undefined;
        label?: string;
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
 *
 * `stackOnMobile` (opt-in): below the foundation's 768px breakpoint ({@link useIsMobile}) every row becomes a stacked
 * card that renders the SAME column cells, so a row's status and its actions stay on screen instead of being clipped or
 * parked past the right edge of a sideways scroller. The first column is the card's heading, a column whose id is
 * `actions` is the card's footer, and every other column is a labelled field (its string header is the label). Loading,
 * empty, row-click, re-fetch dimming and pagination behave exactly as in the table. (Promoted from beam-accounts'
 * ResponsiveRoster: X shot-review follow-up (b), orch-lead 15:26Z.)
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
    stackOnMobile = false,
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
    /** Below 768px, render each row as a stacked card instead of a table row (see above). */
    stackOnMobile?: boolean;
}) {
    const isMobile = useIsMobile();
    const uid = useId();
    const stacked = stackOnMobile && isMobile;
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
        // A row's own `id` (when it has one) keys it, so a stacked card is `stacked-row-<id>` as ResponsiveRoster's was.
        getRowId: (row, index) => {
            const id = (row as { id?: unknown } | null)?.id;
            return typeof id === 'string' || typeof id === 'number' ? String(id) : String(index);
        },
    });

    const footer = (
        <>
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
        </>
    );

    if (stacked) {
        const rows = table.getRowModel().rows;
        // The header row is gone, so its sort buttons move into a bar above the cards: the same `x-sort` gating, the same
        // shared `sort` state.
        const sortHeaders = (table.getHeaderGroups()[0]?.headers ?? []).filter(
            (header) => !header.isPlaceholder && sortFieldOf(header, headerSort) !== null,
        );
        return (
            <div className={cn('space-y-2', className)}>
                {headerSort && sortHeaders.length > 0 && (
                    <div
                        role="group"
                        aria-labelledby={`${uid}-sort`}
                        className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground"
                    >
                        <span id={`${uid}-sort`}>Sort</span>
                        {sortHeaders.map((header) => (
                            <SortButton
                                key={header.id}
                                label={flexRender(header.column.columnDef.header, header.getContext())}
                                sortField={sortFieldOf(header, headerSort)!}
                                sorting={headerSort}
                                stacked
                            />
                        ))}
                    </div>
                )}
                {showSkeleton ? (
                    <div className="space-y-2" aria-busy="true">
                        {Array.from({ length: Math.min(skeletonRows, 3) }).map((_, i) => (
                            <div key={i} data-testid="skeleton-row" className="h-24 animate-pulse rounded-lg border bg-muted/40" />
                        ))}
                    </div>
                ) : rows.length === 0 ? (
                    <p className="py-8 text-center text-sm text-muted-foreground">{emptyMessage}</p>
                ) : (
                    <ul className={cn('list-cross-fade space-y-2', refetching && 'opacity-40')} aria-busy={loading || undefined}>
                        {rows.map((row) => {
                            const [heading, ...rest] = row.getVisibleCells();
                            const actions = rest.find((cell) => cell.column.id === 'actions');
                            const fields = rest.filter((cell) => cell.column.id !== 'actions');
                            return (
                                <li
                                    key={row.id}
                                    data-testid={`stacked-row-${row.id}`}
                                    className={cn(
                                        'min-w-0 space-y-2.5 rounded-lg border bg-card p-3',
                                        onRowClick && 'cursor-pointer transition-colors hover:bg-accent/50',
                                        rowClassName?.(row.original),
                                    )}
                                    // A pointer may open the row from anywhere on the card; the accessible way in is the
                                    // labelled Open button below, never the <li> itself.
                                    onClick={() => onRowClick?.(row.original)}
                                >
                                    {heading && (
                                        <div id={`${uid}-row-${row.id}`} className="min-w-0">
                                            {flexRender(heading.column.columnDef.cell, heading.getContext())}
                                        </div>
                                    )}
                                    {fields.length > 0 && (
                                        <dl className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-x-3 gap-y-1.5 text-[12.5px]">
                                            {fields.map((cell) => {
                                                const header = cell.column.columnDef.header;
                                                return (
                                                    <div key={cell.id} className="contents">
                                                        <dt className="text-muted-foreground">
                                                            {cell.column.columnDef.meta?.label ??
                                                                (typeof header === 'string' ? header : cell.column.id)}
                                                        </dt>
                                                        <dd className="min-w-0">{flexRender(cell.column.columnDef.cell, cell.getContext())}</dd>
                                                    </div>
                                                );
                                            })}
                                        </dl>
                                    )}
                                    {(onRowClick || actions) && (
                                        <div className="flex flex-wrap items-center justify-end gap-1.5 border-t pt-2">
                                            {onRowClick && (
                                                // The row's own open control: a native button named "Open <heading>", a
                                                // sibling of the row's actions, never wrapping them.
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="sm"
                                                    className="mr-auto"
                                                    id={`${uid}-open-${row.id}`}
                                                    aria-labelledby={`${uid}-open-${row.id} ${uid}-row-${row.id}`}
                                                    onClick={(event) => {
                                                        event.stopPropagation();
                                                        onRowClick(row.original);
                                                    }}
                                                >
                                                    Open
                                                </Button>
                                            )}
                                            {actions && (
                                                // The row's actions act on their own: a click here never also opens the row.
                                                <div
                                                    className="flex flex-wrap items-center gap-1.5"
                                                    onClick={(event) => event.stopPropagation()}
                                                >
                                                    {flexRender(actions.column.columnDef.cell, actions.getContext())}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </li>
                            );
                        })}
                    </ul>
                )}
                {footer}
            </div>
        );
    }

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
                                    {row.getVisibleCells().map((cell, index) => (
                                        <td
                                            key={cell.id}
                                            className={cn(
                                                'px-3 py-2',
                                                index === 0 && onRowClick && 'relative',
                                            )}
                                            // The row's actions act on their own: a click here (pointer OR a
                                            // keyboard activation that bubbles) never also opens the row, the
                                            // same rule the stacked card applies.
                                            onClick={
                                                cell.column.id === 'actions'
                                                    ? (event) => event.stopPropagation()
                                                    : undefined
                                            }
                                        >
                                            {index === 0 && onRowClick && (
                                                // Keyboard-reachable row opener, named "Open <heading>" the
                                                // same way the stacked card's Open control is (aria-labelledby
                                                // = this button + the heading cell). A sibling of the cells'
                                                // own controls, never a wrapper, so no interactive element is
                                                // wrongly nested and the <tr> stays a plain row (a pointer
                                                // convenience) rather than a button that would swallow them.
                                                // Hidden until focused, then shown in place so the visible
                                                // table layout is unchanged for every consumer.
                                                <button
                                                    type="button"
                                                    id={`${uid}-open-${row.id}`}
                                                    aria-labelledby={`${uid}-open-${row.id} ${uid}-row-${row.id}`}
                                                    onClick={(event) => {
                                                        event.stopPropagation();
                                                        onRowClick(row.original);
                                                    }}
                                                    className="sr-only rounded-md bg-card px-2 py-1 text-xs font-medium text-primary underline focus:not-sr-only focus:absolute focus:left-1 focus:top-1 focus:z-10 focus:no-underline focus:shadow focus:outline-none focus:ring-2 focus:ring-ring"
                                                >
                                                    Open
                                                </button>
                                            )}
                                            {index === 0 ? (
                                                <span
                                                    id={`${uid}-row-${row.id}`}
                                                    className="contents"
                                                >
                                                    {flexRender(
                                                        cell.column.columnDef.cell,
                                                        cell.getContext(),
                                                    )}
                                                </span>
                                            ) : (
                                                flexRender(
                                                    cell.column.columnDef.cell,
                                                    cell.getContext(),
                                                )
                                            )}
                                        </td>
                                    ))}
                                </tr>
                            ))}
                    </tbody>
                </table>
            </div>

            {footer}
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

    const sortField = sortFieldOf(header, sorting);

    if (!sortField || !sorting) {
        return <th className="px-3 py-2 text-left font-medium text-muted-foreground">{label}</th>;
    }

    // The sort state lives on the column header, where `aria-sort` is supported, not on the button inside it.
    const state = sortStateFor(parseSort(sorting.sort), sortField);

    return (
        <th
            className="px-3 py-2 text-left font-medium text-muted-foreground"
            aria-sort={state.active ? (state.desc ? 'descending' : 'ascending') : 'none'}
        >
            <SortButton label={label} sortField={sortField} sorting={sorting} />
        </th>
    );
}

/** The column's `meta.sortField` when sorting is wired and the resource lists it as `x-sort`; otherwise null. */
function sortFieldOf<TData>(header: Header<TData, unknown>, sorting?: DataTableSort): string | null {
    const sortField = header.column.columnDef.meta?.sortField;

    return sorting && sortField && sorting.sortableFields.has(sortField) ? sortField : null;
}

/**
 * The sort affordance for one `x-sort` field, shared by the table header and the stacked mode's sort bar so both read and
 * write the one `sort` state: click sets this field as the sole sort (asc → desc → cleared), shift-click appends it.
 */
function SortButton({
    label,
    sortField,
    sorting,
    stacked = false,
}: {
    label: ReactNode;
    sortField: string;
    sorting: DataTableSort;
    /** In the stacked Sort group there is no column header to carry `aria-sort`: the button is a toggle (`aria-pressed`)
     * whose accessible name says the direction. */
    stacked?: boolean;
}) {
    const keys = parseSort(sorting.sort);
    const state = sortStateFor(keys, sortField);
    const multi = keys.length > 1;

    const onClick = (event: MouseEvent<HTMLButtonElement>) => {
        const next = toggleSortKey(keys, sortField, event.shiftKey);
        sorting.onSortChange(serializeSort(next));
    };

    return (
        <button
            type="button"
            onClick={onClick}
            aria-pressed={stacked ? state.active : undefined}
            className={cn(
                'group -mx-1 inline-flex items-center gap-1 rounded px-1 py-0.5 hover:bg-accent',
                state.active && 'text-foreground',
            )}
            title="Click to sort; shift-click to add a secondary sort"
        >
            <span>
                {label}
                {stacked && state.active && <span className="sr-only">, sorted {state.desc ? 'descending' : 'ascending'}</span>}
            </span>
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
    );
}
