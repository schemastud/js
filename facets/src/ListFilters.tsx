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
 *
 * ⚠️ And nothing when the resolved vocabulary is EMPTY, which is a different case that used
 * to be indistinguishable from "unresolved". A resource declaring no filter surface answered
 * 404 on `filters/schema`, so `schema` stayed `undefined` and this returned null by accident.
 * That endpoint now answers `{properties: {}}` (api-surface-coherence 125) — truthy — and
 * without this second guard the change would have grown a facets bar with no facets, plus a
 * SavedViews control whose own `filters` read 404s for exactly the same resources. The empty
 * vocabulary is the declaration saying "there is nothing to filter here", and rendering
 * nothing is what that sentence looks like.
 */
export function ListFilters(state: ListFiltersState) {
    const { resource, schema, filterValues, sort, onFilterChange, onSortChange, applyView } = state;

    if (!schema) return null;
    if (Object.keys(schema.properties ?? {}).length === 0) return null;

    return (
        <div className="space-y-3">
            <FacetsBar
                resource={resource}
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
