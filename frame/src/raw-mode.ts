import type { SchemaNode } from '@schemastud/seam';

/**
 * The frame's host-widget keyword — emitted by `#[Widget(...)]` on an edit DTO
 * (laravel-frame's `Keywords::Widget`). A property carrying it resolves to a
 * host-registered widget through seam's WidgetRegistry — via {@see bridgeHostWidgets},
 * which every consumer of the served schema needs to run first; seam's registry
 * predicates read the BARE `x-widget`, never this namespaced one directly.
 */
export const STUD_WIDGET_KEYWORD = 'x-stud-widget';

/** The `#[Widget(options: ...)]` sidecar (laravel-frame's `Keywords::WidgetOptions`). */
export const STUD_WIDGET_OPTIONS_KEYWORD = 'x-stud-widget-options';

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

/**
 * Bridge `#[Widget(...)]`'s namespaced `x-stud-widget`/`x-stud-widget-options` onto
 * seam's bare `x-widget`/`x-widget-options`, recursively — the missing half of the
 * `enriched` mode contract. Found live: seam's WidgetRegistry predicates (and
 * `button-group`/`star-rating`, its own generic widgets) check the BARE keyword only;
 * nothing anywhere translated frame's namespaced one, so a `#[Widget(...)]`-declared
 * widget never actually resolved in EITHER form mode — `enriched` mode passed the
 * served schema through completely untouched. `#[ResourceRef]` was unaffected (its
 * widget is registered against `x-stud-resource-ref` directly), which is why that one
 * "just worked" and this one silently didn't. Mirrors the per-context translation
 * `resolveWidgetFor.ts` already does for the `#[WidgetIn]` cascade — this covers the
 * plain, non-context `#[Widget]` path `DefaultFormBody`/`SchemaForm` renders through.
 *
 * Returns a new tree (never mutates the cached query result), same shape as
 * `stripHostWidgets`.
 */
export function bridgeHostWidgets(schema: SchemaNode): SchemaNode {
    if (!schema || typeof schema !== 'object') {
        return schema;
    }

    const next: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(schema)) {
        next[key] = bridgeSchemaValue(value);
    }

    if (typeof next[STUD_WIDGET_KEYWORD] === 'string') {
        next['x-widget'] = next[STUD_WIDGET_KEYWORD];
    }
    const options = next[STUD_WIDGET_OPTIONS_KEYWORD];
    if (options && typeof options === 'object' && !Array.isArray(options)) {
        next['x-widget-options'] = options;
    }

    return next as SchemaNode;
}

/** Recurse into the values that can themselves hold schema nodes (objects, arrays of branches). */
function bridgeSchemaValue(value: unknown): unknown {
    if (Array.isArray(value)) {
        return value.map((item) => bridgeSchemaValue(item));
    }
    if (value && typeof value === 'object') {
        return bridgeHostWidgets(value as SchemaNode);
    }
    return value;
}
