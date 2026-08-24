import type { ComponentType, MouseEvent } from 'react';
import { parseSort, serializeSort, sortStateFor, toggleSortKey } from '@schemastud/facets';
import { ArrowDown, ArrowUp, ChevronsUpDown } from 'lucide-react';
import { useFrameInjection } from '../context';
import { getPath } from '../getPath';
import { DefaultCell } from '../slots/defaults';
import type {
    CellSlotProps,
    FrameColumn,
    ListSlots,
    PaginationSlotProps,
    Row,
    ToolbarSlotProps,
} from '../types';

/**
 * Sort state the list shell threads into the Table slot so column headers and the
 * facets-bar Sort control share ONE comma-joined `sort` param — never a competing
 * mechanism. `sortableFields` are the resource's declared `x-sort` field names (a
 * header only becomes clickable when its column's `sortField` is in this set, so an
 * unknown sort can't be emitted).
 */
export interface TableSort {
    sort: string | null;
    onSortChange: (value: string | null) => void;
    sortableFields: Set<string>;
}

/**
 * shadcn-flavored list slots — the batteries-included default for the (all-shadcn)
 * ecosystem. Every slot is styled with shadcn-CONVENTION Tailwind utilities that read
 * the STANDARD shadcn CSS variables (`border`, `bg-card`, `bg-muted`,
 * `text-muted-foreground`, `ring`), so a host that maps those variables onto its own
 * palette (numero → Nebula) gets a native surface with zero table code. Interactive
 * atoms reuse the host's injected `primitives.Button` — the preset never imports a
 * host's per-app `@/components/ui/*` (which shadcn copies in, not publishes).
 */

export function ShadcnTable(props: {
    columns: FrameColumn[];
    rows: Row[];
    onOpen?: (record: Row) => void;
    Cell: ComponentType<CellSlotProps>;
    RowActions?: ComponentType<{ record: Row }>;
    sort?: TableSort;
}) {
    const { columns, rows, onOpen, Cell, RowActions, sort } = props;
    return (
        <div data-frame-slot="Table" className="overflow-hidden rounded-lg border border-border bg-card">
            <table className="w-full border-collapse text-left text-sm">
                <thead>
                    <tr className="border-b border-border bg-muted/40 text-[11px] tracking-[0.12em] text-muted-foreground uppercase">
                        {columns.map((c) => (
                            <ShadcnHeaderCell key={c.field} column={c} sort={sort} />
                        ))}
                        {RowActions ? <th className="px-4 py-3" /> : null}
                    </tr>
                </thead>
                <tbody>
                    {rows.map((row, i) => (
                        <tr
                            key={(row.id as string) ?? i}
                            data-frame-row
                            onClick={() => onOpen?.(row)}
                            className={`border-b border-border/60 last:border-0 ${
                                onOpen ? 'cursor-pointer hover:bg-muted/40' : ''
                            }`}
                        >
                            {columns.map((c) => (
                                <td key={c.field} className="px-4 py-3 align-middle text-foreground/90">
                                    <Cell column={c} record={row} />
                                </td>
                            ))}
                            {RowActions ? (
                                <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                                    <RowActions record={row} />
                                </td>
                            ) : null}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

/**
 * One header cell. A column becomes a click-to-sort button only when it declares a
 * `sortField` the resource lists as sortable (`x-sort`); click cycles asc → desc →
 * cleared, shift-click appends a secondary key. Otherwise a plain, static header.
 */
function ShadcnHeaderCell(props: { column: FrameColumn; sort?: TableSort }) {
    const { column, sort } = props;
    const label = column.header ?? column.field;
    const sortable = Boolean(sort) && Boolean(column.sortField) && sort!.sortableFields.has(column.sortField!);

    if (!sortable) {
        return <th className="px-4 py-3 font-medium">{label}</th>;
    }

    const keys = parseSort(sort!.sort);
    const state = sortStateFor(keys, column.sortField!);
    const multi = keys.length > 1;

    const onClick = (event: MouseEvent<HTMLButtonElement>) => {
        sort!.onSortChange(serializeSort(toggleSortKey(keys, column.sortField!, event.shiftKey)));
    };

    return (
        <th className="px-4 py-3 font-medium">
            <button
                type="button"
                onClick={onClick}
                aria-sort={state.active ? (state.desc ? 'descending' : 'ascending') : 'none'}
                title="Click to sort; shift-click to add a secondary sort"
                className={`group -mx-1 inline-flex items-center gap-1 rounded px-1 py-0.5 uppercase hover:bg-muted ${
                    state.active ? 'text-foreground' : ''
                }`}
            >
                <span>{label}</span>
                {state.active ? (
                    state.desc ? (
                        <ArrowDown className="size-3" />
                    ) : (
                        <ArrowUp className="size-3" />
                    )
                ) : (
                    <ChevronsUpDown className="size-3 opacity-0 transition-opacity group-hover:opacity-60" />
                )}
                {state.active && multi ? (
                    <span className="rounded bg-muted px-1 text-[10px] leading-4 tabular-nums text-muted-foreground">
                        {state.index + 1}
                    </span>
                ) : null}
            </button>
        </th>
    );
}

/** Adds empty-value + boolean rendering over the plain default; otherwise delegates. */
export function ShadcnCell(props: CellSlotProps) {
    if (props.column.cell) return <>{props.column.cell(props.record)}</>;
    // Dotted-pointer aware — see DefaultCell.
    const value = getPath(props.record, props.column.field);
    if (value === null || value === undefined || value === '') {
        return <span className="text-muted-foreground">—</span>;
    }
    if (typeof value === 'boolean') {
        return <span className={value ? 'text-primary' : 'text-muted-foreground'}>{value ? 'Yes' : 'No'}</span>;
    }
    return <DefaultCell {...props} />;
}

export function ShadcnEmpty() {
    return (
        <div
            data-frame-slot="Empty"
            className="rounded-lg border border-dashed border-border px-6 py-12 text-center text-sm text-muted-foreground"
        >
            No records.
        </div>
    );
}

export function ShadcnToolbar({ resource, onNew, canCreate }: ToolbarSlotProps) {
    const { primitives } = useFrameInjection();
    const { Button } = primitives;
    if (!canCreate) return null;
    return (
        <div data-frame-slot="Toolbar" className="flex justify-end">
            <Button type="button" size="sm" onClick={onNew} data-frame-action="new">
                New {resource}
            </Button>
        </div>
    );
}

export function ShadcnPagination({
    page,
    perPage,
    total,
    onPageChange,
    onPerPageChange,
    perPageOptions,
}: PaginationSlotProps) {
    const { primitives } = useFrameInjection();
    const { Button, SimpleSelect } = primitives;
    const lastPage = Math.max(1, Math.ceil(total / Math.max(1, perPage)));
    const options = perPageOptions ?? [10, 25, 50, 100];
    return (
        <div data-frame-slot="Pagination" className="mt-3 flex items-center justify-between text-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
                <span>
                    Page {page} of {lastPage} · {total} total
                </span>
                {onPerPageChange && SimpleSelect && (
                    <span className="flex items-center gap-1.5">
                        <span aria-hidden>·</span>
                        <span>Rows</span>
                        <SimpleSelect
                            value={String(perPage)}
                            onValueChange={(value: string) => onPerPageChange(Number(value))}
                            options={options.map((n) => ({ value: String(n), label: String(n) }))}
                            aria-label="Rows per page"
                            className="h-7 w-[4.75rem]"
                        />
                    </span>
                )}
            </div>
            <div className="flex gap-2">
                <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={page <= 1}
                    onClick={() => onPageChange(page - 1)}
                >
                    ‹ Prev
                </Button>
                <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={page >= lastPage}
                    onClick={() => onPageChange(page + 1)}
                >
                    Next ›
                </Button>
            </div>
        </div>
    );
}

/** Spread into a ListShell's `slots` for a shadcn-native list; override individual keys after. */
export const shadcnListSlots = {
    Table: ShadcnTable,
    Cell: ShadcnCell,
    Empty: ShadcnEmpty,
    Toolbar: ShadcnToolbar,
    Pagination: ShadcnPagination,
} satisfies Partial<ListSlots>;
