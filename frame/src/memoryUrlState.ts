import { useSyncExternalStore } from 'react';
import type { UseUrlState } from '@schemastud/facets';

/**
 * URL state held in memory: one store per call, shared by every component that reads the
 * returned hook. ListShell, the facets bar and pagination all read and write `useUrlState`; a
 * nested surface (the record picker) or a test gets its own instead of the page URL, which would
 * mix its `filter[…]` and `page` into the host's own list.
 *
 * `fixed` params are ENFORCED, not seeded: they are re-applied after every write, so no facet
 * clear, saved view or vocabulary change can drop them. On a collision the fixed value wins.
 */
export function createMemoryUrlState(initial = '', fixed: Record<string, string> = {}): UseUrlState {
    const enforce = (params: URLSearchParams) => {
        for (const [key, value] of Object.entries(fixed)) params.set(key, value);
        return params;
    };
    let current = enforce(new URLSearchParams(initial));
    const listeners = new Set<() => void>();
    const snapshot = () => current;
    const subscribe = (notify: () => void) => {
        listeners.add(notify);
        return () => {
            listeners.delete(notify);
        };
    };
    return function useMemoryUrlState() {
        const params = useSyncExternalStore(subscribe, snapshot, snapshot);
        return [
            params,
            (updater: (previous: URLSearchParams) => URLSearchParams) => {
                current = enforce(updater(new URLSearchParams(current)));
                listeners.forEach((notify) => notify());
            },
        ] as const;
    };
}
