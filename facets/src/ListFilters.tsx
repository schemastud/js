import { FacetsBar } from './FacetsBar';
import { SavedViews } from './SavedViews';
import { useFacetsInjection } from './context';
import type { ListFilters as ListFiltersState } from './useListFilters';

/** Render the declared filter vocabulary, with saved views only when advertised. */
export function ListFilters(state: ListFiltersState) {
    const {
        resource,
        schema,
        variants,
        filterVariant,
        onVariantChange,
        filterValues,
        sort,
        onFilterChange,
        onSortChange,
        applyView,
    } = state;
    const { SimpleSelect } = useFacetsInjection().primitives;
    const hasVariants = variants.some((variant) => !variant.canonical);
    const choices = variants.some((variant) => variant.canonical)
        ? variants
        : [{ key: resource, resource, canonical: true, sameAsCanonical: true }, ...variants];
    const canonical = choices.find((variant) => variant.canonical)?.key ?? resource;
    const hasVocabulary = Object.values(schema?.properties ?? {}).some(
        (property) => property['x-filter'] || property['x-sort']
    );

    if (!hasVariants && !hasVocabulary && !schema?.savedViewsResource) return null;

    return (
        <div className="space-y-3">
            {hasVariants && (
                <SimpleSelect
                    aria-label="Filter variant"
                    value={filterVariant ?? canonical}
                    onValueChange={(key: string) => onVariantChange(key === canonical ? null : key)}
                    options={choices.map((variant) => ({
                        value: variant.key,
                        label: variant.canonical ? 'Default' : variant.key,
                    }))}
                />
            )}
            {schema && hasVocabulary && (
                <FacetsBar
                    key={`${resource}:${filterVariant ?? ''}`}
                    resource={resource}
                    schema={schema}
                    values={filterValues}
                    sort={sort}
                    onFilterChange={onFilterChange}
                    onSortChange={onSortChange}
                />
            )}
            {schema?.savedViewsResource && (
                <SavedViews
                    resource={resource}
                    current={{
                        filter: filterValues,
                        sort: sort ?? undefined,
                        filterVariant: filterVariant ?? undefined,
                    }}
                    onApply={applyView}
                />
            )}
        </div>
    );
}
