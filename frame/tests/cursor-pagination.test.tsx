import { QueryClient, QueryClientProvider, keepPreviousData } from '@tanstack/react-query';
import {
    act,
    cleanup,
    fireEvent,
    render,
    renderHook,
    screen,
    waitFor,
} from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { useBrowserUrlState } from '../../facets/src/useBrowserUrlState';
import { FrameProvider } from '../src/context';
import { useListPagination } from '../src/useListPagination';
import type { ReactNode } from 'react';
import { ListShell } from '../src/ListShell';
import { createMockTransport, mockPrimitives } from '../src/story-harness';
import { createWidgetRegistry } from '@schemastud/seam';
import { ShadcnPagination } from '../src/shadcn/list-slots';
import type { FrameTransport } from '../src/types';

afterEach(() => {
    cleanup();
    window.history.replaceState(null, '', '/');
});

function mount(
    initial = '',
    options: { shadcn?: boolean; pending?: Promise<void>; offset?: boolean } = {},
) {
    window.history.replaceState({ marker: 'kept' }, '', `/events${initial}#feed`);
    const list = vi.fn<FrameTransport['list']>(async (_resource, params) => {
        if (options.offset) {
            const page = Number(params.page ?? 1);
            return {
                data: [{ id: String(page), title: `Offset row ${page}` }],
                total: 2,
                page,
                perPage: 1,
            };
        }
        if (params.cursor === 'second+/=') {
            await options.pending;
            return {
                data: [{ id: '2', title: 'Second row' }],
                perPage: 1,
                nextCursor: 'empty',
            };
        }
        if (params.cursor === 'empty') return { data: [], perPage: 1, nextCursor: null };
        return {
            data: [{ id: '1', title: 'First row' }],
            perPage: 1,
            nextCursor: 'second+/=',
        };
    });
    const transport = { ...createMockTransport(), list };
    const client = new QueryClient({
        defaultOptions: {
            queries: {
                retry: false,
                staleTime: Infinity,
                placeholderData: keepPreviousData,
            },
        },
    });
    const injection = {
        transport,
        primitives: mockPrimitives,
        useUrlState: useBrowserUrlState,
        registry: createWidgetRegistry(),
        schemaFetcher: async () => ({}),
        can: () => false,
    };
    const view = render(
        <QueryClientProvider client={client}>
            <FrameProvider value={injection}>
                <ListShell
                    resource="events"
                    columns={[{ field: 'title', header: 'Title' }]}
                    paginationPlacement="bottom"
                    slots={{
                        Filters: () => null,
                        ...(options.shadcn ? { Pagination: ShadcnPagination } : {}),
                    }}
                />
            </FrameProvider>
        </QueryClientProvider>,
    );
    return { ...view, list, client, injection };
}

it.each([false, true])(
    'navigates cursor pages and keeps empty terminal return controls (shadcn=%s)',
    async (shadcn) => {
        const { list, container } = mount('', { shadcn });
        await screen.findByText('First row');
        fireEvent.click(screen.getByRole('button', { name: /Next/ }));
        await screen.findByText('Second row');
        expect(new URLSearchParams(window.location.search).get('cursor')).toBe('second+/=');
        expect(window.location.hash).toBe('#feed');
        expect(window.history.state).toEqual({ marker: 'kept' });
        fireEvent.click(screen.getByRole('button', { name: /Next/ }));
        await screen.findByText('No records.');
        expect(screen.getByRole('button', { name: /Next/ })).toHaveProperty('disabled', true);
        fireEvent.click(screen.getByRole('button', { name: /Prev/ }));
        await screen.findByText('Second row');
        fireEvent.click(screen.getByRole('button', { name: 'First' }));
        await screen.findByText('First row');
        expect(window.location.search).toBe('');
        expect(container.textContent).not.toMatch(/total|Page \d|NaN/);
        expect(list).toHaveBeenCalledWith('events', { cursor: 'empty' });
    },
);

it('replays an opaque cursor without inventing a predecessor', async () => {
    mount('?cursor=second%2B%2F%3D');
    await screen.findByText('Second row');
    expect(screen.getByRole('button', { name: /Prev/ })).toHaveProperty('disabled', true);
    fireEvent.click(screen.getByRole('button', { name: 'First' }));
    await screen.findByText('First row');
});

it('does not navigate using the previous page placeholder while the requested cursor is pending', async () => {
    let release!: () => void;
    const pending = new Promise<void>((resolve) => {
        release = resolve;
    });
    mount('', { pending });
    await screen.findByText('First row');
    fireEvent.click(screen.getByRole('button', { name: /Next/ }));
    await waitFor(() =>
        expect(screen.getByRole('button', { name: /Next/ })).toHaveProperty('disabled', true),
    );
    await act(async () => release());
    await screen.findByText('Second row');
    expect(screen.getByRole('button', { name: /Next/ })).toHaveProperty('disabled', false);
});

it('replays browser Back through the shared URL state', async () => {
    mount();
    await screen.findByText('First row');
    fireEvent.click(screen.getByRole('button', { name: /Next/ }));
    await screen.findByText('Second row');
    act(() => window.history.back());
    await screen.findByText('First row');
    expect(window.location.search).toBe('');
});

it('resets size and scopes known predecessors by resource, authority and nonpagination query', () => {
    window.history.replaceState(null, '', '/events?per_page=25');
    let transport = createMockTransport();
    const wrapper = ({ children }: { children: ReactNode }) => (
        <FrameProvider
            value={{
                transport,
                primitives: mockPrimitives,
                useUrlState: useBrowserUrlState,
                registry: createWidgetRegistry(),
                schemaFetcher: async () => ({}),
                can: () => false,
            }}
        >
            {children}
        </FrameProvider>
    );
    const hook = renderHook(
        ({ resource, nextCursor }) =>
            useListPagination(
                resource,
                {
                    data: [],
                    perPage: 25,
                    nextCursor,
                },
                false,
            ),
        { wrapper, initialProps: { resource: 'events', nextCursor: 'second' } },
    );
    const props = () => {
        const props = hook.result.current.props;
        if (props?.mode !== 'cursor') throw new Error('Expected cursor controls');
        return props;
    };
    act(() => props().onNext());
    hook.rerender({ resource: 'events', nextCursor: 'third' });
    expect(props().hasPrevious).toBe(true);
    hook.rerender({ resource: 'other', nextCursor: 'third' });
    expect(props().hasPrevious).toBe(false);
    act(() => props().onNext());
    expect(props().hasPrevious).toBe(true);
    transport = createMockTransport();
    hook.rerender({ resource: 'other', nextCursor: 'fourth' });
    expect(props().hasPrevious).toBe(false);
    act(() => props().onNext());
    expect(props().hasPrevious).toBe(true);
    act(() => {
        window.history.replaceState(null, '', '/events?filter[x]=changed&cursor=fourth');
        window.dispatchEvent(new PopStateEvent('popstate'));
    });
    expect(props().hasPrevious).toBe(false);
    act(() => props().onPerPageChange?.(50));
    expect(Object.fromEntries(new URLSearchParams(window.location.search))).toEqual({
        'filter[x]': 'changed',
        per_page: '50',
    });
    expect(props().isFirst).toBe(true);
});

it.each([false, true])(
    'keeps numbered offset navigation and total metadata (shadcn=%s)',
    async (shadcn) => {
        const { list } = mount('', { offset: true, shadcn });
        await screen.findByText('Offset row 1');
        fireEvent.click(screen.getByRole('button', { name: /Next/ }));
        await screen.findByText('Offset row 2');
        expect(new URLSearchParams(window.location.search).get('page')).toBe('2');
        expect(screen.getByRole('button', { name: /Next/ })).toHaveProperty('disabled', true);
        expect(screen.queryByRole('button', { name: 'First' })).toBeNull();
        fireEvent.click(screen.getByRole('button', { name: /Prev/ }));
        await screen.findByText('Offset row 1');
        expect(list).toHaveBeenCalledWith('events', { page: '1' });
    },
);
