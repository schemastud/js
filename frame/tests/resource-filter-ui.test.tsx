import { keepPreviousData, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { useSyncExternalStore } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createWidgetRegistry } from '@schemastud/seam';
import { FrameProvider } from '../src/context';
import { ListShell } from '../src/ListShell';
import { createResourceTransport, type FrameCrudTransport } from '../src/resourceTransport';
import type { FrameCan, FramePrimitives, Row } from '../src/types';

afterEach(cleanup);

const allowed = { create: true, update: true, delete: true };
const primitives: FramePrimitives = {
    Button: ({ children, size: _size, variant: _variant, ...props }) => (
        <button {...props}>{children}</button>
    ),
    Input: (props) => <input {...props} />,
    Label: (props) => <label {...props} />,
    Popover: ({ children }) => <div>{children}</div>,
    PopoverTrigger: ({ children }) => <>{children}</>,
    PopoverContent: ({ children }) => <div>{children}</div>,
    SimpleSelect: ({ options, value, onValueChange, placeholder, ...props }) => (
        <select {...props} value={value} onChange={(event) => onValueChange(event.target.value)}>
            <option value="">{placeholder}</option>
            {options.map((option: { value: string; label: string }) => (
                <option key={option.value} value={option.value}>
                    {option.label}
                </option>
            ))}
        </select>
    ),
    Badge: ({ children }) => <span>{children}</span>,
    Table: ({ children }) => <div>{children}</div>,
    Skeleton: () => <div />,
    SidePanel: ({ children }) => <aside>{children}</aside>,
};

function fixture(initial = '', can: FrameCan = () => true) {
    let current = new URLSearchParams(initial);
    const listeners = new Set<() => void>();
    const subscribe = (listener: () => void) => {
        listeners.add(listener);
        return () => {
            listeners.delete(listener);
        };
    };
    const snapshot = () => current;
    const saved: Row[] = [];
    const crud: FrameCrudTransport = {
        list: vi.fn(async (resource, params) => ({
            data:
                resource === 'team-views'
                    ? [...saved]
                    : [{ id: 'paper', title: params.filterVariant ?? 'Canonical rows' }],
            total: resource === 'team-views' ? saved.length : 1,
            page: 1,
            perPage: 25,
        })),
        get: vi.fn(async () => ({ id: 'paper' })),
        getFormSchema: vi.fn(async () => ({ type: 'object' })),
        save: vi.fn(async (_resource, _id, data) => {
            const row = {
                ...(data as Row),
                id: 'view-1',
                can: allowed,
                visibility: 'private',
                is_default: false,
            };
            saved.push(row);
            return row;
        }),
        remove: vi.fn(async () => undefined),
    };
    const read = vi.fn(async (url: string) => {
        const resource = url.split('/')[2];
        if (url.endsWith('/variants'))
            return {
                data: {
                    resource,
                    variants: [
                        { key: resource, resource, canonical: true, sameAsCanonical: true },
                        { key: 'recent', resource, canonical: false, sameAsCanonical: false },
                        { key: 'archived', resource, canonical: false, sameAsCanonical: false },
                    ],
                },
            };
        const selected = url.endsWith('/recent/schema') || url.endsWith('/archived/schema');
        return {
            data: {
                properties: selected
                    ? {
                          query: {
                              'x-filter': { name: 'query', operator: 'partial', control: 'search' },
                          },
                          score: { 'x-sort': { name: resource === 'papers' ? 'score' : 'rating' } },
                      }
                    : {},
            },
            savedViewsResource: 'team-views',
            savedViewsCan: allowed,
        };
    });
    const transport = createResourceTransport(crud, {
        resourceUrl: (resource) => `/resources/${resource}`,
        read: async <T,>(url: string) => (await read(url)) as T,
    });
    const value = {
        transport,
        primitives,
        can,
        registry: createWidgetRegistry(),
        schemaFetcher: async (ref: string) => ({ $id: ref }),
        useUrlState() {
            const params = useSyncExternalStore(subscribe, snapshot);
            return [
                params,
                (updater: (previous: URLSearchParams) => URLSearchParams) => {
                    current = updater(new URLSearchParams(current));
                    listeners.forEach((listener) => listener());
                },
            ] as const;
        },
    };
    const client = new QueryClient({
        defaultOptions: { queries: { retry: false, placeholderData: keepPreviousData } },
    });
    function App({ resource = 'papers' }: { resource?: string }) {
        return (
            <QueryClientProvider client={client}>
                <FrameProvider value={value}>
                    <ListShell
                        resource={resource}
                        columns={[{ field: 'title', header: 'Title' }]}
                    />
                </FrameProvider>
            </QueryClientProvider>
        );
    }
    return { App, crud, read, snapshot, saved };
}

describe('declared filter variants in the generic Frame list', () => {
    it('discovers variants from an empty canonical vocabulary and executes selected filters through ordinary list requests', async () => {
        const { App, crud, read, snapshot } = fixture(
            'filter[old]=stale&sort=old&page=4&perPage=25'
        );
        render(<App />);
        const variants = await screen.findByLabelText('Filter variant');
        expect(screen.queryByLabelText('Search')).toBeNull();
        fireEvent.change(variants, { target: { value: 'recent' } });
        const search = await screen.findByLabelText('Search');
        expect(read).toHaveBeenCalledWith('/resources/papers/filters/recent/schema');
        expect(snapshot().toString()).toBe('perPage=25&filterVariant=recent');
        fireEvent.change(search, { target: { value: 'biology' } });
        await waitFor(() =>
            expect(crud.list).toHaveBeenCalledWith('papers', {
                perPage: '25',
                filterVariant: 'recent',
                'filter[query]': 'biology',
            })
        );
    });

    it('saves, reloads and applies the variant with its filters and sort while keeping canonical and resource caches separate', async () => {
        const { App, crud, read, snapshot } = fixture();
        const screenTree = render(<App />);
        fireEvent.change(await screen.findByLabelText('Filter variant'), {
            target: { value: 'recent' },
        });
        fireEvent.change(await screen.findByLabelText('Search'), { target: { value: 'ecology' } });
        fireEvent.change(screen.getByLabelText('Sort by'), { target: { value: 'score' } });
        fireEvent.click(screen.getByRole('button', { name: 'Ascending' }));
        fireEvent.click(screen.getByRole('button', { name: 'Save current view' }));
        fireEvent.change(screen.getByPlaceholderText('View name'), {
            target: { value: 'Recent ecology' },
        });
        fireEvent.click(screen.getByRole('button', { name: 'Confirm save' }));
        await screen.findByRole('button', { name: 'Recent ecology' });
        expect(crud.save).toHaveBeenCalledWith('team-views', null, {
            resource: 'papers',
            name: 'Recent ecology',
            query_parameters: {
                filterVariant: 'recent',
                filter: { query: 'ecology' },
                sort: '-score',
            },
        });

        fireEvent.change(screen.getByLabelText('Filter variant'), { target: { value: 'papers' } });
        await waitFor(() => expect(screen.queryByLabelText('Search')).toBeNull());
        fireEvent.click(await screen.findByRole('button', { name: 'Recent ecology' }));
        await waitFor(() => expect(snapshot().get('filterVariant')).toBe('recent'));
        expect(snapshot().get('filter[query]')).toBe('ecology');
        expect(snapshot().get('sort')).toBe('-score');
        expect(((await screen.findByLabelText('Search')) as HTMLInputElement).value).toBe(
            'ecology'
        );
        await waitFor(() =>
            expect(crud.list).toHaveBeenCalledWith('papers', {
                filterVariant: 'recent',
                'filter[query]': 'ecology',
                sort: '-score',
            })
        );

        screenTree.rerender(<App resource="books" />);
        await waitFor(() =>
            expect(read).toHaveBeenCalledWith('/resources/books/filters/recent/schema')
        );
        await waitFor(() =>
            expect(screen.getByRole('option', { name: 'Score' }).getAttribute('value')).toBe(
                'rating'
            )
        );
    });

    it('restores a URL-selected variant on a fresh list mount', async () => {
        const { App, crud } = fixture('filterVariant=recent&filter[query]=deep-link&sort=score');
        render(<App />);
        expect(((await screen.findByLabelText('Search')) as HTMLInputElement).value).toBe(
            'deep-link'
        );
        expect((screen.getByLabelText('Filter variant') as HTMLSelectElement).value).toBe('recent');
        await waitFor(() =>
            expect(crud.list).toHaveBeenCalledWith('papers', {
                filterVariant: 'recent',
                'filter[query]': 'deep-link',
                sort: 'score',
            })
        );
    });

    it('does not reuse the previous variant vocabulary while a different variant is loading', async () => {
        const { App, read } = fixture('filterVariant=recent');
        const originalRead = read.getMockImplementation()!;
        let release!: () => void;
        const pending = new Promise<void>((resolve) => {
            release = resolve;
        });
        read.mockImplementation(async (url) => {
            if (url.endsWith('/archived/schema')) await pending;
            return originalRead(url);
        });
        render(<App />);
        await screen.findByLabelText('Search');
        fireEvent.change(screen.getByLabelText('Filter variant'), {
            target: { value: 'archived' },
        });
        await waitFor(() =>
            expect(read).toHaveBeenCalledWith('/resources/papers/filters/archived/schema')
        );
        expect(screen.queryByLabelText('Search')).toBeNull();
        expect(screen.queryByRole('button', { name: 'Save current view' })).toBeNull();
        release();
        expect(await screen.findByLabelText('Search')).toBeDefined();
    });

    it('prunes retired filters and sorts using the saved variant declaration before applying it', async () => {
        const { App, saved, snapshot } = fixture('page=4');
        saved.push({
            id: 'old',
            name: 'Older saved view',
            resource: 'papers',
            query_parameters: {
                filterVariant: 'recent',
                filter: { query: 'biology', retired: 'stale' },
                sort: 'score,-retired',
            },
        });
        render(<App />);
        fireEvent.click(await screen.findByRole('button', { name: 'Older saved view' }));
        await waitFor(() =>
            expect(Object.fromEntries(snapshot())).toEqual({
                filterVariant: 'recent',
                'filter[query]': 'biology',
                sort: 'score',
            })
        );
    });

    it('leaves the current query intact when the server refuses a saved variant', async () => {
        const { App, saved, read, snapshot } = fixture('page=4');
        const originalRead = read.getMockImplementation()!;
        read.mockImplementation(async (url) => {
            if (url.endsWith('/recent/schema')) throw new Error('Forbidden');
            return originalRead(url);
        });
        saved.push({
            id: 'denied',
            name: 'Denied saved variant',
            resource: 'papers',
            query_parameters: {
                filterVariant: 'recent',
                filter: { query: 'private' },
            },
        });
        render(<App />);
        fireEvent.click(await screen.findByRole('button', { name: 'Denied saved variant' }));
        expect(await screen.findByText('That view could not be applied.')).toBeDefined();
        expect(snapshot().toString()).toBe('page=4');
    });

    it('forwards Frame host restrictions to saved-view controls using the declared resource and record', async () => {
        const can = vi.fn<FrameCan>(
            (action, resource, row) =>
                action === 'delete' && resource === 'team-views' && (row as Row)?.id === 'owned'
        );
        const { App, saved } = fixture('', can);
        const owned = {
            id: 'owned',
            name: 'Owned',
            can: allowed,
            query_parameters: {},
            resource: 'papers',
        };
        saved.push(owned);
        render(<App />);
        expect(await screen.findByRole('button', { name: 'Owned' })).toBeDefined();
        expect(screen.queryByRole('button', { name: 'Save current view' })).toBeNull();
        expect(screen.getByRole('button', { name: 'Delete Owned' })).toBeDefined();
        expect(can).toHaveBeenCalledWith('create', 'team-views');
        expect(can).toHaveBeenCalledWith('delete', 'team-views', owned);
    });
});
