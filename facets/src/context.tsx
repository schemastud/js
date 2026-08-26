import { createContext, useContext, type ReactNode } from 'react';
import type { FacetsInjection } from './types';

/**
 * Carries the host's injected transport + primitives + url-state seam to every
 * facets hook and component. Mirrors the `WidgetRegistryContext` precedent in
 * `@schemastud/seam` — one context, read at the leaves, provided once at the root.
 */
const FacetsContext = createContext<FacetsInjection | null>(null);

export function FacetsProvider({
    value,
    children,
}: {
    value: FacetsInjection;
    children: ReactNode;
}) {
    return <FacetsContext.Provider value={value}>{children}</FacetsContext.Provider>;
}

/**
 * The RESOURCE the surrounding facets surface is filtering.
 *
 * Separate from {@link FacetsInjection} because it is per-bar, not per-app: one host injects one
 * transport and mounts many lists. Added when the filter endpoints became per-resource
 * (splicewire api-surface-coherence 35) — `getFilterOptions` used to take a bare `optionsRef`,
 * which meant a flat, resource-less options route on the server with nothing to authorize against.
 *
 * A context rather than a prop threaded through `FacetsBar → FacetControl → MultiSelectFilter →
 * useFilterOptions`: the two components that actually need it are leaves, four levels down a tree
 * whose intermediate props are all about rendering a chip.
 */
const FacetsResourceContext = createContext<string | null>(null);

export function FacetsResourceProvider({
    resource,
    children,
}: {
    resource: string;
    children: ReactNode;
}) {
    return (
        <FacetsResourceContext.Provider value={resource}>{children}</FacetsResourceContext.Provider>
    );
}

/**
 * The resource in scope. Null outside a `FacetsBar` — a caller using the hooks standalone passes
 * the resource itself.
 */
export function useFacetsResource(): string | null {
    return useContext(FacetsResourceContext);
}

/** Read the injection bundle; throws if a facets hook/component renders outside a provider. */
export function useFacetsInjection(): FacetsInjection {
    const injection = useContext(FacetsContext);
    if (!injection) {
        throw new Error(
            '@schemastud/facets: no FacetsProvider found. Wrap your app in <FacetsProvider value={{ transport, primitives, useUrlState }}>.',
        );
    }
    return injection;
}
