import { FacetsBar } from './FacetsBar';
import { SavedViews } from './SavedViews';
import type { ListFilters as ListFiltersState } from './useListFilters';

/** Render the declared filter vocabulary, with saved views only when advertised. */
export function ListFilters(state: ListFiltersState) {
    const { resource, schema, filterValues, sort, onFilterChange, onSortChange, applyView } = state;

    if (!schema) return null;
    // A served resource schema may include ordinary fields without any filter or sort
    // descriptors. Those fields offer no query vocabulary (including saved views).
    if (
        !Object.values(schema.properties ?? {}).some(
            (property) => property['x-filter'] || property['x-sort'],
        )
    )
        return null;

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
            {schema.savedViewsResource && (
                <SavedViews
                    resource={resource}
                    current={{ filter: filterValues, sort: sort ?? undefined }}
                    onApply={applyView}
                />
            )}
        </div>
    );
}
