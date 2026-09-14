import type { FilterOption, FilterSchema, SavedFilter } from '@schemastud/facets';
import type { FrameTransport } from './types';

export type FrameCrudTransport = Pick<
    FrameTransport,
    'list' | 'get' | 'getFormSchema' | 'save' | 'remove'
>;

export interface ResourceFilterHttp {
    /** The same resource root used by CRUD, including the host's realm/prefix. */
    resourceUrl(resource: string): string;
    read<T>(url: string, params?: Record<string, string>): Promise<T>;
}

export interface FilterSchemaResponse {
    data: FilterSchema;
    savedViewsResource?: string | null;
}

/** Compose resource filter reads and declared saved-view CRUD over the host's client. */
export function createResourceTransport(
    crud: FrameCrudTransport,
    http: ResourceFilterHttp,
): FrameTransport {
    async function getFilterSchema(resource: string): Promise<FilterSchema> {
        const response = await http.read<FilterSchemaResponse>(
            `${http.resourceUrl(resource)}/filters/schema`,
        );
        return {
            ...response.data,
            savedViewsResource: response.savedViewsResource ?? undefined,
        };
    }

    async function savedResource(resource: string): Promise<string> {
        // Resolve per operation: a long-lived transport can outlive a principal/tenant change.
        const schema = await getFilterSchema(resource);
        if (!schema.savedViewsResource) {
            throw new Error(`Saved views are unavailable for resource "${resource}".`);
        }
        return schema.savedViewsResource;
    }

    return {
        ...crud,
        getFilterSchema,
        async getFilterOptions(resource, ref, search): Promise<FilterOption[]> {
            const response = await http.read<{ data: FilterOption[] }>(
                `${http.resourceUrl(resource)}/filters/options/${encodeURIComponent(ref)}`,
                { search },
            );
            return response.data;
        },
        async getSavedFilters(resource): Promise<SavedFilter[]> {
            const schema = await getFilterSchema(resource);
            if (!schema.savedViewsResource) return [];
            const rows: SavedFilter[] = [];
            for (let page = 1; ; page++) {
                const result = await crud.list(schema.savedViewsResource, {
                    'filter[resource]': resource,
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
            return (await crud.save(await savedResource(resource), null, {
                ...payload,
                resource,
            })) as unknown as SavedFilter;
        },
        async deleteSavedFilter(resource, id): Promise<void> {
            await crud.remove(await savedResource(resource), id);
        },
    };
}
