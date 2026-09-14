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
        save: vi.fn(async (_resource, _id, data) => ({
            id: 'new',
            ...(data as object),
        })),
        remove: vi.fn(async () => undefined),
    };
    let reference: string | null | undefined = 'team-views';
    const read = vi.fn(async (url: string, _params?: Record<string, string>) =>
        url.includes('/options/')
            ? { data: [{ value: 'open', label: 'Open' }] }
            : {
                  data: {
                      properties: {},
                      savedViewsResource: 'untrusted-schema-value',
                  },
                  savedViewsResource: reference,
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
    };
}

describe('resource behavior composition', () => {
    it('preserves resource, option reference and search, and normalizes envelope metadata', async () => {
        const { transport, read } = fixture();
        expect(await transport.getFilterSchema('articles')).toEqual({
            properties: {},
            savedViewsResource: 'team-views',
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
            perPage: '25',
        });
        expect(crud.list).toHaveBeenNthCalledWith(2, 'team-views', {
            'filter[resource]': 'articles',
            page: '2',
            perPage: '25',
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
        expect(crud.save).toHaveBeenCalledWith('team-views', null, {
            resource: 'articles',
            ...payload,
        });
        support('other-views');
        await transport.deleteSavedFilter('articles', 'new');
        expect(crud.remove).toHaveBeenCalledWith('other-views', 'new');
        support(null);
        await expect(transport.saveFilter('articles', payload)).rejects.toThrow('unavailable');
        await expect(transport.deleteSavedFilter('articles', 'new')).rejects.toThrow('unavailable');
        expect(crud.save).toHaveBeenCalledTimes(1);
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
