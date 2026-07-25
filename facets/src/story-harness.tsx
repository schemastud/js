/* eslint-disable */
// =============================================================================
// story-harness — the shared Storybook fixtures for the @schemastud/facets catalog
// (component-seams map, ticket 16). NOT part of the shipped package: tsup builds only
// the `index.ts` graph, so this file (imported solely by *.stories.tsx) never enters
// `dist`. It exists so every facets story renders the REAL surface against a
// realistic-but-in-memory injection instead of re-mocking the FacetsInjection
// (transport · primitives · useUrlState) per story.
//
// Facets has ONE injection family (unlike frame's two): the `FacetsInjection` bundle
// carried by `<FacetsProvider>`. Every facets component (FacetsBar / MultiSelectFilter
// / SavedViews / ListFilters) reads it, so one <MockFacetsProvider> serves the whole
// catalog. The primitives are the @schemastud/ui foundation set — the exact eight
// `FacetsPrimitives` the app binds when it mounts the bar. @schemastud/ui is a
// dev-only workbench dependency here (the package itself injects, never imports, a
// primitive set), so it lands in facets/package.json devDependencies, never in the
// runtime graph.
// =============================================================================
import { useMemo, useState, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
    Badge,
    Button,
    Input,
    Label,
    Popover,
    PopoverContent,
    PopoverTrigger,
    SimpleSelect,
} from '@schemastud/ui';
import { FacetsProvider } from './context';
import type {
    FacetsInjection,
    FacetsPrimitives,
    FacetsTransport,
    FilterOption,
    FilterSchema,
    SavedFilter,
} from './types';

// ── Primitives ────────────────────────────────────────────────────────────────
// The workbench binding of facets' `FacetsPrimitives` seam — the @schemastud/ui
// foundation set (the exact primitives the app binds in ui/src/frame/primitives.tsx).
export const mockPrimitives: FacetsPrimitives = {
    Button,
    Input,
    Label,
    Popover,
    PopoverTrigger,
    PopoverContent,
    SimpleSelect,
    Badge,
};

// ── Fixture schema ──────────────────────────────────────────────────────────────
// A representative `x-filter`/`x-sort` schema exercising every control kind the bar
// renders: a leading `search` facet, a relational `select` + `multiselect` (both
// option-backed via `optionsRef`), an inline `text` facet, plus two sortable fields.
export const DEMO_SCHEMA: FilterSchema = {
    properties: {
        name: {
            title: 'Name',
            'x-filter': { operator: 'partial', name: 'name', control: 'search' },
            'x-sort': { name: 'name' },
        },
        status: {
            title: 'Status',
            'x-filter': {
                operator: 'set',
                name: 'status',
                control: 'multiselect',
                optionsRef: 'statuses',
            },
        },
        circuit: {
            title: 'Produced By Circuit',
            'x-filter': {
                operator: 'exact',
                name: 'circuit',
                control: 'select',
                optionsRef: 'circuits',
            },
        },
        reference: {
            title: 'Reference',
            'x-filter': { operator: 'partial', name: 'reference', control: 'text' },
        },
        createdAt: {
            title: 'Created',
            'x-sort': { name: 'createdAt' },
        },
    },
};

const DEMO_OPTIONS: Record<string, FilterOption[]> = {
    statuses: [
        { value: 'draft', label: 'Draft' },
        { value: 'published', label: 'Published' },
        { value: 'archived', label: 'Archived' },
    ],
    circuits: [
        { value: 'c1', label: 'Ingest Circuit' },
        { value: 'c2', label: 'Embedding Circuit' },
        { value: 'c3', label: 'Grounding Circuit' },
    ],
};

const DEMO_SAVED_FILTERS: SavedFilter[] = [
    {
        id: 'v1',
        name: 'Recent drafts',
        resource: 'fragments',
        query_parameters: { filter: { status: 'draft' }, sort: '-createdAt' },
        visibility: 'private',
        is_default: false,
    },
    {
        id: 'v2',
        name: 'My circuit output',
        resource: 'fragments',
        query_parameters: { filter: { circuit: 'c1' } },
        visibility: 'private',
        is_default: false,
    },
];

const NEVER = new Promise<never>(() => {});

// ── Transport fixtures ──────────────────────────────────────────────────────────
export interface TransportFixtures {
    schema?: FilterSchema;
    options?: Record<string, FilterOption[]>;
    savedFilters?: SavedFilter[];
    /** Never-resolving reads so the surface parks on its loading path (deterministic). */
    loading?: boolean;
    /** `saveFilter` rejects with a 422-shaped error — the SavedViews error state. */
    saveRejects422?: boolean;
}

/** An in-memory `FacetsTransport` — resolves schema/options/saved-filters from fixtures. */
export function createMockTransport(fixtures: TransportFixtures = {}): FacetsTransport {
    return {
        getFilterSchema: () => {
            if (fixtures.loading) return NEVER;
            return Promise.resolve(fixtures.schema ?? DEMO_SCHEMA);
        },
        getFilterOptions: (ref) => {
            if (fixtures.loading) return NEVER;
            return Promise.resolve((fixtures.options ?? DEMO_OPTIONS)[ref] ?? []);
        },
        getSavedFilters: () => {
            if (fixtures.loading) return NEVER;
            return Promise.resolve(fixtures.savedFilters ?? DEMO_SAVED_FILTERS);
        },
        saveFilter: (resource, payload) => {
            if (fixtures.saveRejects422) {
                return Promise.reject({
                    response: {
                        status: 422,
                        data: { errors: { name: ['A view with that name already exists.'] } },
                    },
                });
            }
            return Promise.resolve({
                id: 'saved-new',
                name: payload.name,
                resource,
                query_parameters: payload.query_parameters,
                visibility: 'private',
                is_default: false,
            });
        },
        deleteSavedFilter: () => Promise.resolve(),
    };
}

// A fresh QueryClient per story tree — no retry/refetch so fixture data is deterministic.
function makeQueryClient(): QueryClient {
    return new QueryClient({
        defaultOptions: {
            queries: { retry: false, refetchOnWindowFocus: false, gcTime: Infinity },
        },
    });
}

/** react-router-free URL-state — a functional-setter over `useState`, matching the app's shape. */
function useMemoryUrlState(initial?: URLSearchParams) {
    const [params, setParams] = useState(() => new URLSearchParams(initial));
    return [
        params,
        (updater: (prev: URLSearchParams) => URLSearchParams) =>
            setParams((prev) => updater(new URLSearchParams(prev))),
    ] as const;
}

export interface MockFacetsProviderProps {
    children: ReactNode;
    fixtures?: TransportFixtures;
}

/**
 * The FacetsInjection (transport · primitives · useUrlState) + a QueryClient, wired
 * once. Every facets story wraps in this instead of re-mocking the contract. A fresh
 * transport/client per mount keeps stories isolated (Storybook remounts on args change).
 */
export function MockFacetsProvider({ children, fixtures }: MockFacetsProviderProps) {
    const queryClient = useMemo(makeQueryClient, []);
    const injection = useMemo<FacetsInjection>(
        () => ({
            transport: createMockTransport(fixtures),
            primitives: mockPrimitives,
            useUrlState: useMemoryUrlState,
        }),
        // fixtures is a per-story literal; identity-stable across a story's life.
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [],
    );

    return (
        <QueryClientProvider client={queryClient}>
            <FacetsProvider value={injection}>{children}</FacetsProvider>
        </QueryClientProvider>
    );
}
