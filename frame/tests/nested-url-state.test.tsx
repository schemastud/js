import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { createWidgetRegistry } from '@schemastud/seam';
import { createMemoryUrlState, FrameProvider, ListShell } from '../src';
import type { UseUrlState } from '../src';
import { mockPrimitives } from '../src/story-harness';
import { createMemoryTransport, createMemoryUrlState as createMemoryUrlStateFromTesting } from '../src/testing';
import { ShadcnPagination } from '../src/shadcn/list-slots';
import type { FrameTransport } from '../src/types';

/**
 * frame-foundation 62: two lists on one page, each under its own nested `FrameProvider`. A host gives each provider its
 * own `createMemoryUrlState()` from frame's ROOT, so paging one list leaves the other on its own page. With one shared
 * hook (the second test) the page leaks into both lists, which is what agreements 17a's three registry lists did.
 */

afterEach(cleanup);

function mountTwoLists(states: { tasks: UseUrlState; notes: UseUrlState }) {
    // One row per page, two pages, so each list has a Next button. Cast: the mock answers rows, not the generic Result.
    const list = vi.fn<FrameTransport['list']>((async (resource: string, params: Record<string, string>) => {
        const page = Number(params.page ?? 1);
        return { data: [{ id: String(page), title: `${resource} row ${page}` }], total: 2, page, perPage: 1 };
    }) as FrameTransport['list']);
    const transport: FrameTransport = { ...createMemoryTransport(), list: list as FrameTransport['list'] };
    const client = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } });
    const injection = (useUrlState: UseUrlState) => ({
        transport,
        primitives: mockPrimitives,
        useUrlState,
        registry: createWidgetRegistry(),
        schemaFetcher: async () => ({}),
        can: () => false,
    });
    const listFor = (resource: 'tasks' | 'notes') => (
        <section aria-label={resource}>
            <FrameProvider value={injection(states[resource])}>
                <ListShell
                    resource={resource}
                    columns={[{ field: 'title', header: 'Title' }]}
                    paginationPlacement="bottom"
                    slots={{ Filters: () => null, Pagination: ShadcnPagination }}
                />
            </FrameProvider>
        </section>
    );
    render(
        <QueryClientProvider client={client}>
            {listFor('tasks')}
            {listFor('notes')}
        </QueryClientProvider>,
    );

    return { list };
}

const pagesAskedFor = (list: ReturnType<typeof vi.fn<FrameTransport['list']>>, resource: string) =>
    list.mock.calls.filter(([r]) => r === resource).map(([, params]) => params.page ?? '1');

it('pages one nested list without moving the other when each provider has its own createMemoryUrlState()', async () => {
    const { list } = mountTwoLists({ tasks: createMemoryUrlState(), notes: createMemoryUrlState() });
    const tasks = within(await screen.findByRole('region', { name: 'tasks' }));
    const notes = within(screen.getByRole('region', { name: 'notes' }));
    await tasks.findByText('tasks row 1');
    await notes.findByText('notes row 1');

    fireEvent.click(tasks.getByRole('button', { name: /Next/ }));

    await tasks.findByText('tasks row 2');
    expect(notes.getByText('notes row 1')).toBeTruthy();
    expect(pagesAskedFor(list, 'tasks')).toContain('2');
    expect(pagesAskedFor(list, 'notes')).not.toContain('2');
});

it('exports one function from the root and ./testing, not a second copy', () => {
    expect(typeof createMemoryUrlState).toBe('function');
    expect(createMemoryUrlStateFromTesting).toBe(createMemoryUrlState);
});

it('leaks the page into both lists when they share one hook, which is why each provider needs its own', async () => {
    const shared = createMemoryUrlState();
    const { list } = mountTwoLists({ tasks: shared, notes: shared });
    const tasks = within(await screen.findByRole('region', { name: 'tasks' }));
    const notes = within(screen.getByRole('region', { name: 'notes' }));
    await tasks.findByText('tasks row 1');
    await notes.findByText('notes row 1');

    fireEvent.click(tasks.getByRole('button', { name: /Next/ }));

    await notes.findByText('notes row 2');
    expect(pagesAskedFor(list, 'notes')).toContain('2');
});
