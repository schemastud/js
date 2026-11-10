import { useContext, useId, useState, type ReactNode } from 'react';
import { asNumber, getSchemaType, type RJSFSchema } from '@rjsf/utils';
import {
    WidgetRegistryContext,
    asWidget,
    isCompositeNode,
    useRjsfRegistry,
    widgetProps,
    type SchemaNode,
    type WidgetRegistry,
} from '@schemastud/seam';
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
    /**
     * The resource's root schema: the document a `$ref` in `node` points into. The cell's RJSF registry is built
     * on it, and the composite test reads it (ruling 04 §2, §5).
     */
    rootSchema: SchemaNode;
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

/** A stable `formContext` for the cell's registry: a module constant, so the memoized registry keeps its identity. */
const CELL_FORM_CONTEXT: Record<string, unknown> = {};

// RJSF's NumberField: a trailing decimal point or trailing zeros are stripped before `asNumber`.
const TRAILING_WITH_PREFIX = /\.([0-9]*0)*$/;
const TRAILING = /[0.]0*$/;

/**
 * What a cell commits. A stock text widget emits what its input holds, a string; in a form RJSF's `NumberField`
 * converts it. Outside a form this cell is the one editable mount, so it converts at commit, as `NumberField`
 * does, when the resolved node is a `number` or `integer` (ruling 04 §1).
 */
function atCommit(next: unknown, schema: RJSFSchema): unknown {
    const type = getSchemaType(schema);
    const types = Array.isArray(type) ? type : [type];
    if (!types.some((t) => t === 'number' || t === 'integer') || typeof next !== 'string') return next;
    const normalized = next.startsWith('.') ? `0${next}` : next;
    return TRAILING_WITH_PREFIX.test(normalized) ? asNumber(normalized.replace(TRAILING, '')) : asNumber(normalized);
}

/** The read-only projection — a plain scalar/summary of the field value. */
function ReadProjection({ value }: { value: unknown }): ReactNode {
    return <span data-frame-cell-value>{scalar(value)}</span>;
}

export function EditableCell({
    node,
    rootSchema,
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
    const rjsfRegistry = useRjsfRegistry(rootSchema, CELL_FORM_CONTEXT);
    const id = useId();

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

    // A resolved COMPONENT is editable; an RJSF stock name, a miss, a suppressed
    // heavyweight, or a non-participating field falls to the read projection — no
    // in-place editing, just the value. A composite node whose name is the FORM's (it
    // came from the node or down the `edit` cascade, not from this cell's own entry) is
    // the form's field: the cell shows its read value and is not editable (ruling 04 §5).
    const component = resolved.participates ? asWidget(resolved.widget) : undefined;
    const formsField = !rowCell?.widget && isCompositeNode(node, rootSchema);
    const Widget = formsField ? undefined : component;

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
        const committed = atCommit(next, rjsfRegistry.schemaUtils.retrieveSchema(node as RJSFSchema, next));
        if (committed !== value) onCommit(committed);
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
                {...widgetProps({
                    registry: rjsfRegistry,
                    schema: node,
                    value: draft,
                    name: '',
                    id,
                    readonly: false,
                    disabled: false,
                    autofocus: true,
                    options: resolved.options,
                    onChange: (next: unknown) => setDraft(next),
                })}
            />
        </div>
    );
}
