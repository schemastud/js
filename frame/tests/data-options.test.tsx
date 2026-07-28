import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, renderHook, waitFor } from '@testing-library/react';
import { type ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { FrameProvider } from '../src/context';
import { useResourceList, useResourceRecord } from '../src/data';
import { createWidgetRegistry } from '@schemastud/seam';
import type { FrameInjection, FrameTransport, Paginated, Row } from '../src/types';

afterEach(cleanup);

/**
 * The additive `options` pass-through (admin-redesign ticket 02, Q1): a caller may thread extra
 * `useQuery` knobs onto a Frame read (notably `refetchInterval` for a live poll, or `enabled`)
 * WITHOUT Frame surrendering ownership of `queryKey`/`queryFn` — one cache namespace end-to-end,
 * no parallel bespoke fetch. These tests prove options flow through and that omitting them keeps
 * the prior behaviour exactly.
 */

function makeTransport(overrides: Partial<FrameTransport> = {}): FrameTransport {
    return {
        getFilterSchema: vi.fn(async () => ({ properties: {} })),
        getFilterOptions: vi.fn(async () => []),
        getSavedFilters: vi.fn(async () => []),
        saveFilter: vi.fn(async () => ({
            id: '1',
            name: 'v',
            resource: 'thing',
            query_parameters: {},
            visibility: 'private',
            is_default: false,
        })),
        deleteSavedFilter: vi.fn(async () => undefined),
        list: vi.fn(
            async (): Promise<Paginated<Row>> => ({ data: [{ id: '1', title: 'A' }], total: 1, page: 1, perPage: 25 }),
        ),
        get: vi.fn(async (_r, id) => ({ id, title: 'Alpha', isBusy: true })),
        getFormSchema: vi.fn(async () => ({ type: 'object', properties: {} })),
        save: vi.fn(async (_r, id, data) => ({ id: id ?? '3', ...(data as Row) })),
        remove: vi.fn(async () => undefined),
        ...overrides,
    };
}

function makeInjection(transport: FrameTransport): FrameInjection {
    return {
        transport,
        primitives: {} as FrameInjection['primitives'],
        useUrlState: () => [new URLSearchParams(), () => {}] as const,
        registry: createWidgetRegistry(),
        schemaFetcher: async (ref) => ({ $id: ref }),
        can: () => true,
    };
}

function wrap(injection: FrameInjection) {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    return ({ children }: { children: ReactNode }) => (
        <QueryClientProvider client={client}>
            <FrameProvider value={injection}>{children}</FrameProvider>
        </QueryClientProvider>
    );
}

describe('useResourceRecord options pass-through', () => {
    it('fetches through the injected transport with no options (unchanged default)', async () => {
        const transport = makeTransport();
        const { result } = renderHook(() => useResourceRecord('tenants', 'acme'), {
            wrapper: wrap(makeInjection(transport)),
        });

        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(transport.get).toHaveBeenCalledWith('tenants', 'acme');
        expect(result.current.data).toMatchObject({ id: 'acme', isBusy: true });
    });

    it('honours an `enabled: false` override — the query never fires', async () => {
        const transport = makeTransport();
        const { result } = renderHook(
            () => useResourceRecord('tenants', 'acme', { enabled: false }),
            { wrapper: wrap(makeInjection(transport)) },
        );

        // Give react-query a tick; the disabled query must stay idle and never call the transport.
        await new Promise((r) => setTimeout(r, 20));
        expect(transport.get).not.toHaveBeenCalled();
        expect(result.current.fetchStatus).toBe('idle');
    });

    it('threads a `refetchInterval` function onto the live read (the provisioning poll)', async () => {
        const transport = makeTransport();
        const refetchInterval = vi.fn((q: { state: { data?: Row } }) =>
            q.state.data?.isBusy ? 4_000 : false,
        );
        const { result } = renderHook(
            () => useResourceRecord('tenants', 'acme', { refetchInterval }),
            { wrapper: wrap(makeInjection(transport)) },
        );

        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        // react-query evaluates the interval callback against the resolved query — proving the
        // option reached useQuery rather than being dropped.
        await waitFor(() => expect(refetchInterval).toHaveBeenCalled());
        expect(refetchInterval.mock.results.some((r) => r.value === 4_000)).toBe(true);
    });

    it('still disables on id === null (create mode) by default', async () => {
        const transport = makeTransport();
        renderHook(() => useResourceRecord('tenants', null), {
            wrapper: wrap(makeInjection(transport)),
        });
        await new Promise((r) => setTimeout(r, 20));
        expect(transport.get).not.toHaveBeenCalled();
    });
});

describe('useResourceList options pass-through', () => {
    it('threads options while keeping Frame ownership of the query key/fn', async () => {
        const transport = makeTransport();
        const { result } = renderHook(
            () => useResourceList('tenants', { period: '2026-06' }, { staleTime: 1_000 }),
            { wrapper: wrap(makeInjection(transport)) },
        );

        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(transport.list).toHaveBeenCalledWith('tenants', { period: '2026-06' });
        expect(result.current.data?.total).toBe(1);
    });
});
