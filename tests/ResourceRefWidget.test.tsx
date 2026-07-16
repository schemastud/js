import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { useState, type ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(cleanup);

import { FrameProvider } from '../src/context';
import { ResourceRefWidget } from '../src/ResourceRefWidget';
import { STUD_RESOURCE_REF_KEYWORD } from '../src/raw-mode';
import { createWidgetRegistry } from '@schemastud/seam';
import type { FrameInjection, FramePrimitives, FrameTransport, Paginated, Row } from '../src/types';

const PLANS: Row[] = [
    { slug: 'pro', name: 'Pro' },
    { slug: 'lite', name: 'Lite' },
];

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
            async (): Promise<Paginated<Row>> => ({ data: PLANS, total: 2, page: 1, perPage: 25 }),
        ),
        get: vi.fn(async (_r, id) => ({ id })),
        getFormSchema: vi.fn(async () => ({ type: 'object', properties: {} })),
        save: vi.fn(async (_r, id, data) => ({ id: id ?? '3', ...(data as Row) })),
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
    Skeleton: () => <div />,
    SidePanel: ({ children }: any) => <aside>{children}</aside>,
};

function useMemoryUrlState() {
    const [params, setParams] = useState(() => new URLSearchParams());
    const set = (updater: (prev: URLSearchParams) => URLSearchParams) =>
        setParams((prev) => new URLSearchParams(updater(new URLSearchParams(prev))));
    return [params, set] as const;
}

function makeInjection(transport: FrameTransport): FrameInjection {
    return {
        transport,
        primitives,
        useUrlState: useMemoryUrlState,
        registry: createWidgetRegistry(),
        schemaFetcher: async (ref) => ({ $id: ref }),
        can: () => true,
    };
}

function wrap(injection: FrameInjection) {
    return ({ children }: { children: ReactNode }) => (
        <FrameProvider value={injection}>{children}</FrameProvider>
    );
}

describe('ResourceRefWidget', () => {
    it('lists the referenced resource and renders labelled options; selecting emits the value field', async () => {
        const transport = makeTransport();
        const onChange = vi.fn();
        const Wrapper = wrap(makeInjection(transport));
        const schema = {
            type: 'string',
            [STUD_RESOURCE_REF_KEYWORD]: { resource: 'plans', value: 'slug', label: 'name', multiple: false },
        };

        render(<ResourceRefWidget id="plan" schema={schema} value="" onChange={onChange} />, {
            wrapper: Wrapper,
        });

        await waitFor(() => expect(screen.getByText('Pro')).toBeTruthy());
        expect(screen.getByText('Lite')).toBeTruthy();
        expect(transport.list).toHaveBeenCalledWith('plans', {});

        // Selecting 'Pro' emits its `value` field ('pro'), NOT its label.
        fireEvent.change(screen.getByRole('combobox'), { target: { value: 'pro' } });
        expect(onChange).toHaveBeenCalledWith('pro');
    });

    it('multiple + scope: passes scope as string query params and supports multi-select', async () => {
        const transport = makeTransport({
            list: vi.fn(
                async (): Promise<Paginated<Row>> => ({
                    data: [
                        { slug: 'starter', name: 'Starter' },
                        { slug: 'growth', name: 'Growth' },
                    ],
                    total: 2,
                    page: 1,
                    perPage: 25,
                }),
            ),
        });
        const onChange = vi.fn();
        const Wrapper = wrap(makeInjection(transport));
        const schema = {
            type: 'array',
            [STUD_RESOURCE_REF_KEYWORD]: {
                resource: 'starter-packs',
                value: 'slug',
                label: 'name',
                multiple: true,
                scope: { status: 'active' },
            },
        };

        render(<ResourceRefWidget id="packs" schema={schema} value={[]} onChange={onChange} />, {
            wrapper: Wrapper,
        });

        await waitFor(() => expect(screen.getByText('Starter')).toBeTruthy());
        // scope values are coerced to strings for the transport's Record<string,string>.
        expect(transport.list).toHaveBeenCalledWith('starter-packs', { status: 'active' });

        const select = screen.getByRole('listbox') as HTMLSelectElement;
        expect(select.multiple).toBe(true);

        // Programmatically select both options, then fire change → emits a string[].
        Array.from(select.options).forEach((o) => (o.selected = true));
        fireEvent.change(select);
        expect(onChange).toHaveBeenCalledWith(['starter', 'growth']);
    });

    it('coerces a numeric scope value to a string query param', async () => {
        const transport = makeTransport();
        const Wrapper = wrap(makeInjection(transport));
        const schema = {
            type: 'string',
            [STUD_RESOURCE_REF_KEYWORD]: {
                resource: 'plans',
                value: 'slug',
                label: 'name',
                multiple: false,
                scope: { tier: 2, live: true },
            },
        };

        render(<ResourceRefWidget id="plan" schema={schema} value="" onChange={vi.fn()} />, {
            wrapper: Wrapper,
        });

        await waitFor(() =>
            expect(transport.list).toHaveBeenCalledWith('plans', { tier: '2', live: 'true' }),
        );
    });
});
