import type { SchemaNode, WidgetRegistry } from './types';

type UiSchema = Record<string, unknown>;

/** How the form walks: `context` selects scoped name registrations (`SchemaForm` passes `edit`); `plainData` is the `bare` mode. */
export interface UiSchemaOptions {
    /** The context the form resolves names in. Absent, only unscoped names bind (a direct caller's behaviour before contexts). */
    context?: string;
    /**
     * The plain-data mode: below the root, a node's `x-widget` is ignored and inference draws its control. The root
     * `x-widget` is kept, as are `x-widget-options` and every other keyword.
     */
    plainData?: boolean;
}

/**
 * Walk a (pre-dereferenced) JSON Schema and emit an RJSF uiSchema from the
 * predicate registry — this is how the predicate widget-resolution contract
 * layers over RJSF's name-based widget model. Only fields whose resolution
 * differs from RJSF's own default get a `ui:widget`; `x-placeholder` maps to
 * `ui:placeholder`.
 */
export function buildUiSchema(schema: SchemaNode, registry: WidgetRegistry, options: UiSchemaOptions = {}): UiSchema {
    return walkUiSchema(schema, registry, schema, new Set(), options, true);
}

/**
 * Whether a node is composite (an object or an array, or a union including one): a component bound to it takes
 * over the subtree as an RJSF field, where a primitive node takes a widget. The one test the form's uiSchema walker
 * and the read surfaces share (ruling 04 §5). A local `$ref` and a nullable `anyOf` borrow their target's type,
 * resolved against the root schema.
 */
export function isCompositeNode(schema: SchemaNode, rootSchema: SchemaNode): boolean {
    const nodeType = schema.type ?? compositeTypeOf(schema, rootSchema);
    return (
        nodeType === 'object' ||
        nodeType === 'array' ||
        (Array.isArray(nodeType) && (nodeType.includes('object') || nodeType.includes('array')))
    );
}

/** The effective type of a nullable anyOf node: its first non-null branch's (ref-resolved) type. */
function compositeTypeOf(node: SchemaNode, root: SchemaNode): unknown {
    const resolved = resolveLocalRef(node, root);
    if (resolved.type !== undefined) {
        return resolved.type;
    }

    const branches = (node.anyOf ?? node.oneOf) as SchemaNode[] | undefined;
    if (Array.isArray(branches)) {
        for (const branch of branches) {
            if (branch && typeof branch === 'object' && branch.type !== 'null') {
                const branchType = resolveLocalRef(branch, root).type;
                if (branchType !== undefined) return branchType;
            }
        }
    }

    return undefined;
}

/** Resolve a local '#/$defs/…' / '#/definitions/…' ref against the root schema. */
function resolveLocalRef(node: SchemaNode, root: SchemaNode): SchemaNode {
    const ref = node.$ref;
    if (typeof ref !== 'string' || !ref.startsWith('#/')) {
        return node;
    }

    let target: unknown = root;
    for (const segment of ref.slice(2).split('/')) {
        if (!target || typeof target !== 'object') return node;
        target = (target as Record<string, unknown>)[segment];
    }

    return target && typeof target === 'object' ? (target as SchemaNode) : node;
}

function walkUiSchema(
    schema: SchemaNode,
    registry: WidgetRegistry,
    root: SchemaNode,
    seen: Set<string>,
    walk: UiSchemaOptions,
    isRoot = false,
): UiSchema {
    const ui: UiSchema = {};

    // `bare` acts here, on the resolved schema: a name a fetched reference carried is suppressed too.
    const node = walk.plainData && !isRoot ? withoutDeclaredName(schema) : schema;
    let { widget, config } = registry.resolveEntry(node, walk.context);
    // Plain open-object editing belongs to forms, not to general widget/card resolution.
    if (
        widget === undefined &&
        !node['x-widget'] &&
        schema.type === 'object' &&
        !schema.$ref &&
        !schema.anyOf &&
        !schema.oneOf &&
        !schema.allOf &&
        Object.keys(schema.properties ?? {}).length === 0 &&
        schema.additionalProperties !== false
    ) {
        ({ widget, config } = registry.resolveEntry({ ...schema, 'x-widget': 'json' }));
    }
    let fieldReplacesAnyOrOneOf = false;
    if (widget !== undefined) {
        // RJSF routes ui:widget only on primitive fields; a component resolved
        // for an object/array node takes over the whole subtree as ui:field.
        // A local $ref node borrows its target's type; a nullable anyOf
        // ([$ref|type, null]) borrows its first non-null branch's.
        if (typeof widget !== 'string' && isCompositeNode(schema, root)) {
            ui['ui:field'] = widget;
            // An anyOf node would ALSO render RJSF's option selector beside the
            // custom field unless the field declares it replaces the anyOf.
            fieldReplacesAnyOrOneOf = Array.isArray(schema.anyOf) || Array.isArray(schema.oneOf);
        } else {
            ui['ui:widget'] = widget;
        }
    }
    if (typeof schema['x-placeholder'] === 'string') {
        ui['ui:placeholder'] = schema['x-placeholder'];
    }

    // The widget-config pipe: the matched registry entry's config (lowest
    // precedence) deep-merged under the schema's own x-widget-options; the
    // caller uiSchema still wins last through mergeUiSchema.
    const declaredOptions = schema['x-widget-options'];
    const options = mergeOptions(
        mergeOptions(
            config,
            fieldReplacesAnyOrOneOf ? { fieldReplacesAnyOrOneOf: true } : undefined,
        ),
        declaredOptions && typeof declaredOptions === 'object' && !Array.isArray(declaredOptions)
            ? (declaredOptions as Record<string, unknown>)
            : undefined,
    );
    if (options && Object.keys(options).length > 0) {
        ui['ui:options'] = options;
    }

    // Arrays without an items definition can't be rendered generically (RJSF
    // shows an "unsupported field" error block) — hide them; they're edited
    // through richer surfaces, not the plain form.
    const type = schema.type;
    const isArray = type === 'array' || (Array.isArray(type) && type.includes('array'));
    if (isArray && (!schema.items || typeof schema.items !== 'object')) {
        ui['ui:widget'] = 'hidden';
    }

    // Descend through a local $ref into its $defs target, so the item-less-array
    // guard (and any keyword read during the walk) reaches fields defined only
    // behind a ref — RJSF/AJV resolve the ref for the actual form, but the uiSchema
    // must mirror that resolved shape at the data path (e.g. `rule.byday`, whose
    // shapeless array lives in the RecurrenceRuleData $def, not on the parent).
    // A per-branch `seen` copy breaks cycles without treating a diamond (one $def
    // referenced from two siblings) as a cycle.
    let target = schema;
    const ref = schema.$ref;
    if (typeof ref === 'string' && ref.startsWith('#/')) {
        if (seen.has(ref)) return ui;
        seen = new Set(seen).add(ref);
        target = resolveLocalRef(schema, root);
    }

    const properties = target.properties as Record<string, SchemaNode> | undefined;
    if (properties) {
        for (const [key, child] of Object.entries(properties)) {
            const childUi = walkUiSchema(child, registry, root, seen, walk);
            if (Object.keys(childUi).length > 0) {
                ui[key] = childUi;
            }
        }
    }

    const items = target.items as SchemaNode | undefined;
    if (items && typeof items === 'object' && !Array.isArray(items)) {
        const itemsUi = walkUiSchema(items, registry, root, seen, walk);
        if (Object.keys(itemsUi).length > 0) {
            ui.items = itemsUi;
        }
    }

    return ui;
}

/** Deep-merge b over a (b wins on leaves); undefined operands pass through. */
function mergeOptions(
    a?: Record<string, unknown>,
    b?: Record<string, unknown>,
): Record<string, unknown> | undefined {
    if (!a) return b;
    if (!b) return a;
    return mergeUiSchema(a, b);
}

/**
 * Deep-merge a caller-supplied uiSchema over the generated one (caller wins on
 * leaves), so hosts can hand-tune single fields without abandoning the registry.
 */
export function mergeUiSchema(generated: UiSchema, overrides?: UiSchema): UiSchema {
    if (!overrides) return generated;

    const merged: UiSchema = { ...generated };
    for (const [key, value] of Object.entries(overrides)) {
        const existing = merged[key];
        if (
            existing &&
            typeof existing === 'object' &&
            !Array.isArray(existing) &&
            value &&
            typeof value === 'object' &&
            !Array.isArray(value)
        ) {
            merged[key] = mergeUiSchema(existing as UiSchema, value as UiSchema);
        } else {
            merged[key] = value;
        }
    }

    return merged;
}

/**
 * Ticket 44's rule, written once: lift a node's `enumNames` into `ui:enumNames` (RJSF reads only the uiSchema
 * spelling) when it is an array as long as the node's `enum`, unless the uiSchema already sets `ui:enumNames` —
 * a caller's labels win. Returns the uiSchema to use for the node.
 */
export function liftEnumNames(node: SchemaNode, uiSchema: UiSchema): UiSchema {
    const names = node.enumNames;
    const values = node.enum;
    if (!Array.isArray(names) || !Array.isArray(values) || names.length !== values.length) return uiSchema;
    if (uiSchema['ui:enumNames'] !== undefined) return uiSchema;
    return { ...uiSchema, 'ui:enumNames': names };
}

/** The node with its declared widget name removed, so inference resolves it (the plain-data mode). */
function withoutDeclaredName(node: SchemaNode): SchemaNode {
    if (node['x-widget'] === undefined) return node;
    const { 'x-widget': _name, ...rest } = node;
    return rest;
}
