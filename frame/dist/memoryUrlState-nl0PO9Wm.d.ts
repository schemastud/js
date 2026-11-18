import { UseUrlState } from '@schemastud/facets';

/**
 * URL state held in memory: one store per call, shared by every component that reads the
 * returned hook. ListShell, the facets bar and pagination all read and write `useUrlState`; a
 * nested surface (the record picker) or a test gets its own instead of the page URL, which would
 * mix its `filter[…]` and `page` into the host's own list.
 *
 * `fixed` params are ENFORCED, not seeded: they are re-applied after every write, so no facet
 * clear, saved view or vocabulary change can drop them. On a collision the fixed value wins.
 *
 * Each call is a fresh store, initialized from `initial` plus the enforced `fixed` values. In a reusable nested
 * component, create it in a `useState` initializer (`useState(() => createMemoryUrlState(…))`) so each mounted instance
 * owns its store. Never call it per render, and bind it at module scope only when every instance should deliberately
 * share one store. The store keeps its first `initial` and `fixed`; to reset it, remount with a `key`.
 */
declare function createMemoryUrlState(initial?: string, fixed?: Record<string, string>): UseUrlState;

export { createMemoryUrlState as c };
