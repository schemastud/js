import type {
    FilterOption,
    FilterSchema,
    FilterVariants,
    ResourceMutationPermissions,
    SavedFilter,
} from '@schemastud/facets';
import type { FrameTransport } from './types';

export type FrameCrudTransport = Pick<
    FrameTransport,
    'list' | 'get' | 'getFormSchema' | 'create' | 'save' | 'remove'
>;

export interface ResourceFilterHttp {
    /** The same resource root used by CRUD, including the host's realm/prefix. */
    resourceUrl(resource: string): string;
    read<T>(url: string, params?: Record<string, string>): Promise<T>;
}

export interface FilterSchemaResponse {
    data: FilterSchema;
    savedViewsResource?: string | null;
    savedViewsCan?: ResourceMutationPermissions | null;
}

/** Compose resource filter reads and declared saved-view CRUD over the host's client. */
export function createResourceTransport(
    crud: FrameCrudTransport,
    http: ResourceFilterHttp,
): FrameTransport {
    async function getFilterSchema(resource: string, variant?: string): Promise<FilterSchema> {
        const response = await http.read<FilterSchemaResponse>(
            `${http.resourceUrl(resource)}/filters/${
                variant ? `${encodeURIComponent(variant)}/` : ''
            }schema`,
        );
        return {
            ...response.data,
            savedViewsResource: response.savedViewsResource ?? undefined,
            savedViewsCan: response.savedViewsCan ?? undefined,
        };
    }

    async function savedResource(resource: string, variant?: string): Promise<string> {
        // Resolve per operation: a long-lived transport can outlive a principal/tenant change.
        const schema = await getFilterSchema(resource, variant);
        if (!schema.savedViewsResource) {
            throw new Error(`Saved views are unavailable for resource "${resource}".`);
        }
        return schema.savedViewsResource;
    }

    return {
        ...crud,
        getFilterSchema,
        async getFilterVariants(resource): Promise<FilterVariants> {
            const response = await http.read<{ data: FilterVariants }>(
                `${http.resourceUrl(resource)}/filters/variants`,
            );
            return response.data;
        },
        async getFilterOptions(resource, ref, search): Promise<FilterOption[]> {
            const response = await http.read<{ data: FilterOption[] }>(
                `${http.resourceUrl(resource)}/filters/options/${encodeURIComponent(ref)}`,
                { search },
            );
            return response.data;
        },
        async getSavedFilters(resource, variant): Promise<SavedFilter[]> {
            const schema = await getFilterSchema(resource, variant);
            if (!schema.savedViewsResource) return [];
            const rows: SavedFilter[] = [];
            for (let page = 1; ; page++) {
                const result = await crud.list(schema.savedViewsResource, {
                    'filter[resource]': resource,
                    ...(variant ? { filterVariant: variant } : {}),
                    page: String(page),
                    perPage: '25',
                });
                if (result.page !== page || result.perPage <= 0) {
                    throw new Error('Saved views returned invalid pagination.');
                }
                rows.push(...(result.data as unknown as SavedFilter[]));
                if (result.page * result.perPage >= result.total) return rows;
                if (result.data.length === 0) {
                    throw new Error('Saved views returned an incomplete page.');
                }
            }
        },
        async saveFilter(resource, payload): Promise<SavedFilter> {
            return crud.create<SavedFilter>(
                await savedResource(resource, payload.query_parameters.filterVariant),
                {
                    ...payload,
                    resource,
                },
            );
        },
        async deleteSavedFilter(resource, id, variant): Promise<void> {
            await crud.remove(await savedResource(resource, variant), id);
        },
    };
}
