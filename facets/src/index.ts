// Injection seam
export { FacetsProvider, useFacetsInjection } from './context';

// Surface components
export { FacetsBar } from './FacetsBar';
export { MultiSelectFilter } from './MultiSelectFilter';
export { SavedViews } from './SavedViews';
export { ListFilters } from './ListFilters';

// Keystone hook + dim helper. The hook's return-type interface is exported as
// `ListFiltersState` to avoid colliding with the `ListFilters` component.
export { useListFilters, useFilterChangeDim } from './useListFilters';
export type { ListFilters as ListFiltersState } from './useListFilters';

// Data hooks (over injected transport)
export {
    useFilterSchema,
    useFilterOptions,
    useSavedFilters,
    useSaveFilter,
    useDeleteSavedFilter,
} from './data';

// Sort vocabulary (shared with the host DataTable)
export {
    parseSort,
    serializeSort,
    toggleSortKey,
    sortStateFor,
    type SortKey,
} from './sort';

// Canonical x-filter / x-sort types + injection contracts
export type {
    FilterControl,
    FilterInlineOption,
    FilterDescriptor,
    SortDescriptor,
    FilterSchemaProperty,
    FilterSchema,
    FilterOption,
    SavedFilterQueryParameters,
    SavedFilter,
    FacetsTransport,
    FacetsPrimitives,
    UrlStateSetter,
    UseUrlState,
    FacetsInjection,
} from './types';
