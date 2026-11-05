// @vitest-environment jsdom
// ResourcePicker at phone width. `useIsMobile` binds matchMedia at module load, so the stub is
// hoisted above the imports. Layout (no sideways scroll) is measured in a real browser by the
// RP shot capture over Storybook (owner-review-20261102 evidence `resource-picker-prod-20261105/
// capture.mjs`, which exits non-zero on any 390px overflow); this file pins the STRUCTURE that
// makes it hold: stacked cards instead of a wide table, three fields per card, no Open button,
// and the typeahead in a bottom sheet so "Browse all" stays reachable.
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { useState, type ReactNode } from 'react';
import { afterEach, expect, it, vi } from 'vitest';

vi.hoisted(() => {
    window.matchMedia = ((query: string) => ({
        matches: query.includes('max-width'),
        media: query,
        onchange: null,
        addEventListener: () => {},
        removeEventListener: () => {},
        addListener: () => {},
        removeListener: () => {},
        dispatchEvent: () => false,
    })) as unknown as typeof window.matchMedia;
});

import { createWidgetRegistry } from '@schemastud/seam';
import { FrameProvider } from '../src/context';
import { ResourcePicker } from '../src/resource-picker/ResourcePicker';
import { EMPTY_SELECTION, type ResourceSelection } from '../src/resource-picker/selection';
import { PICKER_MANIFESTS, createPickerTransport } from '../src/resource-picker/fixtures';
import { mockPrimitives } from '../src/story-harness';
import type { FrameInjection } from '../src/types';

afterEach(cleanup);

function Providers({ children }: { children: ReactNode }) {
    const [client] = useState(() => new QueryClient({ defaultOptions: { queries: { retry: false } } }));
    const [injection] = useState<FrameInjection>(() => ({
        transport: createPickerTransport({ threads: 30 }),
        primitives: mockPrimitives,
        useUrlState: () => [new URLSearchParams(), () => undefined] as const,
        registry: createWidgetRegistry(),
        schemaFetcher: async (ref) => ({ $id: ref }),
        can: () => true,
        manifestFor: (resource) => PICKER_MANIFESTS[resource],
    }));
    return (
        <QueryClientProvider client={client}>
            <FrameProvider value={injection}>{children}</FrameProvider>
        </QueryClientProvider>
    );
}

function Harness({ placement }: { placement: 'field' | 'bulk' }) {
    const [value, setValue] = useState<ResourceSelection>(EMPTY_SELECTION);
    return <ResourcePicker resource="threads" placement={placement} labelField="title" value={value} onChange={setValue} />;
}

it('the embedded shell folds into stacked cards: three fields, the pick control, no Open button', async () => {
    const { container } = render(
        <Providers>
            <Harness placement="bulk" />
        </Providers>,
    );
    const pick = await screen.findByRole('checkbox', { name: 'Select Invoice dispute #0001' });
    expect(container.querySelector('table')).toBeNull();
    const card = pick.closest('[data-frame-row]') as HTMLElement;
    expect(card.tagName).toBe('LI');
    // first column is the heading; the next two are labelled fields — not the list's five.
    expect(within(card).getAllByRole('term').map((t) => t.textContent)).toEqual(['Status', 'Agent']);
    expect(within(card).queryByRole('button', { name: /Open/ })).toBeNull();

    // The whole card is the tap target on a phone, not just the 20px checkbox.
    fireEvent.click(within(card).getByText('Atlas'));
    expect(card.hasAttribute('data-selected')).toBe(true);
    expect((pick as HTMLInputElement).checked).toBe(true);
    // A card is a list item: it carries the tint hook but never an aria-selected it may not hold.
    expect(card.hasAttribute('aria-selected')).toBe(false);
});

it('the compact typeahead opens as a bottom sheet with Browse all in reach', async () => {
    render(
        <Providers>
            <Harness placement="field" />
        </Providers>,
    );
    fireEvent.click(screen.getByRole('button', { name: /Choose a thread/ }));
    const sheet = await screen.findByRole('dialog', { name: 'Choose a thread' });
    expect(await within(sheet).findByRole('button', { name: 'Browse all 30 with filters' })).toBeTruthy();
    expect(within(sheet).getByRole('combobox', { name: 'Search threads' })).toBeTruthy();
});
