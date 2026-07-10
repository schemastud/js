import type { SchemaNode, WidgetRegistry } from './types';

type UiSchema = Record<string, unknown>;

/**
 * Walk a (pre-dereferenced) JSON Schema and emit an RJSF uiSchema from the
 * predicate registry — this is how the Splicewire widget-resolution contract
 * layers over RJSF's name-based widget model. Only fields whose resolution
 * differs from RJSF's own default get a `ui:widget`; `x-placeholder` maps to
 * `ui:placeholder`.
 */
export function buildUiSchema(schema: SchemaNode, registry: WidgetRegistry): UiSchema {
    const ui: UiSchema = {};

    const widget = registry.resolveWidget(schema);
    if (widget !== undefined) {
        ui['ui:widget'] = widget;
    }
    if (typeof schema['x-placeholder'] === 'string') {
        ui['ui:placeholder'] = schema['x-placeholder'];
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
            const childUi = buildUiSchema(child, registry);
            if (Object.keys(childUi).length > 0) {
                ui[key] = childUi;
            }
        }
    }

    const items = schema.items as SchemaNode | undefined;
    if (items && typeof items === 'object' && !Array.isArray(items)) {
        const itemsUi = buildUiSchema(items, registry);
        if (Object.keys(itemsUi).length > 0) {
            ui.items = itemsUi;
        }
    }

    return ui;
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
