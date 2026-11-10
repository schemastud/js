import { useMemo } from 'react';
import { widgetFormContext, type SchemaNode, type WidgetRegistry } from '@schemastud/seam';
import { useOptionalFrameInjection } from './context';
import { ResourceRecordPicker } from './resource-picker/RecordPicker';
import {
    selectionFromValue,
    selectionToValue,
    type ResourceSelectMode,
} from './resource-picker/selection';

/** The keyword a reference field carries its picker config on (`x-stud-resource-ref`); the form mode never touches it. */
export const STUD_RESOURCE_REF_KEYWORD = 'x-stud-resource-ref';

// =============================================================================
// FC-04 — the `x-stud-resource-ref` field widget, now the ResourcePicker's compact
// face (owner-review-20261102 RP). It replaced a plain `<select>` over ONE unfiltered
// `transport.list` page, which had no search and no paging and so silently truncated
// any kind larger than a page. The wire shape (pinned on BOTH sides — the PHP
// ResourceRefStrategy emits the first five keys):
//
//   x-stud-resource-ref: { resource, value, label, multiple?, scope?, select?, searchFacet? }
//
// `select` (single | multi | set) supersedes `multiple`; absent, `multiple: true` reads
// as `multi`. A field's form value is one id (single), an id array (multi), or the
// selection object itself (set, or a multi field promoted to "all matching").
// =============================================================================

/** The config bag frame reads off the schema node (mirror of the PHP-emitted shape). */
export interface ResourceRefConfig {
    resource: string;
    value: string;
    label: string;
    multiple?: boolean;
    scope?: Record<string, string | number | boolean>;
    /** The selection model; defaults from `multiple`. */
    select?: ResourceSelectMode;
    /** The `filter[<name>]` the typeahead searches; defaults to `keywords`. */
    searchFacet?: string;
}

const SELECT_MODES: ResourceSelectMode[] = ['single', 'multi', 'set'];

/** Read the picker config off a schema node; undefined when the keyword is absent. */
export function readResourceRefConfig(schema: SchemaNode | undefined): ResourceRefConfig | undefined {
    const cfg = schema?.[STUD_RESOURCE_REF_KEYWORD];
    if (cfg == null || typeof cfg !== 'object') return undefined;
    const bag = cfg as Record<string, unknown>;
    if (typeof bag.resource !== 'string') return undefined;
    const multiple = bag.multiple === true;
    const select = SELECT_MODES.includes(bag.select as ResourceSelectMode)
        ? (bag.select as ResourceSelectMode)
        : multiple
          ? 'multi'
          : 'single';
    return {
        resource: bag.resource,
        value: typeof bag.value === 'string' ? bag.value : 'id',
        label: typeof bag.label === 'string' ? bag.label : 'name',
        multiple: select !== 'single',
        scope: (bag.scope as ResourceRefConfig['scope']) ?? undefined,
        select,
        ...(typeof bag.searchFacet === 'string' ? { searchFacet: bag.searchFacet } : {}),
    };
}

/** Coerce a scope bag to the transport's `Record<string, string>` query params. */
function stringifyScope(scope: ResourceRefConfig['scope']): Record<string, string> {
    const out: Record<string, string> = {};
    if (!scope) return out;
    for (const [k, v] of Object.entries(scope)) {
        out[k] = String(v);
    }
    return out;
}

// The RJSF WidgetProps subset this widget actually reads — kept loose so the widget
// mounts across an RJSF version bump without binding a version-specific prop shape.
interface ResourceRefWidgetProps {
    id?: string;
    value?: unknown;
    disabled?: boolean;
    readonly?: boolean;
    onChange: (value: unknown) => void;
    schema?: SchemaNode;
    formContext?: unknown;
    registry?: { formContext?: unknown };
}

/**
 * An RJSF widget: a resource-reference field renders the ResourcePicker's compact body — a
 * server typeahead (`filter[<searchFacet>]`, `per_page=8`) with "Browse all N with filters"
 * opening the embedded list shell in a sheet. It emits through RJSF `onChange`.
 *
 * Outside a FrameProvider (seam's `defaultRegistry` resolving on a hand-rolled form walker with
 * no transport in reach) it degrades to a read-only readout of the stored value instead of
 * throwing, because there is nothing to search.
 */
export function ResourceRefWidget(props: ResourceRefWidgetProps) {
    // widgetFormContext is read for RJSF-version-insulated form context; frame widgets
    // that ride a formContext sidecar read it through here.
    widgetFormContext(props);

    const injection = useOptionalFrameInjection();
    const cfg = useMemo(() => readResourceRefConfig(props.schema), [props.schema]);
    const scopeKey = JSON.stringify(cfg?.scope ?? {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
    const scope = useMemo(() => stringifyScope(cfg?.scope), [scopeKey]);

    if (!cfg) return null;
    const select = cfg.select ?? 'single';

    if (!injection) {
        const isSet = typeof props.value === 'object' && props.value !== null && !Array.isArray(props.value);
        const shown = isSet
            ? 'A dynamic set'
            : Array.isArray(props.value)
              ? props.value.join(', ')
              : props.value == null
                ? ''
                : String(props.value);
        return (
            <input
                id={props.id}
                data-frame-widget="resource-ref"
                readOnly
                disabled
                value={shown}
                title="Resource search needs a FrameProvider"
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
            />
        );
    }

    return (
        <div data-frame-widget="resource-ref" className="min-w-0">
            <ResourceRecordPicker
                id={props.id}
                resource={cfg.resource}
                density="compact"
                select={select}
                // A `multi` field stores an id ARRAY: never offer the set promotion that would turn it
                // into an object. Only an explicit `select: 'set'` field stores a selection object.
                allowSet={select === 'set'}
                valueField={cfg.value}
                labelField={cfg.label}
                searchFacet={cfg.searchFacet}
                scope={scope}
                disabled={props.disabled || props.readonly}
                value={selectionFromValue(props.value)}
                onChange={(next) => props.onChange(selectionToValue(next, select))}
            />
        </div>
    );
}

/** The ResourcePicker's form-field face — the same component under its new name. */
export const ResourcePickerWidget = ResourceRefWidget;

/**
 * Does this node resolve to the picker? Any node carrying `x-stud-resource-ref`, EXCEPT one that
 * also names an explicit `x-widget`: that is the host's declared choice (a silo tree, a tag
 * input), and frame installs late — into a host's fresh registry and into seam's singleton at
 * provider mount — so without this a built-in would silently shadow the declaration.
 */
export function isResourceRefNode(schema: SchemaNode): boolean {
    return schema[STUD_RESOURCE_REF_KEYWORD] != null && schema['x-widget'] == null;
}

/**
 * Register the resource-ref widget under a predicate matching any node carrying the
 * `x-stud-resource-ref` keyword. Idempotent registration is the caller's concern
 * (FrameProvider guards a once-per-registry install); the seam consults later
 * registrations first, so a re-register would merely shadow itself harmlessly.
 */
export function registerResourceRefWidget(registry: WidgetRegistry): void {
    registry.registerWidget(isResourceRefNode, ResourceRefWidget);
}
