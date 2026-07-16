import { useEffect, useMemo, useState } from 'react';
import { widgetFormContext, type SchemaNode, type WidgetRegistry } from '@schemastud/seam';
import { useFrameInjection } from './context';
import { STUD_RESOURCE_REF_KEYWORD } from './raw-mode';
import type { Row } from './types';

// =============================================================================
// FC-04 — the `x-stud-resource-ref` picker widget. A property that references rows
// of another registered frame resource renders as a select whose options are fetched
// from that resource's index through the injected transport. The wire shape (pinned
// on BOTH sides — the PHP ResourceRefStrategy emits exactly this):
//   x-stud-resource-ref: { resource, value, label, multiple?, scope? }
// =============================================================================

/** The config bag frame reads off the schema node (mirror of the PHP-emitted shape). */
export interface ResourceRefConfig {
    resource: string;
    value: string;
    label: string;
    multiple?: boolean;
    scope?: Record<string, string | number | boolean>;
}

/** A resolved picker option. */
interface RefOption {
    value: string;
    label: string;
}

/** Read the picker config off a schema node; undefined when the keyword is absent. */
export function readResourceRefConfig(schema: SchemaNode | undefined): ResourceRefConfig | undefined {
    const cfg = schema?.[STUD_RESOURCE_REF_KEYWORD];
    if (cfg == null || typeof cfg !== 'object') return undefined;
    const bag = cfg as Record<string, unknown>;
    if (typeof bag.resource !== 'string') return undefined;
    return {
        resource: bag.resource,
        value: typeof bag.value === 'string' ? bag.value : 'id',
        label: typeof bag.label === 'string' ? bag.label : 'name',
        multiple: bag.multiple === true,
        scope: (bag.scope as ResourceRefConfig['scope']) ?? undefined,
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
 * An RJSF widget: on mount it lists the referenced resource (scope → query params),
 * maps rows to `{ value, label }`, and renders a controlled select. `multiple:true`
 * renders a multi-select whose value is a string[]; else a single select. It emits
 * through RJSF `onChange`. Loading/empty are minimal, accessible states. If the
 * injected transport is somehow absent it degrades to an empty control rather than
 * hard-crashing (this is a package-internal widget; a host's shadcn wrapper is out of
 * scope here).
 */
export function ResourceRefWidget(props: ResourceRefWidgetProps) {
    // widgetFormContext is read for RJSF-version-insulated form context; frame widgets
    // that ride a formContext sidecar read it through here.
    widgetFormContext(props);

    const injection = useFrameInjection();
    const transport = injection.transport;
    const cfg = useMemo(() => readResourceRefConfig(props.schema), [props.schema]);

    const [options, setOptions] = useState<RefOption[]>([]);
    const [loading, setLoading] = useState<boolean>(Boolean(cfg));

    useEffect(() => {
        if (!cfg || !transport) {
            setLoading(false);
            return;
        }
        let cancelled = false;
        setLoading(true);
        transport
            .list(cfg.resource, stringifyScope(cfg.scope))
            .then((page) => {
                if (cancelled) return;
                const rows = (page?.data ?? []) as Row[];
                setOptions(
                    rows.map((row) => ({
                        value: String(row[cfg.value]),
                        label: String(row[cfg.label]),
                    })),
                );
            })
            .catch(() => {
                if (!cancelled) setOptions([]);
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });
        return () => {
            cancelled = true;
        };
        // Re-fetch only when the resource identity or its scope changes.
    }, [transport, cfg?.resource, cfg?.value, cfg?.label, JSON.stringify(cfg?.scope)]);

    if (!cfg) return null;

    const disabled = props.disabled || props.readonly;
    const multiple = cfg.multiple === true;

    if (multiple) {
        const selected = Array.isArray(props.value) ? props.value.map((v) => String(v)) : [];
        return (
            <select
                id={props.id}
                data-frame-widget="resource-ref"
                multiple
                disabled={disabled}
                value={selected}
                aria-busy={loading || undefined}
                onChange={(e) => {
                    const next = Array.from(e.target.selectedOptions).map((o) => o.value);
                    props.onChange(next);
                }}
                className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
            >
                {options.map((o) => (
                    <option key={o.value} value={o.value}>
                        {o.label}
                    </option>
                ))}
            </select>
        );
    }

    const single = props.value == null ? '' : String(props.value);
    return (
        <select
            id={props.id}
            data-frame-widget="resource-ref"
            disabled={disabled}
            value={single}
            aria-busy={loading || undefined}
            onChange={(e) => props.onChange(e.target.value === '' ? undefined : e.target.value)}
            className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
        >
            <option value="">{loading ? 'Loading…' : `Select ${cfg.resource}…`}</option>
            {options.map((o) => (
                <option key={o.value} value={o.value}>
                    {o.label}
                </option>
            ))}
        </select>
    );
}

/**
 * Register the resource-ref widget under a predicate matching any node carrying the
 * `x-stud-resource-ref` keyword. Idempotent registration is the caller's concern
 * (FrameProvider guards a once-per-registry install); the seam consults later
 * registrations first, so a re-register would merely shadow itself harmlessly.
 */
export function registerResourceRefWidget(registry: WidgetRegistry): void {
    registry.registerWidget((s) => s[STUD_RESOURCE_REF_KEYWORD] != null, ResourceRefWidget);
}
