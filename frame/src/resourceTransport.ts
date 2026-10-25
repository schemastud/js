import type {
    FilterOption,
    FilterSchema,
    FilterVariants,
    ResourceMutationPermissions,
    SavedFilter,
} from '@schemastud/facets';
import type { ActionResult, FrameTransport } from './types';
import { actionUrl } from './actions';
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
    /**
     * Send a JSON request and resolve its parsed body — what a declared ACTION needs (ADR-0005), since
     * an action's URL is the producer's own mount, outside the frame socket. Reject with a
     * {@link FrameActionError} on a non-2xx answer. Optional: without it the composed transport has no
     * `invoke`, and frame draws no action buttons.
     */
    write?<T>(method: string, url: string, body?: unknown): Promise<T>;
}

/** Stable address context for the lifetime of a resource transport. Recreate the transport when it changes. */
export interface ResourceTransportOptions {
    collectionByResource?: Readonly<Record<string, string>>;
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
    options: ResourceTransportOptions = {},
): FrameTransport {
    // Snapshot explicit host overrides: transport identity is a cache scope, while manifest-selected
    // addresses are carried in each query key and request. Recreate the transport if an override changes.
    const collectionByResource = Object.freeze({ ...options.collectionByResource });
    const collectionParams = (resource: string, selected?: string): Record<string, string> | undefined => {
        const address = collectionByResource[resource] ?? selected;
        return address === undefined ? undefined : { collection: address };
    };
    const addressed = (
        resource: string,
        params?: Record<string, string>,
        selected?: string,
    ): Record<string, string> | undefined => {
        const collection = collectionParams(resource, selected);
        return collection ? { ...params, ...collection } : params;
    };

    async function getFilterSchema(resource: string, variant?: string, selected?: string): Promise<FilterSchema> {
        const response = await http.read<FilterSchemaResponse>(
            `${http.resourceUrl(resource)}/filters/${
                variant ? `${encodeURIComponent(variant)}/` : ''
            }schema`,
            collectionParams(resource, selected),
        );
        return {
            ...response.data,
            savedViewsResource: response.savedViewsResource ?? undefined,
            savedViewsCan: response.savedViewsCan ?? undefined,
        };
    }

    async function savedResource(resource: string, variant?: string, selected?: string): Promise<string> {
        // Resolve per operation: a long-lived transport can outlive a principal/tenant change.
        const schema = await getFilterSchema(resource, variant, selected);
        if (!schema.savedViewsResource) {
            throw new Error(`Saved views are unavailable for resource "${resource}".`);
        }
        return schema.savedViewsResource;
    }

    const write = http.write;

    return {
        list: (resource, params) => crud.list(resource, addressed(resource, params) ?? params),
        get: (resource, id, params) => crud.get(resource, id, addressed(resource, params)),
        getFormSchema: (resource, form, params) =>
            crud.getFormSchema(resource, form, addressed(resource, params)),
        create: (resource, data, params) => crud.create(resource, data, addressed(resource, params)),
        save: (resource, id, data, params) => crud.save(resource, id, data, addressed(resource, params)),
        remove: (resource, id, params) => crud.remove(resource, id, addressed(resource, params)),
        // An action's form schema rides the resource root like every other frame read.
        getActionSchema: (resource, action) => {
            const params = collectionParams(resource);
            return params
                ? http.read(`${http.resourceUrl(resource)}/actions/${encodeURIComponent(action)}/schema`, params)
                : http.read(`${http.resourceUrl(resource)}/actions/${encodeURIComponent(action)}/schema`);
        },
        ...(write
            ? {
                  async invoke(action, target): Promise<ActionResult> {
                      const body = await write<{ message?: string | null; data?: unknown } | null>(
                          action.method,
                          actionUrl(action, target.id),
                          action.input === null ? undefined : (target.data ?? {}),
                      );
                      return { message: body?.message ?? null, data: body?.data };
                  },
              }
            : {}),
        summary: (resource, params): Promise<SummaryPayload> =>
            http.read<SummaryPayload>(`${http.resourceUrl(resource)}/summary`, addressed(resource, params)),
        getFilterSchema,
        async getFilterVariants(resource, selected): Promise<FilterVariants> {
            const response = await http.read<{ data: FilterVariants }>(
                `${http.resourceUrl(resource)}/filters/variants`,
                collectionParams(resource, selected),
            );
            return response.data;
        },
        async getFilterOptions(resource, ref, search, selected): Promise<FilterOption[]> {
            const response = await http.read<{ data: FilterOption[] }>(
                `${http.resourceUrl(resource)}/filters/options/${encodeURIComponent(ref)}`,
                addressed(resource, { search }, selected),
            );
            return response.data;
        },
        async getSavedFilters(resource, variant, selected): Promise<SavedFilter[]> {
            const schema = await getFilterSchema(resource, variant, selected);
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
        async saveFilter(resource, payload, selected): Promise<SavedFilter> {
            return crud.create<SavedFilter>(
                await savedResource(resource, payload.queryParameters.filterVariant, selected),
                {
                    ...payload,
                    resource,
                },
            );
        },
        async deleteSavedFilter(resource, id, variant, selected): Promise<void> {
            await crud.remove(await savedResource(resource, variant, selected), id);
        },
    };
}
