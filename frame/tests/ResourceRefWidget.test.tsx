import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { type ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(cleanup);

import { FrameProvider, registerFrameWidgets } from '../src/context';
import { ResourceRefWidget, readResourceRefConfig } from '../src/ResourceRefWidget';
import { STUD_RESOURCE_REF_KEYWORD } from '../src/raw-mode';
import { createWidgetRegistry, defaultRegistry } from '@schemastud/seam';
import { mockPrimitives } from '../src/story-harness';
import type { FrameInjection, FrameTransport, Paginated, Row } from '../src/types';

// The `x-stud-resource-ref` field widget is now the ResourcePicker's compact face: a server
// typeahead, not a `<select>` over one unfiltered page (owner-review-20261102 RP).

const PLANS: Row[] = [
    { slug: 'pro', name: 'Pro' },
    { slug: 'lite', name: 'Lite' },
];

function makeTransport(overrides: Partial<FrameTransport> = {}): FrameTransport {
    return {
        getFilterSchema: vi.fn(async () => ({ properties: {} })),
        getFilterVariants: vi.fn(async (resource) => ({ resource, variants: [] })),
        getFilterOptions: vi.fn(async () => []),
        getSavedFilters: vi.fn(async () => []),
        saveFilter: vi.fn(async () => ({
            id: '1',
            name: 'v',
            resource: 'thing',
            queryParameters: {},
            visibility: 'private',
            isDefault: false,
        })),
        deleteSavedFilter: vi.fn(async () => undefined),
        list: vi.fn(async (): Promise<Paginated<Row>> => ({ data: PLANS, total: 2, page: 1, perPage: 8 })),
        summary: vi.fn(async () => ({}) as never),
        get: vi.fn(async (_r, id) => ({ id })),
        getFormSchema: vi.fn(async () => ({ type: 'object', properties: {} })),
        create: vi.fn(async (_resource: string, data: unknown) => ({ id: '3', ...(data as object) }) as never),
        save: vi.fn(async (_r, id, data) => ({ id, ...(data as Row) })),
        remove: vi.fn(async () => undefined),
        ...overrides,
    };
}

function makeInjection(transport: FrameTransport, registry = createWidgetRegistry()): FrameInjection {
    return {
        transport,
        primitives: mockPrimitives,
        useUrlState: () => [new URLSearchParams(), () => undefined] as const,
        registry,
        schemaFetcher: async (ref) => ({ $id: ref }),
        can: () => true,
    };
}

function wrap(injection: FrameInjection) {
    return ({ children }: { children: ReactNode }) => <FrameProvider value={injection}>{children}</FrameProvider>;
}

const planSchema = (extra: Record<string, unknown> = {}) => ({
    type: 'string',
    [STUD_RESOURCE_REF_KEYWORD]: { resource: 'plans', value: 'slug', label: 'name', multiple: false, ...extra },
});

describe('ResourceRefWidget (the ResourcePicker field face)', () => {
    it('searches the referenced resource on open; choosing emits the value field, not the label', async () => {
        const transport = makeTransport();
        const onChange = vi.fn();
        render(<ResourceRefWidget id="plan" schema={planSchema()} value="" onChange={onChange} />, {
            wrapper: wrap(makeInjection(transport)),
        });

        fireEvent.click(screen.getByRole('button', { name: /Choose a plan/ }));
        fireEvent.click(await screen.findByRole('option', { name: 'Pro' }));
        expect(onChange).toHaveBeenCalledWith('pro');
        // A server page request with the typeahead's page size — never an unbounded one.
        expect(transport.list).toHaveBeenCalledWith('plans', { per_page: '8' });
    });

    it('multiple + scope: scope rides every request as string params; picks emit a string[]', async () => {
        const transport = makeTransport();
        const onChange = vi.fn();
        const schema = {
            type: 'array',
            [STUD_RESOURCE_REF_KEYWORD]: {
                resource: 'plans',
                value: 'slug',
                label: 'name',
                multiple: true,
                scope: { tier: 2, live: true },
            },
        };
        render(<ResourceRefWidget id="plans" schema={schema} value={['lite']} onChange={onChange} />, {
            wrapper: wrap(makeInjection(transport)),
        });
        fireEvent.click(screen.getByRole('button', { name: 'lite' }));
        fireEvent.click(await screen.findByRole('option', { name: 'Pro' }));
        expect(onChange).toHaveBeenCalledWith(['lite', 'pro']);
        await waitFor(() =>
            expect(transport.list).toHaveBeenCalledWith('plans', { tier: '2', live: 'true', per_page: '8' }),
        );
    });

    it('a search goes to the server as filter[<searchFacet>]', async () => {
        const transport = makeTransport();
        render(
            <ResourceRefWidget id="plan" schema={planSchema({ searchFacet: 'q' })} value="" onChange={vi.fn()} />,
            { wrapper: wrap(makeInjection(transport)) },
        );
        fireEvent.click(screen.getByRole('button', { name: /Choose a plan/ }));
        fireEvent.change(await screen.findByRole('combobox', { name: 'Search plans' }), { target: { value: 'pr' } });
        await waitFor(() =>
            expect(transport.list).toHaveBeenCalledWith('plans', { 'filter[q]': 'pr', per_page: '8' }),
        );
    });

    it('reads `select` over `multiple`, and keeps the PHP-emitted keys', () => {
        expect(readResourceRefConfig(planSchema({ select: 'set' }) as never)).toMatchObject({ select: 'set', multiple: true });
        expect(readResourceRefConfig(planSchema({ multiple: true }) as never)).toMatchObject({ select: 'multi' });
        expect(readResourceRefConfig(planSchema() as never)).toMatchObject({ select: 'single', value: 'slug', label: 'name' });
    });

    it('outside a FrameProvider it degrades to a read-only readout instead of throwing', () => {
        render(<ResourceRefWidget id="plan" schema={planSchema()} value="pro" onChange={vi.fn()} />);
        const input = screen.getByDisplayValue('pro') as HTMLInputElement;
        expect(input.readOnly).toBe(true);
    });
});

describe('both registry populations (research 10-S1 ii)', () => {
    const node = planSchema() as never;

    it('a FrameProvider installs the picker into its own fresh registry AND seam’s defaultRegistry', () => {
        const registry = createWidgetRegistry();
        render(<div />, { wrapper: wrap(makeInjection(makeTransport(), registry)) });
        expect(registry.resolveWidget(node)).toBe(ResourceRefWidget);
        expect(defaultRegistry.resolveWidget(node)).toBe(ResourceRefWidget);
    });

    it('registerFrameWidgets installs it into any registry, once', () => {
        const registry = createWidgetRegistry();
        const spy = vi.spyOn(registry, 'registerWidget');
        registerFrameWidgets(registry);
        registerFrameWidgets(registry);
        expect(spy).toHaveBeenCalledTimes(1);
        expect(registry.resolveWidget(node)).toBe(ResourceRefWidget);
    });

    it('an explicit x-widget on the node still wins (a host’s silo tree is never shadowed)', () => {
        const registry = createWidgetRegistry();
        const SiloTree = () => null;
        registry.registerWidget('silo-tree-select', SiloTree);
        registerFrameWidgets(registry);
        expect(registry.resolveWidget({ ...(planSchema() as object), 'x-widget': 'silo-tree-select' } as never)).toBe(SiloTree);
    });
});
