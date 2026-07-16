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
        return (
            <div data-frame-view="unbound-heavyweight">
                <span data-frame-view-label>{label}</span>
                <span data-frame-view-error>[unbound widget: {String(cm?.widget)}]</span>
            </div>
        );
    }

    // A resolved COMPONENT renders read-only; a string widget name (RJSF-only) or a
    // miss falls to the scalar default.
    const Widget = resolved.participates && typeof resolved.widget !== 'string' ? resolved.widget : undefined;

    return (
        <div data-frame-view="field">
            <span data-frame-view-label>{label}</span>
            {Widget ? (
                <Widget
                    value={value}
                    formData={value}
                    schema={node}
                    readOnly
                    disabled
                    options={resolved.config ?? {}}
                />
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
