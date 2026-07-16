import { SchemaForm } from '@schemastud/seam';
import type { ComponentType, ReactNode } from 'react';
import { useFrameInjection } from '../context';
import type {
    CellSlotProps,
    FormBodySlotProps,
    FormMode,
    FrameColumn,
    PaginationSlotProps,
    Row,
    SaveBarSlotProps,
    ToolbarSlotProps,
} from '../types';

// -----------------------------------------------------------------------------
// List slot defaults — every one is a working frame default; the host overrides a
// single slot via `slots?` only to deviate.
// -----------------------------------------------------------------------------

export function DefaultToolbar({ resource, onNew, canCreate }: ToolbarSlotProps) {
    const { primitives } = useFrameInjection();
    const { Button } = primitives;
    if (!canCreate) return null;
    return (
        <div data-frame-slot="Toolbar" style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Button type="button" onClick={onNew} data-frame-action="new">
                New {resource}
            </Button>
        </div>
    );
}

export function DefaultCell({ column, record }: CellSlotProps) {
    if (column.cell) return <>{column.cell(record)}</>;
    const value = record[column.field];
    return <>{value === null || value === undefined ? '' : String(value)}</>;
}

export function DefaultEmpty() {
    return (
        <div data-frame-slot="Empty" style={{ padding: '2rem', textAlign: 'center', opacity: 0.6 }}>
            No records.
        </div>
    );
}

export function DefaultLoading() {
    const { primitives } = useFrameInjection();
    const { Skeleton } = primitives;
    return (
        <div data-frame-slot="Loading">
            <Skeleton />
        </div>
    );
}

export function DefaultPagination({ page, perPage, total, onPageChange }: PaginationSlotProps) {
    const { primitives } = useFrameInjection();
    const { Button } = primitives;
    const lastPage = Math.max(1, Math.ceil(total / Math.max(1, perPage)));
    return (
        <div
            data-frame-slot="Pagination"
            style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}
        >
            <Button type="button" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
                Prev
            </Button>
            <span data-frame-page>
                {page} / {lastPage}
            </span>
            <Button type="button" disabled={page >= lastPage} onClick={() => onPageChange(page + 1)}>
                Next
            </Button>
        </div>
    );
}

/**
 * Frame's generalized DataTable default — a resource-blind table rendered from the
 * resolved columns + the Cell/RowActions slots. Table atoms stay plain HTML so the
 * default works with no host chrome; a host swaps the whole Table slot to use its
 * own design-system table.
 */
export function DefaultTable(props: {
    columns: FrameColumn[];
    rows: Row[];
    onOpen?: (record: Row) => void;
    Cell: ComponentType<CellSlotProps>;
    RowActions?: ComponentType<{ record: Row }>;
}) {
    const { columns, rows, onOpen, Cell, RowActions } = props;
    return (
        <table data-frame-slot="Table" style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
                <tr>
                    {columns.map((c) => (
                        <th key={c.field} style={{ textAlign: 'left', padding: '0.5rem' }}>
                            {c.header ?? c.field}
                        </th>
                    ))}
                    {RowActions ? <th /> : null}
                </tr>
            </thead>
            <tbody>
                {rows.map((row, i) => (
                    <tr
                        key={(row.id as string) ?? i}
                        data-frame-row
                        onClick={() => onOpen?.(row)}
                        style={{ cursor: onOpen ? 'pointer' : undefined }}
                    >
                        {columns.map((c) => (
                            <td key={c.field} style={{ padding: '0.5rem' }}>
                                <Cell column={c} record={row} />
                            </td>
                        ))}
                        {RowActions ? (
                            <td onClick={(e) => e.stopPropagation()}>
                                <RowActions record={row} />
                            </td>
                        ) : null}
                    </tr>
                ))}
            </tbody>
        </table>
    );
}

// -----------------------------------------------------------------------------
// Edit slot defaults
// -----------------------------------------------------------------------------

/**
 * Default form body — seam's SchemaForm. Both `raw` and `splicewire` modes render
 * through the same SchemaForm; the mode only changes which widgets resolve (a host
 * registers `splicewire-enrich` in seam's WidgetRegistry). The enrich/refine
 * affordance rides a FormIntentBus on formContext (not props).
 */
export function DefaultFormBody({
    schema,
    formData,
    intentBus,
    readOnly,
    onChange,
    onSubmit,
}: FormBodySlotProps) {
    const { schemaFetcher, registry } = useFrameInjection();
    return (
        <div data-frame-slot="FormBody" data-frame-readonly={readOnly ? '' : undefined}>
            <SchemaForm
                schema={schema}
                formData={formData}
                registry={registry}
                schemaFetcher={schemaFetcher}
                disabled={readOnly}
                formContext={{ intentBus, readOnly }}
                // The frame's SaveBar is the one save control; suppress RJSF's own
                // default submit button so the edit surface doesn't show both a
                // "Submit" and a "Save". The form's onSubmit still fires (Enter key,
                // programmatic submit) and drives the same save path.
                uiSchema={{ 'ui:submitButtonOptions': { norender: true } }}
                onChange={(e: { formData?: unknown }) => onChange((e.formData ?? {}) as Row)}
                onSubmit={(e: { formData?: unknown }) => onSubmit((e.formData ?? {}) as Row)}
            />
        </div>
    );
}

export function DefaultToggle({
    value,
    onChange,
}: {
    value: FormMode;
    onChange: (m: FormMode) => void;
}) {
    return (
        <div data-frame-slot="Toggle" role="radiogroup" aria-label="Form mode">
            {(['splicewire', 'raw'] as FormMode[]).map((mode) => (
                <label key={mode} style={{ marginRight: '0.5rem' }}>
                    <input
                        type="radio"
                        name="frame-form-mode"
                        checked={value === mode}
                        onChange={() => onChange(mode)}
                    />
                    {mode}
                </label>
            ))}
        </div>
    );
}

export function DefaultSaveBar({ saving, readOnly, onSave, onCancel }: SaveBarSlotProps) {
    const { primitives } = useFrameInjection();
    const { Button } = primitives;
    return (
        <div data-frame-slot="SaveBar" style={{ display: 'flex', gap: '0.5rem' }}>
            {onCancel ? (
                <Button type="button" onClick={onCancel} data-frame-action="cancel">
                    Cancel
                </Button>
            ) : null}
            {!readOnly ? (
                <Button type="button" disabled={saving} onClick={onSave} data-frame-action="save">
                    {saving ? 'Saving…' : 'Save'}
                </Button>
            ) : null}
        </div>
    );
}

export function DefaultContainer({ children }: { children: ReactNode }) {
    const { primitives } = useFrameInjection();
    const { SidePanel } = primitives;
    return <SidePanel data-frame-slot="Container">{children}</SidePanel>;
}
