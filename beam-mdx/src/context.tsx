import { usePage } from '@inertiajs/react';
import { createContext, useContext } from 'react';
import type { ReactNode } from 'react';

import type { ContentModule } from './content';
import type { LinksConfig, Reference } from './references';

// The injection seam for the render surface. `<Ref>`, `<Receipts>`, and `<Content>` are
// used *inside* MDX, where props can't reach them — so the satellite-specific bits they
// need (the references manifest and the content resolver bound to this app's module map)
// are supplied once via context, wrapping the MDX render. `links` is NOT here: it already
// rides Inertia's shared page props, so `useLinks()` reads it straight from `usePage()`.

export interface BeamMdxContextValue {
    /** The satellite's citation manifest (the concrete keys `<Ref>` can resolve). */
    references: Reference[];
    /** The satellite's content resolver, bound to its `virtual:beam-mdx/content` map. */
    resolve: (name: string) => ContentModule | undefined;
}

const BeamMdxContext = createContext<BeamMdxContextValue | null>(null);

export function BeamMdxProvider({
    references,
    resolve,
    children,
}: BeamMdxContextValue & { children: ReactNode }) {
    return (
        <BeamMdxContext.Provider value={{ references, resolve }}>
            {children}
        </BeamMdxContext.Provider>
    );
}

/** The manifest + resolver from the nearest provider (empty/no-op defaults if unwrapped). */
export function useBeamMdx(): BeamMdxContextValue {
    return (
        useContext(BeamMdxContext) ?? {
            references: [],
            resolve: () => undefined,
        }
    );
}

/** The env-driven base-URL map from Inertia's shared page props. */
export function useLinks(): LinksConfig {
    const props = usePage().props as { links?: LinksConfig };

    return props.links ?? {};
}
