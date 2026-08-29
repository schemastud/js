import { SchemaForm } from '@schemastud/seam';
import type { ComponentType, ReactNode } from 'react';
import { Trash2 } from 'lucide-react';
import { useFrameInjection } from '../context';
import { useRemoveResource } from '../data';
import { getPath } from '../getPath';
import type {
    CellSlotProps,
    ErrorSlotProps,
    FormBodySlotProps,
    FormMode,
    FrameColumn,
    PaginationSlotProps,
    Row,
    RowActionsSlotProps,
    SaveBarSlotProps,
    ToolbarSlotProps,
} from '../types';

// -----------------------------------------------------------------------------
// List slot defaults — every one is a working frame default; the host overrides a
// single slot via `slots?` only to deviate.
// -----------------------------------------------------------------------------

export function DefaultToolbar({
    resource,
    onNew,
    canCreate,
    framesCreate,
    singularLabel,
}: ToolbarSlotProps) {
    const { primitives } = useFrameInjection();
    const { Button } = primitives;
    // `framesCreate === false` is the resource saying the create affordance is not frame's to
    // emit — it is not creatable at all, or the host's own chrome owns it. Nine surfaces at the
    // flagship were passing `Toolbar: () => null` to say this by hand.
    if (!canCreate || !framesCreate) return null;
    return (
        <div data-frame-slot="Toolbar" style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Button type="button" onClick={onNew} data-frame-action="new">
                New {createNoun(resource, singularLabel)}
            </Button>
        </div>
    );
}

/**
 * The noun a "New …" affordance says. The resolved singular when the manifest carried one,
 * else the raw resource key — which is the pre-manifest behaviour, kept so a fixture or an
 * older server renders exactly as before rather than losing its label.
 *
 * Lower-cased because it sits mid-sentence after "New"; the declaration spells it as a display
 * label ("Scaffold packs" → "Scaffold pack") and "New Scaffold pack" reads as a typo.
 */
export function createNoun(resource: string, singularLabel?: string): string {
    return singularLabel ? singularLabel.toLocaleLowerCase() : resource;
}

/**
 * Frame's own row-actions column, rendered from the resource's `#[RowActions]` declaration.
 *
 * Three flagship surfaces had copy-pasted this component verbatim — same `useRemoveResource`,
 * same `window.confirm`, same trash icon — differing only in the noun, which the declaration
 * was already carrying two fields away (`singularLabel`).
 *
 * ⚠️ Two gates, and they are not the same question. `actions` is what the RESOURCE declared
 * (a presentation fact, resolved from the manifest); `can('delete', resource)` is what THIS
 * ACTOR may do. Neither substitutes for the other, and folding them would be the estate's
 * recurring defect — a presentation default silently revoking, or silently re-opening, a
 * capability someone else declared.
 *
 * Styling is inline + primitives only, never class names: a host's Tailwind does not scan
 * `node_modules`, so a `className` here renders correct markup with no styles behind an
 * HTTP 200. The inline rules also out-specify whatever the host's Button primitive brings,
 * which is what keeps this a quiet ghost icon rather than a solid primary button per row.
 */
export function DefaultRowActions({
    record,
    resource,
    actions,
    singularLabel,
}: RowActionsSlotProps) {
    const { primitives, can } = useFrameInjection();
    const { Button } = primitives;
    const remove = useRemoveResource(resource);

    if (!actions.includes('delete') || !can('delete', resource)) return null;

    const noun = createNoun(resource, singularLabel);
    const id = String(record.id ?? '');

    return (
        <div
            data-frame-slot="RowActions"
            style={{ display: 'flex', gap: '0.25rem', justifyContent: 'flex-end' }}
        >
            <Button
                type="button"
                data-frame-action="delete"
                aria-label={`Delete ${noun}`}
                title={`Delete ${noun}`}
                disabled={remove.isPending || id === ''}
                style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '1.75rem',
                    height: '1.75rem',
                    padding: 0,
                    background: 'transparent',
                    border: 'none',
                    boxShadow: 'none',
                    cursor: 'pointer',
                    color: 'var(--destructive, #dc2626)',
                    opacity: remove.isPending ? 0.5 : 1,
                }}
                onClick={(event: { stopPropagation: () => void }) => {
                    // The row itself is the open affordance; without this the confirm fires
                    // AND the record opens behind it.
                    event.stopPropagation();
                    if (window.confirm(`Delete ${noun} "${recordName(record)}"?`)) {
                        remove.mutate(id);
                    }
                }}
            >
                <Trash2 aria-hidden style={{ width: '1rem', height: '1rem' }} />
            </Button>
        </div>
    );
}

/**
 * What to call this row in the confirm sentence. `name` / `title` / `label` in that order —
 * the three the estate's records actually carry — then the id, then nothing rather than the
 * literal string "undefined".
 */
function recordName(record: Row): string {
    for (const field of ['name', 'title', 'label'] as const) {
        const value = record[field];
        if (typeof value === 'string' && value !== '') return value;
    }
    return String(record.id ?? '');
}

export function DefaultCell({ column, record }: CellSlotProps) {
    if (column.cell) return <>{column.cell(record)}</>;
    // Dotted-pointer aware: a column may name a node inside a folded sub-projection
    // (`commerce.plan`), which a flat index would miss.
    const value = getPath(record, column.field);
    return <>{value === null || value === undefined ? '' : String(value)}</>;
}

export function DefaultEmpty() {
    return (
        <div data-frame-slot="Empty" style={{ padding: '2rem', textAlign: 'center', opacity: 0.6 }}>
            No records.
        </div>
    );
}

/**
 * The list read FAILED (api-surface-coherence 107) — say so, and offer the retry.
 *
 * Deliberately shows the message the transport carried rather than a fixed string: the
 * defect this slot exists for was a 500 whose body named the exact missing table, hidden
 * behind "No records." for a day.
 */
export function DefaultErrorState({ error, retry }: ErrorSlotProps) {
    const message =
        error instanceof Error ? error.message : typeof error === 'string' ? error : null;

    return (
        <div
            data-frame-slot="ErrorState"
            role="alert"
            style={{ padding: '2rem', textAlign: 'center' }}
        >
            <div>Could not load this list.</div>
            {message ? (
                <div style={{ marginTop: '0.5rem', opacity: 0.7, fontSize: '0.875em' }}>
                    {message}
                </div>
            ) : null}
            <button type="button" onClick={retry} style={{ marginTop: '0.75rem' }}>
                Retry
            </button>
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
    // Row rhythm rides the `[data-density]` cascade: vertical padding reads
    // `--density-row-py` off the deployment root (comfortable | compact), so a root
    // override re-treats the whole collection with zero JS — the structural twin of
    // `canvas-surface` (component-seams ticket 36/38). Horizontal padding is fixed
    // (density governs vertical rhythm only). The fallback preserves the pre-token
    // 0.5rem render where no `[data-density]` is in scope (e.g. plain prod mounts).
    const cellStyle = { paddingBlock: 'var(--density-row-py, 0.5rem)', paddingInline: '0.5rem' };
    return (
        <table data-frame-slot="Table" style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
                <tr>
                    {columns.map((c) => (
                        <th key={c.field} style={{ textAlign: 'left', ...cellStyle }}>
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
                            <td key={c.field} style={cellStyle}>
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
export function DefaultFormBody(props: FormBodySlotProps) {
    const { schema, formData, intentBus, readOnly, onChange, onSubmit } = props;
    const { schemaFetcher, registry, formResolver } = useFrameInjection();

    // Canonical form resolution (order: root x-widget > form-by-kind > generic). A form registered
    // for the object's schema kind renders in place of the generic SchemaForm; an explicit root
    // x-widget (heavyweight editor) and any unregistered schema fall through unchanged.
    const CanonicalForm = formResolver?.resolveFormForSchema(schema).form ?? null;
    if (CanonicalForm) {
        return (
            <div data-frame-slot="FormBody" data-frame-readonly={readOnly ? '' : undefined}>
                <CanonicalForm {...props} />
            </div>
        );
    }

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
            {(['enriched', 'bare'] as FormMode[]).map((mode) => (
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
