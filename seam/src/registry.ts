import type {
    RegisteredName,
    RegistryEntry,
    ResolvedWidget,
    SchemaNode,
    WidgetConfig,
    WidgetRegistry,
    WidgetResolution,
    WidgetScope,
} from './types';
import { mergeUiSchema } from './ui-schema';
import { ButtonGroupWidget } from './widgets/button-group';
import { ComboboxWidget } from './widgets/combobox';
import { StarRatingWidget } from './widgets/star-rating';
import { JsonField } from './widgets/json';

const FORMAT_INPUTS = ['date', 'date-time', 'email', 'uri'];

/**
 * An entry in resolution order. A name entry carries the name it binds and, when scoped, its
 * contexts; its predicate matches the node's `x-widget` only. A predicate entry has no name.
 */
interface Entry extends RegistryEntry {
    name?: string;
    contexts?: readonly string[];
}

/** RJSF's stock widget names, as `@rjsf/utils`' `getWidget` maps them across node types (RJSF 6). */
export const RJSF_STOCK_NAMES = [
    'alt-date',
    'alt-datetime',
    'checkbox',
    'checkboxes',
    'color',
    'data-url',
    'date',
    'date-time',
    'datetime',
    'email',
    'file',
    'files',
    'hidden',
    'hostname',
    'ipv4',
    'ipv6',
    'password',
    'radio',
    'range',
    'select',
    'text',
    'textarea',
    'time',
    'updown',
    'uri',
] as const;

/**
 * Seam's built-in names, registered by name and unscoped: RJSF's 25 stock names, each resolving to
 * itself, and seam's own four widgets.
 */
const BUILTIN_NAMES: ReadonlyArray<readonly [string, WidgetResolution]> = [
    // RJSF's 25 stock names (the keys of `@rjsf/utils` getWidget's widget map), each resolving to itself, so a
    // declaration can name any of them (ruling 04 §5). Valid only on the node types RJSF lists each under.
    ...RJSF_STOCK_NAMES.map((name) => [name, name] as const),
    ['combobox', ComboboxWidget],
    ['json', JsonField],
    ['button-group', ButtonGroupWidget],
    ['star-rating', StarRatingWidget],
];

/**
 * The inference that runs after the names: what RJSF draws for a node that names no widget.
 *
 *   1. enum: ≤4 entries → radio, otherwise select
 *   2. format: file → file widget; date/date-time/email/uri → native format inputs
 *   3. type: boolean/number/integer → RJSF defaults
 *   4. fallback → RJSF's string default
 *
 * Entries resolving to `undefined` mean RJSF's own default already matches the contract, so the
 * uiSchema walker emits nothing for them.
 */
const INFERENCE: Entry[] = [
    // enum → radio for small sets (≤4); RJSF's default select covers the rest
    {
        predicate: (s) => Array.isArray(s.enum) && (s.enum as unknown[]).length <= 4,
        widget: 'radio',
    },
    { predicate: (s) => Array.isArray(s.enum), widget: undefined },
    // format-based
    { predicate: (s) => s.format === 'file', widget: 'file' },
    {
        predicate: (s) => FORMAT_INPUTS.includes(s.format as string),
        widget: undefined,
    },
    // type-based and string fallback: RJSF defaults are the contract
];

function nameEntry(name: string, widget: WidgetResolution, config?: WidgetConfig, scope?: WidgetScope): Entry {
    return {
        predicate: (s) => s['x-widget'] === name,
        widget,
        config,
        name,
        ...(scope?.contexts ? { contexts: [...scope.contexts] } : {}),
    };
}

function inScope(entry: Entry, context: string | undefined): boolean {
    return entry.contexts === undefined || (context !== undefined && entry.contexts.includes(context));
}

function plainObject(value: unknown): Record<string, unknown> | undefined {
    return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : undefined;
}

function mergeOptions(a?: Record<string, unknown>, b?: Record<string, unknown>): Record<string, unknown> | undefined {
    if (!a) return b;
    if (!b) return a;
    return mergeUiSchema(a, b);
}

/**
 * A registry holding every seam built-in: the eight names in `BUILTIN_NAMES`, then the
 * inference in `INFERENCE`. Each call returns a new, independent registry.
 */
export function createWidgetRegistry(): WidgetRegistry {
    const entries: Entry[] = [...BUILTIN_NAMES.map(([name, widget]) => nameEntry(name, widget)), ...INFERENCE];

    function registerWidget(
        nameOrPredicate: string | ((schema: SchemaNode) => boolean),
        widget: WidgetResolution,
        config?: WidgetConfig,
        scope?: WidgetScope,
    ): void {
        const entry: Entry =
            typeof nameOrPredicate === 'function'
                ? { predicate: nameOrPredicate, widget, config }
                : nameEntry(nameOrPredicate, widget, config, scope);
        // Later registrations take precedence.
        entries.unshift(entry);
    }

    /** The registration that binds `name` in `context`: the latest scoped one, else the latest unscoped one. */
    function binding(name: string, context: string | undefined): Entry | undefined {
        const named = entries.filter((e) => e.name === name);
        return (
            named.find((e) => e.contexts !== undefined && inScope(e, context)) ??
            named.find((e) => e.contexts === undefined)
        );
    }

    function resolveEntry(schema: SchemaNode, context?: string): ResolvedWidget {
        const declared = typeof schema['x-widget'] === 'string' ? schema['x-widget'] : undefined;
        const bound = declared === undefined ? undefined : binding(declared, context);
        const declaredOptions = plainObject(schema['x-widget-options']);

        const result = (entry: Entry | undefined): ResolvedWidget => {
            const config = entry === undefined
                ? undefined
                : typeof entry.config === 'function' ? entry.config(schema) : entry.config;
            const options = mergeOptions(config, declaredOptions);
            return {
                widget: entry?.widget,
                ...(config !== undefined ? { config } : {}),
                ...(options !== undefined ? { options } : {}),
                ...(declared !== undefined ? { bound: bound !== undefined, name: declared } : {}),
            };
        };

        // One pass in registration order, as before: the first entry that applies wins. A name
        // entry applies when it names the declared widget and its scope admits the context, and
        // then the name's binding (scoped beats unscoped) answers, whichever registration of the
        // name came first in the order.
        for (const entry of entries) {
            if (entry.name !== undefined) {
                if (entry.name === declared && inScope(entry, context)) return result(bound);
                continue;
            }
            if (entry.predicate(schema)) return result(entry);
        }
        return result(undefined);
    }

    function resolveWidget(schema: SchemaNode, context?: string): WidgetResolution {
        return resolveEntry(schema, context).widget;
    }

    /**
     * Per name, its registrations in the order they win: every scoped one, latest first and shadowed
     * ones included, then the latest unscoped one. An earlier unscoped one never answers, so it is
     * not listed.
     */
    function names(): RegisteredName[] {
        const named = [...new Set(entries.flatMap((e) => (e.name === undefined ? [] : [e.name])))];
        return named
            .map((name) => {
                const own = entries.filter((e) => e.name === name);
                const answering = [
                    ...own.filter((e) => e.contexts !== undefined),
                    ...own.filter((e) => e.contexts === undefined).slice(0, 1),
                ];
                return {
                    name,
                    registrations: answering.map((e) => ({
                        contexts: e.contexts ? [...e.contexts].sort() : null,
                        widget: e.widget,
                    })),
                };
            })
            .sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
    }

    return { registerWidget, resolveWidget, resolveEntry, names };
}

/**
 * Default singleton — used by SchemaForm when no registry prop/context is given; extended by
 * registerWidget calls in consuming apps. It is one `createWidgetRegistry()` and holds nothing
 * a fresh registry lacks.
 */
export const defaultRegistry = createWidgetRegistry();

export const registerWidget = defaultRegistry.registerWidget;
export const resolveWidget = defaultRegistry.resolveWidget;
