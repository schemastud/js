import type { SchemaNode } from '@schemastud/seam';

/**
 * The frame's host-widget keyword — emitted by `#[Widget(...)]` on an edit DTO
 * (laravel-frame's `Keywords::Widget`). A property carrying it resolves to a
 * host-registered widget through seam's WidgetRegistry.
 */
export const STUD_WIDGET_KEYWORD = 'x-stud-widget';

/**
 * The frame's resource-reference keyword — emitted by `#[ResourceRef(...)]` on an
 * edit DTO (laravel-frame's `Keywords::ResourceRef`). A property carrying it resolves
 * to frame's built-in ResourceRefWidget, which fetches the referenced resource's index
 * to build picker options. It is a genuine data control (not a rich host affordance),
 * so it is intentionally NOT stripped by `raw` mode.
 */
export const STUD_RESOURCE_REF_KEYWORD = 'x-stud-resource-ref';

/**
 * Strip host-widget overrides from a schema so the `raw` form mode falls back to the
 * inferred controls — the frame's mode contract: `splicewire` resolves host widgets
 * (the rich affordances, e.g. enrich), `raw` edits the plain underlying data. The
 * enrich widget therefore vanishes in `raw` mode, leaving the inferred text control.
 *
 * Returns a new tree (never mutates the cached query result) and recurses through
 * every schema-bearing position RJSF renders from.
 */
export function stripHostWidgets(schema: SchemaNode): SchemaNode {
    if (!schema || typeof schema !== 'object') {
        return schema;
    }

    const next: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(schema)) {
        if (key === STUD_WIDGET_KEYWORD) {
            continue; // drop the host-widget override → inferred control
        }
        next[key] = stripSchemaValue(value);
    }

    return next as SchemaNode;
}

/** Recurse into the values that can themselves hold schema nodes (objects, arrays of branches). */
function stripSchemaValue(value: unknown): unknown {
    if (Array.isArray(value)) {
        return value.map((item) => stripSchemaValue(item));
    }
    if (value && typeof value === 'object') {
        return stripHostWidgets(value as SchemaNode);
    }
    return value;
}
