import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { useState, type ReactNode } from 'react';
import { afterEach, expect, it } from 'vitest';
import { createWidgetRegistry } from '@schemastud/seam';
import { MessageProvider } from '@schemastud/messages/react';
import type { ClientCatalog } from '@schemastud/messages';
import { FrameProvider } from '../src/context';
import { ResourcePicker } from '../src/resource-picker/ResourcePicker';
import { PICKER_MANIFESTS, createPickerTransport } from '../src/resource-picker/fixtures';
import { mockPrimitives } from '../src/story-harness';
import type { ResourceSelection } from '../src/resource-picker/selection';
import type { FrameInjection } from '../src/types';

afterEach(cleanup);

function PickerProviders({ children, withManifest = true, threads = 30 }: { children: ReactNode; withManifest?: boolean; threads?: number }) {
    const [client] = useState(() => new QueryClient({ defaultOptions: { queries: { retry: false } } }));
    const [injection] = useState<FrameInjection>(() => ({
        transport: createPickerTransport({ threads }), primitives: mockPrimitives,
        useUrlState: () => [new URLSearchParams(), () => undefined] as const,
        registry: createWidgetRegistry(), schemaFetcher: async (ref) => ({ $id: ref }),
        can: () => true, manifestFor: (resource) => withManifest ? PICKER_MANIFESTS[resource] : undefined,
    }));
    return <QueryClientProvider client={client}><FrameProvider value={injection}>{children}</FrameProvider></QueryClientProvider>;
}

function Picker({ placement, initial }: { placement: 'bulk' | 'attach'; initial: ResourceSelection }) {
    const [value, setValue] = useState(initial);
    return <ResourcePicker resource="threads" placement={placement} labelField="title" value={value} onChange={setValue} defaultOpen={placement === 'attach'} />;
}

const alternate: ClientCatalog = { version: 1, locale: 'es', realm: null, direction: 'ltr', messages: {
    'schemastud-frame::messages.picker.name_header': { text: 'Nombre', sourceLocale: 'es' },
    'schemastud-frame::messages.picker.selected_matching': { text: '{1} Seleccionado :shownCount :one entre :total|[0,*] Entre :total: :shownCount :many elegidos', sourceLocale: 'es' },
    'schemastud-frame::messages.picker.browse_count': { text: '{1} Filtrar :shownCount resultado|[0,*] Filtrar :shownCount resultados', sourceLocale: 'es' },
    'schemastud-frame::messages.picker.results_partial_shown': { text: '{1} De :total, se ve :shownCount|[0,*] De :total, se ven :shownCount', sourceLocale: 'es' },
} };

it('selection sentence can reorder its count and keeps only the number bold', async () => {
    const view = render(<MessageProvider value={alternate}><PickerProviders><Picker placement="bulk" initial={{ mode: 'ids', ids: ['t-1', 't-2'] }} /></PickerProviders></MessageProvider>);
    await waitFor(() => {
        const summary = view.container.querySelector('[data-picker-bar] > span');
        expect(summary?.textContent).toBe('Entre 30: 2 threads elegidos');
        expect(summary?.querySelector('b')?.textContent).toBe('2');
    });
});

it('provider-free selection retains exact spaces and number-only emphasis', async () => {
    const view = render(<PickerProviders><Picker placement="bulk" initial={{ mode: 'ids', ids: ['t-1', 't-2'] }} /></PickerProviders>);
    await waitFor(() => {
        const summary = view.container.querySelector('[data-picker-bar] > span');
        expect(summary?.textContent).toBe('2 threads selected · 30 matching');
        expect(summary?.querySelector('b')?.textContent).toBe('2');
    });
});

it('provider-free set summary has exactly one space before except', async () => {
    const view = render(<PickerProviders><Picker placement="bulk" initial={{ mode: 'set', filter: {}, sort: null, exclude: ['t-1', 't-2', 't-3'] }} /></PickerProviders>);
    await waitFor(() => expect(view.container.querySelector('[data-picker-bar] b')?.textContent).toBe('Every thread except 3'));
});

it('typeahead footer is one translated sentence with semantic counts', async () => {
    render(<MessageProvider value={alternate}><PickerProviders><Picker placement="attach" initial={{ mode: 'ids', ids: [] }} /></PickerProviders></MessageProvider>);
    const browse = await screen.findByRole('button', { name: 'Filtrar 30 resultados' });
    expect(browse.textContent).toBe('Filtrar 30 resultados');
    await waitFor(() => expect(screen.getByText('De 30, se ven 8').textContent).toBe('De 30, se ven 8'));
});

it('provider-free typeahead footer preserves byte-exact English spacing', async () => {
    render(<PickerProviders><Picker placement="attach" initial={{ mode: 'ids', ids: [] }} /></PickerProviders>);
    const browse = await screen.findByRole('button', { name: 'Browse all 30 with filters' });
    expect(browse.textContent).toBe('Browse all 30 with filters');
});

it('record list default Name header reads the outer catalog when no manifest declares a label', async () => {
    render(<MessageProvider value={alternate}><PickerProviders withManifest={false}><Picker placement="bulk" initial={{ mode: 'ids', ids: [] }} /></PickerProviders></MessageProvider>);
    expect(await screen.findByRole('columnheader', { name: /Nombre/ })).toBeTruthy();
});


it('provider-free 1000+ picker counts retain English grouping and exact spacing', async () => {
    render(<PickerProviders threads={1234}><Picker placement="attach" initial={{ mode: 'ids', ids: [] }} /></PickerProviders>);
    const browse = await screen.findByRole('button', { name: 'Browse all 1,234 with filters' });
    expect(browse.textContent).toBe('Browse all 1,234 with filters');
    expect(screen.getByPlaceholderText('Search 1,234 threads…')).toBeTruthy();
});

it('1000+ picker counts follow the message provider locale', async () => {
    render(<MessageProvider value={{ ...alternate, locale: 'de-DE', messages: {} }}><PickerProviders threads={1234}><Picker placement="attach" initial={{ mode: 'ids', ids: [] }} /></PickerProviders></MessageProvider>);
    const browse = await screen.findByRole('button', { name: 'Browse all 1.234 with filters' });
    expect(browse.textContent).toBe('Browse all 1.234 with filters');
    expect(screen.getByPlaceholderText('Search 1.234 threads…')).toBeTruthy();
});
