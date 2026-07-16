import { FacetsBar } from './FacetsBar';
import { SavedViews } from './SavedViews';
import type { ListFilters as ListFiltersState } from './useListFilters';

/**
 * The generalized facets surface every list mounts: the resource-agnostic
 * `FacetsBar` over the resource's `x-filter`/`x-sort` schema, plus `SavedViews` for
 * that same resource key — save / list / apply / delete come along for free. It is
 * pure wiring over `useListFilters(resource)`: the bar's internals never change per
 * resource, so a new list mounts by spreading the hook result. Renders nothing until
 * the schema resolves.
 */
export function ListFilters(state: ListFiltersState) {
    const { resource, schema, filterValues, sort, onFilterChange, onSortChange, applyView } = state;

    if (!schema) return null;

    return (
        <div className="space-y-3">
            <FacetsBar
                schema={schema}
                values={filterValues}
                sort={sort}
                onFilterChange={onFilterChange}
                onSortChange={onSortChange}
            />
            <SavedViews
                resource={resource}
                current={{ filter: filterValues, sort: sort ?? undefined }}
                onApply={applyView}
            />
        </div>
    );
}
