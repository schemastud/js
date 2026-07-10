import type { SchemaNode, WidgetRegistry } from './types';

type UiSchema = Record<string, unknown>;

/**
 * Walk a (pre-dereferenced) JSON Schema and emit an RJSF uiSchema from the
 * predicate registry — this is how the predicate widget-resolution contract
 * layers over RJSF's name-based widget model. Only fields whose resolution
 * differs from RJSF's own default get a `ui:widget`; `x-placeholder` maps to
 * `ui:placeholder`.
 */
export function buildUiSchema(schema: SchemaNode, registry: WidgetRegistry): UiSchema {
    return walkUiSchema(schema, registry, schema);
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

function walkUiSchema(schema: SchemaNode, registry: WidgetRegistry, root: SchemaNode): UiSchema {
    const ui: UiSchema = {};

    const { widget, config } = registry.resolveEntry(schema);
    if (widget !== undefined) {
        // RJSF routes ui:widget only on primitive fields; a component resolved
        // for an object/array node takes over the whole subtree as ui:field.
        // A local $ref node borrows its target's type for the check.
        const nodeType = schema.type ?? resolveLocalRef(schema, root).type;
        const isComposite =
            nodeType === 'object' ||
            nodeType === 'array' ||
            (Array.isArray(nodeType) &&
                (nodeType.includes('object') || nodeType.includes('array')));
        if (typeof widget !== 'string' && isComposite) {
            ui['ui:field'] = widget;
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
        config,
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

    const properties = schema.properties as Record<string, SchemaNode> | undefined;
    if (properties) {
        for (const [key, child] of Object.entries(properties)) {
            const childUi = walkUiSchema(child, registry, root);
            if (Object.keys(childUi).length > 0) {
                ui[key] = childUi;
            }
        }
    }

    const items = schema.items as SchemaNode | undefined;
    if (items && typeof items === 'object' && !Array.isArray(items)) {
        const itemsUi = walkUiSchema(items, registry, root);
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
