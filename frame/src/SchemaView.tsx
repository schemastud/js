import { useFrameMessages } from './messages';
import { useContext, useId, type ReactNode } from 'react';
import type { Registry } from '@rjsf/utils';
import {
    UnboundWidget,
    WidgetRegistryContext,
    asWidget,
    isCompositeNode,
    useRjsfRegistry,
    widgetProps,
    type SchemaNode,
    type WidgetRegistry,
} from '@schemastud/seam';
import { resolveWidgetFor, type ResolvedForContext } from './resolveWidgetFor';
import { useOptionalFrameInjection } from './context';
import { frameContexts, lenderFor, type FrameContextLookup } from './contextRegistry';
import type { ContextManifest, FrameContext, NodeParticipation } from './contexts';

// =============================================================================
// SchemaView — the READ-side sibling of SchemaForm. Renders a record for the
// `detail` context (per-property) or a record-grain context (whole-record: frame's
// `list-item`, or a host context registered with `grain: 'record'`, which borrows
// along its fallback when it binds none), resolving each node through
// resolveWidgetFor. NOT a form: no submit, no edits.
//
// A resolved component mounts read-only with RJSF `WidgetProps`, built by seam's
// `widgetProps` over an RJSF registry on the record's root schema (ruling 04). A
// declared name nothing binds draws seam's `UnboundWidget` (ruling 01 §3). A
// non-participating field, an RJSF stock name (`asWidget` is undefined), a node that
// names nothing, or a composite node whose name is the FORM's (`detail` only) falls to
// a sensible read-only default (label + value).
// =============================================================================

export interface SchemaViewProps {
    schema: SchemaNode;
    record: Record<string, unknown>;
    manifest: ContextManifest;
    /**
     * `detail` walks the properties. A RECORD-grain context (`list-item`, or a host's registered with
     * `grain: 'record'`) draws the whole record at pointer `""`, borrowing along its fallback when it binds none
     * (frame-foundation 92).
     */
    context: FrameContext;
    /** Falls back to the seam WidgetRegistryContext when omitted. */
    registry?: WidgetRegistry;
    /** The kit's contexts: defaults to the mounted kit's, else frame's seven. */
    contexts?: FrameContextLookup;
}


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

/** A stable `formContext` for the read registry: a module constant, so the memoized registry keeps its identity. */
const READ_FORM_CONTEXT: Record<string, unknown> = {};

/**
 * The read-only fallback for a node with no resolved component. A scalar renders as its string
 * value (unchanged). A machine-field OBJECT renders its entries with humanized labels and
 * unchanged values instead of collapsing to one opaque JSON blob, and keeps the authored source
 * JSON verbatim so it round-trips unchanged. Arrays and nested objects stay in the value column
 * as their exact JSON — every authored value is preserved, nothing is silently dropped. (C03)
 */
function FallbackValue({ value, node }: { value: unknown; node?: SchemaNode }): ReactNode {
    const { t } = useFrameMessages();
    if (value === null || typeof value !== 'object' || Array.isArray(value)) {
        return <span data-frame-view-value>{scalar(value)}</span>;
    }
    // Each key labels itself from its DECLARED schema title when present — the declaration owns the
    // contextual wording (e.g. a `role` property titled "Team role"), so an explicit title wins and
    // humanizing the key is only the fallback. (C03 — declared/humanized labels.)
    const properties = (node?.properties ?? {}) as Record<string, SchemaNode>;
    const declaredOr = (key: string): string => {
        const title = properties[key]?.title;
        return typeof title === 'string' && title.trim() ? title : labelize(key);
    };
    const entries = Object.entries(value as Record<string, unknown>);
    return (
        <div data-frame-view-structured>
            <dl>
                {entries.map(([key, entry]) => (
                    <div key={key}>
                        <dt data-frame-view-label>{declaredOr(key)}</dt>
                        <dd data-frame-view-value>{scalar(entry)}</dd>
                    </div>
                ))}
            </dl>
            <details>
                <summary>{t("schemastud-frame::messages.source_json")}</summary>
                <pre data-frame-view-json>{JSON.stringify(value, null, 2)}</pre>
            </details>
        </div>
    );
}

/**
 * Mount a single resolved node read-only. A resolved COMPONENT gets RJSF `WidgetProps` from
 * `widgetProps` (read-only and disabled, the field as its name, the label, the resolver's merged
 * options); everything else (miss, stock widget name, no entry, the form's composite field)
 * renders the read-only labeled structured/scalar fallback.
 */
function ViewNode({
    node,
    name,
    ctx,
    cm,
    label,
    value,
    registry,
    rjsfRegistry,
    rootSchema,
    lender,
    contexts,
}: {
    node: SchemaNode;
    /** The property key; `''` at the root. */
    name: string;
    ctx: FrameContext;
    cm: NodeParticipation | undefined;
    label: string;
    value: unknown;
    registry: WidgetRegistry;
    rjsfRegistry: Registry;
    rootSchema: SchemaNode;
    /** The entry that lends along `ctx`'s fallback (`lenderFor`), when one does. */
    lender?: NodeParticipation;
    contexts?: FrameContextLookup;
}): ReactNode {
    const id = useId();
    const resolved: ResolvedForContext = resolveWidgetFor(node, ctx, cm, lender, registry, contexts);

    // In `detail`, a composite node whose name is the FORM's (the node's own `x-widget`, not this entry's) is the
    // form's field: the detail view shows its structured read (ruling 04 §5), bound here or not.
    const formsField = ctx === 'detail' && !cm?.widget && isCompositeNode(node, rootSchema);

    // A declared name nothing binds in this context draws the one marker (ruling 01 §3), heavyweight or not, in
    // development and production alike. The name is the resolver's, never worked out again here.
    if (resolved.participates && resolved.bound === false && resolved.name !== undefined && !formsField) {
        return <UnboundWidget context={ctx} name={resolved.name} label={label} pointer={`/${name}`.replace(/^\/$/, '')} />;
    }

    // A resolved COMPONENT renders read-only; an RJSF stock name or a miss falls to the read
    // default. A name this entry declares itself is a read-surface widget and mounts.
    const component = resolved.participates ? asWidget(resolved.widget) : undefined;
    const Widget = formsField ? undefined : component;

    return (
        <div data-frame-view="field">
            <span data-frame-view-label>{label}</span>
            {Widget ? (
                <Widget
                    {...widgetProps({
                        registry: rjsfRegistry,
                        schema: node,
                        value,
                        name,
                        id,
                        label,
                        readonly: true,
                        disabled: true,
                        options: resolved.options,
                    })}
                />
            ) : (
                <FallbackValue value={value} node={node} />
            )}
        </div>
    );
}

export function SchemaView({ schema, record, manifest, context, registry: registryProp, contexts: contextsProp }: SchemaViewProps): ReactNode {
    const ctxRegistry = useContext(WidgetRegistryContext);
    const registry = registryProp ?? ctxRegistry;
    const injection = useOptionalFrameInjection();
    const contexts = contextsProp ?? injection?.contexts ?? frameContexts();
    // One RJSF registry for every field, built on the record's root schema (the document a `$ref` points into).
    const rjsfRegistry = useRjsfRegistry(schema, READ_FORM_CONTEXT);
    if (!registry) {
        throw new Error('[frame] SchemaView requires a WidgetRegistry (prop or WidgetRegistryContext).');
    }

    // A record-grain context = whole-record: resolve the root node once at pointer "", with the entry that lends
    // along the context's fallback. `list-item` has no fallback, so it resolves exactly as before.
    if (contexts.get(context)?.grain === 'record') {
        const rootNode = schema;
        const byCtx = manifest.byNode[''];
        const cm = byCtx?.[context];
        const lender = lenderFor(byCtx, context, contexts)?.entry;
        return (
            <div data-frame-view={context}>
                <ViewNode
                    node={rootNode}
                    name=""
                    rjsfRegistry={rjsfRegistry}
                    rootSchema={schema}
                    ctx={context}
                    cm={cm}
                    label={labelize('', cm)}
                    value={record}
                    registry={registry}
                    lender={lender}
                    contexts={contexts}
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
                // An explicit opt-out is a declaration that the field is not in this surface, the same
                // thing it means to `list-column`. A field with no entry was never declared either way,
                // so it keeps the read-only fallback below.
                if (cm?.participates === false) return null;
                return (
                    <ViewNode
                        key={key}
                        node={properties[key]}
                        name={key}
                        rjsfRegistry={rjsfRegistry}
                        rootSchema={schema}
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
