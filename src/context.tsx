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
