import { useContext, type ReactNode } from 'react';
import { WidgetRegistryContext, type SchemaNode, type WidgetRegistry } from '@schemastud/seam';
import { resolveWidgetFor, type ResolvedForContext } from './resolveWidgetFor';
import type { ContextManifest, FrameContext, NodeParticipation } from './contexts';

// =============================================================================
// SchemaView — the READ-side sibling of SchemaForm. Renders a record for the
// `detail` context (per-property) or the `list-item` card body (whole-record),
// resolving each node through resolveWidgetFor. NOT a form: no submit, no edits.
//
// A resolved component is mounted read-only (value + readOnly/disabled hints).
// A non-participating field, or a bound-but-name-only (RJSF string widget), or an
// unbound non-heavyweight field falls to a sensible read-only default (label +
// scalar value). An unbound HEAVYWEIGHT widget is a hard dev error.
// =============================================================================

export interface SchemaViewProps {
    schema: SchemaNode;
    record: Record<string, unknown>;
    manifest: ContextManifest;
    context: 'detail' | 'list-item';
    /** Falls back to the seam WidgetRegistryContext when omitted. */
    registry?: WidgetRegistry;
}

const isDev = (): boolean => Boolean((import.meta as any).env?.DEV);

function labelize(key: string, cm?: NodeParticipation): string {
    if (cm?.label) return cm.label;
    return key
        .replace(/[_-]+/g, ' ')
        .replace(/([a-z])([A-Z])/g, '$1 $2')
        .replace(/^\w/, (c) => c.toUpperCase());
}

function scalar(value: unknown): string {
    if (value === null || value === undefined) return '';
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
}

/**
 * The prop bundle a read surface mounts a resolved widget with: the value twice (widgets
 * written against RJSF read `formData`, ones written against the seam read `value`), the node
 * it resolved against, the read-only hints, and the matched registry config as `options`.
 *
 * Exported because `dashboard-card` mounts a widget the same way and had re-implemented this
 * bundle field-for-field; two copies of it drift the day one of them gains a prop.
 */
export function widgetMountProps(value: unknown, schema: SchemaNode, options?: Record<string, unknown>) {
    return { value, formData: value, schema, readOnly: true, disabled: true, options: options ?? {} };
}

/**
 * How frame shows a binding that NAMED a widget the registry could not resolve — the honest
 * marker, never a plausible-looking default standing in for a typo. `SchemaView` draws it for
 * an unbound heavyweight field; `dashboard-card` draws it for an unbound summary/overview tier.
 */
export function UnboundWidget({
    label,
    widget,
    kind = 'unbound-heavyweight',
}: {
    label: string;
    widget: unknown;
    kind?: string;
}): ReactNode {
    return (
        <div data-frame-view={kind}>
            <span data-frame-view-label>{label}</span>
            <span data-frame-view-error>[unbound widget: {String(widget)}]</span>
        </div>
    );
}

/**
 * Mount a single resolved node read-only. A resolved COMPONENT gets the value +
 * read-only hints; everything else (miss, string widget name, non-participating)
 * renders the read-only scalar default.
 */
function ViewNode({
    node,
    ctx,
    cm,
    label,
    value,
    registry,
}: {
    node: SchemaNode;
    ctx: FrameContext;
    cm: NodeParticipation | undefined;
    label: string;
    value: unknown;
    registry: WidgetRegistry;
}): ReactNode {
    const resolved: ResolvedForContext = resolveWidgetFor(node, ctx, cm, undefined, registry);

    if (resolved.participates && resolved.unbound && cm?.heavyweight) {
        // A heavyweight binding that resolved no component is a wiring error — the
        // shell treats `unbound && heavyweight` as a hard dev error.
        if (isDev()) {
            throw new Error(
                `[frame] SchemaView: heavyweight widget "${cm.widget}" is unbound (no registry match) for context "${ctx}".`,
            );
        }
        return <UnboundWidget label={label} widget={cm?.widget} />;
    }

    // A resolved COMPONENT renders read-only; a string widget name (RJSF-only) or a
    // miss falls to the scalar default.
    const Widget = resolved.participates && typeof resolved.widget !== 'string' ? resolved.widget : undefined;

    return (
        <div data-frame-view="field">
            <span data-frame-view-label>{label}</span>
            {Widget ? (
                <Widget {...widgetMountProps(value, node, resolved.config)} />
            ) : (
                <span data-frame-view-value>{scalar(value)}</span>
            )}
        </div>
    );
}

export function SchemaView({ schema, record, manifest, context, registry: registryProp }: SchemaViewProps): ReactNode {
    const ctxRegistry = useContext(WidgetRegistryContext);
    const registry = registryProp ?? ctxRegistry;
    if (!registry) {
        throw new Error('[frame] SchemaView requires a WidgetRegistry (prop or WidgetRegistryContext).');
    }

    // `list-item` = whole-record; resolve the root node once at pointer "".
    if (context === 'list-item') {
        const rootNode = schema;
        const cm = manifest.byNode['']?.['list-item'];
        return (
            <div data-frame-view="list-item">
                <ViewNode
                    node={rootNode}
                    ctx="list-item"
                    cm={cm}
                    label={labelize('', cm)}
                    value={record}
                    registry={registry}
                />
            </div>
        );
    }

    // `detail` = per-property walk over the schema's properties.
    const properties = (schema.properties ?? {}) as Record<string, SchemaNode>;
    return (
        <div data-frame-view="detail">
            {Object.keys(properties).map((key) => {
                const cm = manifest.byNode[key]?.detail;
                return (
                    <ViewNode
                        key={key}
                        node={properties[key]}
                        ctx="detail"
                        cm={cm}
                        label={labelize(key, cm)}
                        value={record[key]}
                        registry={registry}
                    />
                );
            })}
        </div>
    );
}
