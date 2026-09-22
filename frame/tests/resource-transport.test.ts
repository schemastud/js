import { describe, expect, it, vi } from 'vitest';
import { createResourceTransport, type FrameCrudTransport } from '../src/resourceTransport';

function fixture() {
    const records = Array.from({ length: 31 }, (_, index) => ({
        id: String(index),
        name: `View ${index}`,
        resource: 'articles',
        query_parameters: { filter: { status: 'open' } },
        visibility: 'private',
        is_default: false,
    }));
    const crud: FrameCrudTransport = {
        list: vi.fn(async (_resource, params) => {
            const page = Number(params.page);
            return {
                data: records.slice((page - 1) * 25, page * 25),
                total: records.length,
                page,
                perPage: 25,
            };
        }),
        get: vi.fn(async () => records[0]),
        getFormSchema: vi.fn(async () => ({ type: 'object' })),
        create: vi.fn(async (_resource, data) =>
            Response.json({
                id: 'new',
                ...(data as object),
            }).json(),
        ),
        save: vi.fn(async (_resource, id) => ({ id })),
        remove: vi.fn(async () => undefined),
    };
    let reference: string | null | undefined = 'team-views';
    let permissions: { create: boolean; update: boolean; delete: boolean } | null | undefined = {
        create: false,
        update: false,
        delete: false,
    };
    const read = vi.fn(async (url: string, _params?: Record<string, string>): Promise<unknown> =>
        url.includes('/options/')
            ? { data: [{ value: 'open', label: 'Open' }] }
            : {
                  data: {
                      properties: {},
                      savedViewsResource: 'untrusted-schema-value',
                      savedViewsCan: { create: true, update: true, delete: true },
                  },
                  savedViewsResource: reference,
                  savedViewsCan: permissions,
              },
    );
    const transport = createResourceTransport(crud, {
        resourceUrl: (resource) => `/realm/resources/${resource}`,
        read: async <T>(url: string, params?: Record<string, string>) =>
            (await read(url, params)) as T,
    });
    return {
        transport,
        crud,
        read,
        records,
        support: (value: typeof reference) => {
            reference = value;
        },
        permissions: (value: typeof permissions) => {
            permissions = value;
        },
    };
}

describe('resource behavior composition', () => {
    it('discovers declared variants and requests the selected resource schema', async () => {
        const { transport, read } = fixture();
        const variants = {
            resource: 'papers',
            variants: [
                {
                    key: 'papers',
                    resource: 'papers',
                    canonical: true,
                    sameAsCanonical: true,
                },
                {
                    key: 'recent/papers',
                    resource: 'papers',
                    canonical: false,
                    sameAsCanonical: false,
                },
            ],
        };
        read.mockResolvedValueOnce({ data: variants });
        expect(await transport.getFilterVariants('papers')).toEqual(variants);
        expect(read).toHaveBeenLastCalledWith(
            '/realm/resources/papers/filters/variants',
            undefined,
        );
        await transport.getFilterSchema('papers', 'recent/papers');
        expect(read).toHaveBeenLastCalledWith(
            '/realm/resources/papers/filters/recent%2Fpapers/schema',
            undefined,
        );
    });
    it('preserves resource, option reference and search, and normalizes envelope metadata', async () => {
        const { transport, read } = fixture();
        expect(await transport.getFilterSchema('articles')).toEqual({
            properties: {},
            savedViewsResource: 'team-views',
            savedViewsCan: { create: false, update: false, delete: false },
        });
        expect(await transport.getFilterOptions('articles', 'owner/name', 'Ada & Lin')).toEqual([
            { value: 'open', label: 'Open' },
        ]);
        expect(read).toHaveBeenLastCalledWith(
            '/realm/resources/articles/filters/options/owner%2Fname',
            { search: 'Ada & Lin' },
        );
        await transport.getFilterOptions('people', 'statuses', '');
        expect(read).toHaveBeenLastCalledWith('/realm/resources/people/filters/options/statuses', {
            search: '',
        });
    });

    it('reads all saved-view pages through the advertised resource and preserves target scope', async () => {
        const { transport, crud, records } = fixture();
        expect(await transport.getSavedFilters('articles')).toEqual(records);
        expect(crud.list).toHaveBeenNthCalledWith(1, 'team-views', {
            'filter[resource]': 'articles',
            page: '1',
            per_page: '25',
        });
        expect(crud.list).toHaveBeenNthCalledWith(2, 'team-views', {
            'filter[resource]': 'articles',
            page: '2',
            per_page: '25',
        });
    });

    it('discovers variant-only saved views and forwards the selected variant to ordinary CRUD listing', async () => {
        const { transport, read, crud, records } = fixture();
        read.mockImplementation(async (url) => ({
            data: { properties: {} },
            savedViewsResource: url.endsWith('/recent/schema') ? 'recent-views' : null,
        }));
        expect(await transport.getSavedFilters('articles')).toEqual([]);
        expect(crud.list).not.toHaveBeenCalled();
        expect(await transport.getSavedFilters('articles', 'recent')).toEqual(records);
        expect(crud.list).toHaveBeenCalledWith('recent-views', {
            'filter[resource]': 'articles',
            filterVariant: 'recent',
            page: '1',
            per_page: '25',
        });
    });

    it('uses ordinary CRUD and re-resolves support after principal/context changes', async () => {
        const { transport, crud, support } = fixture();
        const payload = {
            name: 'Open',
            query_parameters: { filter: { status: 'open' } },
        };
        expect(await transport.saveFilter('articles', payload)).toEqual({
            id: 'new',
            resource: 'articles',
            ...payload,
        });
        expect(crud.create).toHaveBeenCalledWith('team-views', {
            resource: 'articles',
            ...payload,
        });
        support('other-views');
        await transport.deleteSavedFilter('articles', 'new');
        expect(crud.remove).toHaveBeenCalledWith('other-views', 'new');
        support(null);
        await expect(transport.saveFilter('articles', payload)).rejects.toThrow('unavailable');
        await expect(transport.deleteSavedFilter('articles', 'new')).rejects.toThrow('unavailable');
        expect(crud.create).toHaveBeenCalledTimes(1);
        expect(crud.remove).toHaveBeenCalledTimes(1);
    });

    it.each([null, undefined])(
        'does not invent support when envelope metadata is %s',
        async (value) => {
            const { transport, crud, support } = fixture();
            support(value);
            expect(
                (await transport.getFilterSchema('articles')).savedViewsResource,
            ).toBeUndefined();
            expect(await transport.getSavedFilters('articles')).toEqual([]);
            expect(crud.list).not.toHaveBeenCalled();
        },
    );

    it.each([null, undefined])(
        'does not promote schema properties into mutation permission when envelope metadata is %s',
        async (value) => {
            const { transport, permissions } = fixture();
            permissions(value);
            expect((await transport.getFilterSchema('articles')).savedViewsCan).toBeUndefined();
        },
    );

    it('does not silently accept a server returning the same page repeatedly', async () => {
        const { transport, crud, records } = fixture();
        vi.mocked(crud.list).mockResolvedValue({
            data: records.slice(0, 25),
            total: 31,
            page: 1,
            perPage: 25,
        });
        await expect(transport.getSavedFilters('articles')).rejects.toThrow('pagination');
    });
});

it('collects honest cursor pages and preserves target/variant on every request', async () => {
    const { transport, crud, records } = fixture();
    vi.mocked(crud.list)
        .mockResolvedValueOnce({
            data: records.slice(0, 25),
            perPage: 25,
            nextCursor: 'next+/=',
        })
        .mockResolvedValueOnce({
            data: records.slice(25),
            perPage: 25,
            nextCursor: null,
        });
    expect(await transport.getSavedFilters('articles', 'recent')).toEqual(records);
    expect(crud.list).toHaveBeenLastCalledWith('team-views', {
        'filter[resource]': 'articles',
        filterVariant: 'recent',
        cursor: 'next+/=',
        per_page: '25',
    });
});

it.each(['cycle', 'empty', 'mode', 'offset-empty'] as const)(
    'rejects %s pagination instead of silently losing saved views',
    async (failure) => {
        const { transport, crud, records } = fixture();
        if (failure === 'offset-empty') {
            vi.mocked(crud.list).mockResolvedValueOnce({
                data: [],
                total: 40,
                page: 1,
                perPage: 25,
            });
        } else {
            vi.mocked(crud.list)
                .mockResolvedValueOnce({
                    data: records.slice(0, 25),
                    perPage: 25,
                    nextCursor: 'next',
                })
                .mockResolvedValueOnce(
                    failure === 'mode'
                        ? { data: records.slice(25), total: 31, page: 2, perPage: 25 }
                        : {
                              data: failure === 'empty' ? [] : records.slice(25),
                              perPage: 25,
                              nextCursor: failure === 'cycle' ? 'next' : 'another',
                          },
                );
        }
        await expect(transport.getSavedFilters('articles')).rejects.toThrow(
            /pagination|incomplete/,
        );
        expect(vi.mocked(crud.list).mock.calls.length).toBeLessThanOrEqual(2);
    },
);

it.each([5, 7])(
    'rejects a terminal offset page whose rows disagree with the declared total (%s rows)',
    async (count) => {
        const { transport, crud, records } = fixture();
        vi.mocked(crud.list)
            .mockResolvedValueOnce({
                data: records.slice(0, 25),
                perPage: 25,
                page: 1,
                total: 31,
            })
            .mockResolvedValueOnce({
                data: Array.from({ length: count }, () => records[0]),
                perPage: 25,
                page: 2,
                total: 31,
            });
        await expect(transport.getSavedFilters('articles')).rejects.toThrow('incomplete');
    },
);
