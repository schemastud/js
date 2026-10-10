// C18 — Operator roster responsive contract (UX10). The shared Frame list treatment (ListShell +
// shadcnListSlots, which the operator scaffold-packs and tenants rosters ride) must, below 768px,
// stack each row into a card that keeps the identity and a keyboard-reachable primary action instead
// of a sideways-scrolling table. This characterizes that shared mechanism so the two rosters' narrow
// behavior is pinned once, at the layer that owns it.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { useState, type ReactNode } from 'react';

// `useIsMobile` binds matchMedia at module load, so the mobile stub is hoisted above the imports.
const viewport = vi.hoisted(() => {
    const state = { narrow: true };
    window.matchMedia = ((query: string) => ({
        get matches() {
            return query.includes('max-width') ? state.narrow : false;
        },
        media: query,
        onchange: null,
        addEventListener: () => {},
        removeEventListener: () => {},
        addListener: () => {},
        removeListener: () => {},
        dispatchEvent: () => false,
    })) as unknown as typeof window.matchMedia;
    return state;
});

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { FrameProvider } from '../src/context';
import { ListShell } from '../src/ListShell';
import { shadcnListSlots } from '../src/shadcn/list-slots';
import { createWidgetRegistry } from '@schemastud/seam';
import type { FrameCan, FrameInjection, FramePrimitives, FrameTransport, Paginated, Row } from '../src/types';

afterEach(cleanup);

const ROWS: Row[] = [{ id: 's1', name: 'Starter Pack', slug: 'starter', kind: 'demo' }];

function makeTransport(overrides: Partial<FrameTransport> = {}): FrameTransport {
    return {
        getFilterSchema: vi.fn(async () => ({ properties: {} })),
        getFilterVariants: vi.fn(async (resource) => ({ resource, variants: [] })),
        getFilterOptions: vi.fn(async () => []),
        getSavedFilters: vi.fn(async () => []),
        saveFilter: vi.fn(async () => ({ id: '1', name: 'v', resource: 'scaffold-packs', queryParameters: {}, visibility: 'private', isDefault: false })),
        deleteSavedFilter: vi.fn(async () => undefined),
        list: vi.fn(async (): Promise<Paginated<Row>> => ({ data: ROWS, total: 1, page: 1, perPage: 25 })),
        get: vi.fn(async (_r, id) => ({ id, name: 'Starter Pack' })),
        getFormSchema: vi.fn(async () => ({ type: 'object', properties: {} })),
        create: vi.fn(async (_r: string, data: unknown) => ({ id: 'new', ...(data as object) })),
        save: vi.fn(async (_r, id, data) => ({ id, ...(data as Row) })),
        remove: vi.fn(async () => undefined),
        ...overrides,
    };
}

const primitives: FramePrimitives = {
    Button: ({ children, ...p }: any) => <button {...p}>{children}</button>,
    Input: (p: any) => <input {...p} />,
    Label: ({ children, ...p }: any) => <label {...p}>{children}</label>,
    Popover: ({ children }: any) => <div>{children}</div>,
    PopoverTrigger: ({ children }: any) => <>{children}</>,
    PopoverContent: ({ children }: any) => <div>{children}</div>,
    SimpleSelect: (p: any) => <select {...p} />,
    Badge: ({ children }: any) => <span>{children}</span>,
    Table: ({ children }: any) => <div>{children}</div>,
    Skeleton: (p: any) => <div {...p} />,
    SidePanel: ({ children }: any) => <aside>{children}</aside>,
};

function useMemoryUrlState() {
    const [params, setParams] = useState(() => new URLSearchParams());
    const set = (updater: (prev: URLSearchParams) => URLSearchParams) =>
        setParams((prev) => new URLSearchParams(updater(new URLSearchParams(prev))));
    return [params, set] as const;
}

function makeInjection(transport: FrameTransport, can: FrameCan = () => true): FrameInjection {
    return { transport, primitives, useUrlState: useMemoryUrlState, registry: createWidgetRegistry(), schemaFetcher: async (ref) => ({ $id: ref }), can };
}

function wrap(injection: FrameInjection) {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    return ({ children }: { children: ReactNode }) => (
        <QueryClientProvider client={client}><FrameProvider value={injection}>{children}</FrameProvider></QueryClientProvider>
    );
}

const roster = (onOpen?: (r: Row) => void) => (
    <ListShell
        resource="scaffold-packs"
        columns={[{ field: 'name' }, { field: 'kind' }]}
        onOpen={onOpen}
        slots={{ ...shadcnListSlots, Filters: () => null }}
    />
);

describe('shared roster responsive contract (C18)', () => {
    it('stacks each row into a card below 768px instead of a sideways-scrolling table', async () => {
        viewport.narrow = true;
        const { container } = render(roster(() => {}), { wrapper: wrap(makeInjection(makeTransport())) });
        await screen.findByText('Starter Pack');
        // Stacked, not a table: the shared list treatment renders the stacked-card list.
        expect(container.querySelector('[data-frame-stacked]')).not.toBeNull();
        expect(container.querySelector('table')).toBeNull();
    });

    it('keeps the identity and a keyboard-reachable Open action in the stacked card', async () => {
        viewport.narrow = true;
        render(roster(() => {}), { wrapper: wrap(makeInjection(makeTransport())) });
        // Identity (first column) survives as the card heading.
        expect(await screen.findByText('Starter Pack')).toBeTruthy();
        // The primary action is a real, focusable button (not clipped off-screen).
        const open = screen.getByRole('button', { name: /open/i });
        expect(open).toBeTruthy();
        open.focus();
        expect(document.activeElement).toBe(open);
    });
});
