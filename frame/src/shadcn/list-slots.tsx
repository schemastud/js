import type { ComponentType } from 'react';
import { useFrameInjection } from '../context';
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
}) {
    const { columns, rows, onOpen, Cell, RowActions } = props;
    return (
        <div data-frame-slot="Table" className="overflow-hidden rounded-lg border border-border">
            <table className="w-full border-collapse text-left text-sm">
                <thead>
                    <tr className="border-b border-border bg-muted/40 text-[11px] tracking-[0.12em] text-muted-foreground uppercase">
                        {columns.map((c) => (
                            <th key={c.field} className="px-4 py-3 font-medium">
                                {c.header ?? c.field}
                            </th>
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

/** Adds empty-value + boolean rendering over the plain default; otherwise delegates. */
export function ShadcnCell(props: CellSlotProps) {
    if (props.column.cell) return <>{props.column.cell(props.record)}</>;
    const value = props.record[props.column.field];
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

export function ShadcnPagination({ page, perPage, total, onPageChange }: PaginationSlotProps) {
    const { primitives } = useFrameInjection();
    const { Button } = primitives;
    const lastPage = Math.max(1, Math.ceil(total / Math.max(1, perPage)));
    return (
        <div data-frame-slot="Pagination" className="mt-3 flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
                Page {page} of {lastPage} · {total} total
            </span>
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
