import type {
    RegistryEntry,
    ResolvedWidget,
    SchemaNode,
    WidgetConfig,
    WidgetRegistry,
    WidgetResolution,
} from './types';
import { ButtonGroupWidget } from './widgets/button-group';
import { StarRatingWidget } from './widgets/star-rating';

const FORMAT_INPUTS = ['date', 'date-time', 'email', 'uri'];

/**
 * The default resolution chain over RJSF's named widgets:
 *
 *   1. `x-widget` explicit override
 *   2. enum: ≤4 entries → radio, otherwise select
 *   3. format: file → file widget; date/date-time/email/uri → native format inputs
 *   4. type: boolean/number/integer → RJSF defaults
 *   5. fallback → RJSF's string default
 *
 * Entries resolving to `undefined` mean RJSF's own default already matches the
 * contract, so the uiSchema walker emits nothing for them.
 */
const defaultEntries: RegistryEntry[] = [
    // x-widget explicit overrides (checked first)
    { predicate: (s) => s['x-widget'] === 'textarea', widget: 'textarea' },
    { predicate: (s) => s['x-widget'] === 'radio', widget: 'radio' },
    { predicate: (s) => s['x-widget'] === 'file', widget: 'file' },
    { predicate: (s) => s['x-widget'] === 'select', widget: 'select' },
    // enum → radio for small sets (≤4); RJSF's default select covers the rest
    {
        predicate: (s) => Array.isArray(s.enum) && (s.enum as unknown[]).length <= 4,
        widget: 'radio',
    },
    { predicate: (s) => Array.isArray(s.enum), widget: undefined },
    // format-based
    { predicate: (s) => s.format === 'file', widget: 'file' },
    { predicate: (s) => FORMAT_INPUTS.includes(s.format as string), widget: undefined },
    // type-based and string fallback: RJSF defaults are the contract
];

export function createWidgetRegistry(): WidgetRegistry {
    const entries: RegistryEntry[] = [...defaultEntries];

    function registerWidget(
        predicateOrKey: string | ((schema: SchemaNode) => boolean),
        widget: WidgetResolution,
        config?: WidgetConfig,
    ): void {
        const predicate =
            typeof predicateOrKey === 'function'
                ? predicateOrKey
                : (s: SchemaNode) =>
                      s.type === predicateOrKey || s['x-widget'] === predicateOrKey;
        // Later registrations take precedence.
        entries.unshift({ predicate, widget, config });
    }

    function resolveEntry(schema: SchemaNode): ResolvedWidget {
        for (const { predicate, widget, config } of entries) {
            if (predicate(schema)) {
                const computed = typeof config === 'function' ? config(schema) : config;
                return { widget, config: computed };
            }
        }
        return { widget: undefined };
    }

    function resolveWidget(schema: SchemaNode): WidgetResolution {
        return resolveEntry(schema).widget;
    }

    return { registerWidget, resolveWidget, resolveEntry };
}

/**
 * Default singleton — used by SchemaForm when no registry prop/context is
 * given; extended by registerWidget calls in consuming apps.
 */
export const defaultRegistry = createWidgetRegistry();

// Generic presentation widgets, registered on the default (unshifted, so they
// precede the `enum ≤ 4 → radio` fallback). They fire only on an explicit
// `x-widget` opt-in, so an attr without one keeps its cardinality default.
defaultRegistry.registerWidget((s) => s['x-widget'] === 'button-group', ButtonGroupWidget);
defaultRegistry.registerWidget((s) => s['x-widget'] === 'star-rating', StarRatingWidget);

export const registerWidget = defaultRegistry.registerWidget;
export const resolveWidget = defaultRegistry.resolveWidget;
