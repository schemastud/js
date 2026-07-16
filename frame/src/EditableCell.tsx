import { useContext, useState, type ReactNode } from 'react';
import { WidgetRegistryContext, type SchemaNode, type WidgetRegistry } from '@schemastud/seam';
import { resolveWidgetFor, type ResolvedForContext } from './resolveWidgetFor';
import type { NodeParticipation } from './contexts';

// =============================================================================
// EditableCell — the interactive `row-cell` RUNTIME atop the FC-03 resolution.
//
// Default is a READ view of the field value. On activation (click / an explicit
// edit affordance) it mounts the RESOLVED edit widget for the field — obtained
// through resolveWidgetFor(node, 'row-cell', rowCell, edit, registry), which
// inherits the `edit` binding per FC-03. The widget edits the single field value
// in place; committing calls `onCommit(value)` (the host wires it to a per-field
// save / transport.save); Escape or a blur-without-change reverts to the read view.
//
// Heavyweight suppression: when the field's `edit` entry is `heavyweight`, FC-03's
// resolveWidgetFor already SUPPRESSES the cascade — so EditableCell renders a
// read-only projection (the scalar/summary) and NEVER inlines the heavyweight
// editor into the cell.
//
// Unbound: reuse FC-03's `unbound` flag. An unbound heavyweight is a dev error
// (throw in dev), consistent with SchemaView. An unbound non-heavyweight falls to
// the read projection.
// =============================================================================

export interface EditableCellProps {
    /** The field's JSON Schema node (the single-field subschema the widget edits). */
    node: SchemaNode;
    /** The field's `row-cell` participation entry (byNode[field]['row-cell']). */
    rowCell: NodeParticipation | undefined;
    /** The field's `edit` participation entry — the cascade parent. */
    edit: NodeParticipation | undefined;
    /** The current field value. */
    value: unknown;
    /** Host commit hook — wire to a per-field save / transport.save. */
    onCommit: (value: unknown) => void;
    /** Falls back to the seam WidgetRegistryContext when omitted. */
    registry?: WidgetRegistry;
}

const isDev = (): boolean => Boolean((import.meta as any).env?.DEV);

function scalar(value: unknown): string {
    if (value === null || value === undefined) return '';
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
}

/** The read-only projection — a plain scalar/summary of the field value. */
function ReadProjection({ value }: { value: unknown }): ReactNode {
    return <span data-frame-cell-value>{scalar(value)}</span>;
}

export function EditableCell({
    node,
    rowCell,
    edit,
    value,
    onCommit,
    registry: registryProp,
}: EditableCellProps): ReactNode {
    const ctxRegistry = useContext(WidgetRegistryContext);
    const registry = registryProp ?? ctxRegistry;
    if (!registry) {
        throw new Error('[frame] EditableCell requires a WidgetRegistry (prop or WidgetRegistryContext).');
    }

    const [editing, setEditing] = useState(false);
    const [draft, setDraft] = useState<unknown>(value);

    // Resolve the row-cell binding, inheriting `edit` per FC-03. Heavyweight parents
    // are suppressed here (resolved.widget stays undefined), so a heavyweight editor
    // can never be inlined into the cell.
    const resolved: ResolvedForContext = resolveWidgetFor(node, 'row-cell', rowCell, edit, registry);

    // Unbound heavyweight is a hard dev error — a heavyweight binding that named a
    // widget the registry could not resolve. Consistent with SchemaView.
    if (resolved.participates && resolved.unbound && edit?.heavyweight) {
        if (isDev()) {
            throw new Error(
                `[frame] EditableCell: heavyweight widget "${edit.widget}" is unbound (no registry match) for context "row-cell".`,
            );
        }
        return (
            <div data-frame-cell="unbound-heavyweight">
                <span data-frame-cell-error>[unbound widget: {String(edit?.widget)}]</span>
            </div>
        );
    }

    // A resolved COMPONENT is editable; a string widget name (RJSF-only), a miss, a
    // suppressed heavyweight, or a non-participating field falls to the read
    // projection — no in-place editing, just the value.
    const Widget = resolved.participates && typeof resolved.widget !== 'string' ? resolved.widget : undefined;

    if (!Widget) {
        return (
            <div data-frame-cell="readonly">
                <ReadProjection value={value} />
            </div>
        );
    }

    const activate = () => {
        setDraft(value);
        setEditing(true);
    };

    const commit = (next: unknown) => {
        setEditing(false);
        // Blur-without-change (or an unchanged commit) cancels silently — no host
        // mutation for a no-op.
        if (next !== value) onCommit(next);
    };

    const cancel = () => {
        setDraft(value);
        setEditing(false);
    };

    if (!editing) {
        return (
            <div
                data-frame-cell="editable"
                role="button"
                tabIndex={0}
                onClick={activate}
                onFocus={activate}
            >
                <ReadProjection value={value} />
            </div>
        );
    }

    return (
        <div
            data-frame-cell="editing"
            onBlur={() => commit(draft)}
            onKeyDown={(e) => {
                if (e.key === 'Escape') cancel();
            }}
        >
            <Widget
                value={draft}
                formData={draft}
                schema={node}
                options={resolved.config ?? {}}
                autofocus
                onChange={(next: unknown) => setDraft(next)}
            />
        </div>
    );
}
