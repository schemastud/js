import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { FacetsProvider } from '@schemastud/facets';
import { WidgetRegistryContext, type WidgetRegistry } from '@schemastud/seam';
import { registerResourceRefWidget } from './ResourceRefWidget';
import type { FrameInjection } from './types';

const FrameContext = createContext<FrameInjection | null>(null);

// Which registries have already had frame's built-in widgets installed. A WeakSet so
// a registry that goes out of scope is not retained. Guards double-registration under
// React strict-mode double-invoke and across re-renders.
const installedRegistries = new WeakSet<WidgetRegistry>();

/** Install frame's built-in widgets into a registry exactly once (idempotent). */
function ensureBuiltinWidgets(registry: WidgetRegistry | undefined | null): void {
    // Tolerate a missing/partial registry (a host that hasn't wired one, or a test
    // partial). Don't hard-crash; there is simply nothing to install into.
    if (!registry || typeof registry !== 'object' || typeof registry.registerWidget !== 'function') {
        return;
    }
    if (installedRegistries.has(registry)) return;
    // Mark AFTER the call succeeds, not before — found live: marking first means a
    // registerResourceRefWidget() that throws (or a caller that somehow reaches here
    // twice re-entrantly) leaves the guard permanently tripped with the widget never
    // actually installed, and no way to retry.
    registerResourceRefWidget(registry);
    installedRegistries.add(registry);
}

/**
 * One provider at the app root carrying the whole FrameInjection bundle. It also
 * wires the sub-contexts frame's shells lean on: facets' provider (transport +
 * primitives + URL-state, which useListFilters reads) and seam's WidgetRegistry
 * context (which SchemaForm resolves widgets through). A host sets this up once.
 */
export function FrameProvider({ value, children }: { value: FrameInjection; children: ReactNode }) {
    // Auto-register frame's built-in widgets (the resource-ref picker) into the host's
    // registry once — a frame capability available everywhere, not per-surface. Runs in
    // a useMemo keyed on registry identity so it is side-effect-safe under strict mode
    // (the WeakSet guard makes a repeat call a no-op regardless).
    useMemo(() => ensureBuiltinWidgets(value.registry), [value.registry]);

    const facetsValue = useMemo(
        () => ({
            transport: value.transport,
            primitives: value.primitives,
            useUrlState: value.useUrlState,
        }),
        [value.transport, value.primitives, value.useUrlState],
    );

    return (
        <FrameContext.Provider value={value}>
            <FacetsProvider value={facetsValue}>
                <WidgetRegistryContext.Provider value={value.registry}>
                    {children}
                </WidgetRegistryContext.Provider>
            </FacetsProvider>
        </FrameContext.Provider>
    );
}

/** Read the injection bundle; throws if a frame shell renders outside a provider. */
export function useFrameInjection(): FrameInjection {
    const injection = useContext(FrameContext);
    if (!injection) {
        throw new Error(
            '@schemastud/frame: no FrameProvider found. Wrap your app in <FrameProvider value={{ transport, primitives, useUrlState, registry, schemaFetcher, can }}>.',
        );
    }
    return injection;
}
