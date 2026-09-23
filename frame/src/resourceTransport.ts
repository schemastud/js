import type {
    FilterOption,
    FilterSchema,
    FilterVariants,
    ResourceMutationPermissions,
    SavedFilter,
} from '@schemastud/facets';
import type { FrameTransport } from './types';
import { parseResourcePage } from './resourcePage';
import type { SummaryPayload } from './cards/types';

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
        summary: (resource, params): Promise<SummaryPayload> =>
            http.read<SummaryPayload>(`${http.resourceUrl(resource)}/summary`, params),
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
            let mode: 'offset' | 'cursor' | undefined;
            let page = 1;
            let cursor: string | undefined;
            const seen = new Set<string>();
            for (;;) {
                const result = parseResourcePage(
                    await crud.list<SavedFilter>(schema.savedViewsResource, {
                        'filter[resource]': resource,
                        ...(variant ? { filterVariant: variant } : {}),
                        ...(cursor ? { cursor } : { page: String(page) }),
                        per_page: '25',
                    }),
                );
                const currentMode = 'nextCursor' in result ? 'cursor' : 'offset';
                if (mode && mode !== currentMode)
                    throw new Error('Saved views changed pagination mode.');
                mode = currentMode;
                rows.push(...result.data);
                if ('nextCursor' in result) {
                    if (result.nextCursor === null) return rows;
                    if (seen.has(result.nextCursor))
                        throw new Error('Saved views returned cyclic pagination.');
                    if (result.data.length === 0)
                        throw new Error('Saved views returned an incomplete page.');
                    seen.add(result.nextCursor);
                    cursor = result.nextCursor;
                } else {
                    if (result.page !== page)
                        throw new Error('Saved views returned invalid pagination.');
                    if (result.page * result.perPage >= result.total) {
                        if (rows.length !== result.total)
                            throw new Error('Saved views returned an incomplete page.');
                        return rows;
                    }
                    if (result.data.length !== result.perPage)
                        throw new Error('Saved views returned an incomplete page.');
                    page++;
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
