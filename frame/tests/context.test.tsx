import { cleanup, render } from '@testing-library/react';
import { useState, type ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createWidgetRegistry } from '@schemastud/seam';
import { FrameProvider } from '../src/context';
import { ResourceRefWidget } from '../src/ResourceRefWidget';
import type { FrameInjection, FramePrimitives, FrameTransport } from '../src/types';

afterEach(cleanup);

/**
 * `FrameProvider` auto-installs its built-in widgets (the resource-ref picker) into
 * WHATEVER registry a host hands it via `value.registry` — the actual integration gap
 * `ResourceRefWidget.test.tsx` doesn't exercise (it renders the widget directly, never
 * through `FrameProvider` → registry resolution). Found live: this auto-install had a
 * real ordering bug (the WeakSet guard marked a registry as "done" BEFORE the install
 * call ran, not after) that let a host's registry silently end up without the widget
 * with no test catching it — this is the regression guard for that gap.
 */
function makeInjection(): FrameInjection {
    const primitives: FramePrimitives = {
        Button: (p: any) => <button {...p} />,
        Input: (p: any) => <input {...p} />,
        Label: (p: any) => <label {...p} />,
        Popover: ({ children }: any) => <div>{children}</div>,
        PopoverTrigger: ({ children }: any) => <>{children}</>,
        PopoverContent: ({ children }: any) => <div>{children}</div>,
        SimpleSelect: (p: any) => <select {...p} />,
        Badge: ({ children }: any) => <span>{children}</span>,
        Table: ({ children }: any) => <div>{children}</div>,
        Skeleton: () => <div />,
        SidePanel: ({ children }: any) => <aside>{children}</aside>,
    };
    const transport: FrameTransport = {
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
        list: vi.fn(async () => ({ data: [], total: 0, page: 1, perPage: 25 })),
        get: vi.fn(async (_r, id) => ({ id })),
        getFormSchema: vi.fn(async () => ({ type: 'object', properties: {} })),
        save: vi.fn(async (_r, id, data) => ({ id: id ?? '1', ...(data as object) })),
        remove: vi.fn(async () => undefined),
    };

    return {
        transport,
        primitives,
        useUrlState() {
            const [params] = useState(() => new URLSearchParams());
            return [params, () => {}] as const;
        },
        registry: createWidgetRegistry(),
        schemaFetcher: async (ref) => ({ $id: ref }),
        can: () => true,
    };
}

describe('FrameProvider auto-installs built-in widgets', () => {
    it('the wrapped registry resolves ResourceRefWidget for an x-stud-resource-ref node after mount', () => {
        const injection = makeInjection();

        render(
            <FrameProvider value={injection}>
                <div />
            </FrameProvider>,
        );

        const resolved = injection.registry.resolveEntry({
            type: ['string', 'null'],
            'x-stud-resource-ref': { resource: 'beam-ux-entry', value: 'id', label: 'title' },
        });

        expect(resolved.widget).toBe(ResourceRefWidget);
    });

    it('is idempotent — mounting FrameProvider twice on the SAME registry does not throw or duplicate badly', () => {
        const injection = makeInjection();

        render(
            <FrameProvider value={injection}>
                <div />
            </FrameProvider>,
        );
        render(
            <FrameProvider value={injection}>
                <div />
            </FrameProvider>,
        );

        const resolved = injection.registry.resolveEntry({
            type: 'string',
            'x-stud-resource-ref': { resource: 'beam-ux-entry', value: 'id', label: 'title' },
        });

        expect(resolved.widget).toBe(ResourceRefWidget);
    });
});
