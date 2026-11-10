import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useFrameInjection } from '../src/context';
import { KNOWN_CONTEXTS, type ContextManifest } from '../src/contexts';
import { createFrameKit } from '../src/kit';
import { ListShell } from '../src/ListShell';
import { createMemoryTransport } from '../src/testing';
import type { FrameInjection, FrameManifest, Row } from '../src/types';

afterEach(cleanup);

// Radix measures itself; jsdom has no ResizeObserver.
globalThis.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
} as unknown as typeof ResizeObserver;

const MEMBERS: Row[] = [
    { id: '1', name: 'Ada Lovelace', email: 'ada@example.test' },
    { id: '2', name: 'Grace Hopper', email: 'grace@example.test' },
];

function manifestWith(columns: Record<string, string>): FrameManifest {
    const byNode: ContextManifest['byNode'] = {};
    Object.entries(columns).forEach(([field, label], i) => {
        byNode[field] = { 'list-column': { participates: true, sort: i + 1, label } };
    });
    return {
        resources: [],
        contexts: { members: { byNode, inherits: {}, known: KNOWN_CONTEXTS } },
    };
}

const headers = () => screen.getAllByRole('columnheader').map((th) => th.textContent?.trim());

/**
 * frame-foundation 25 (ruling 02 slice 5): a host mounts frame with one call. A kit over a transport draws a
 * list from its manifest with no other wiring, nests through itself, names itself when missing, and keeps one
 * manifest cache entry per kit.
 */
describe('createFrameKit', () => {
    it('draws the declared headers and rows of a list with no other wiring', async () => {
        const frame = createFrameKit({
            transport: createMemoryTransport({ rows: { members: MEMBERS }, manifest: manifestWith({ name: 'Name', email: 'Email' }) }),
            urlState: 'memory',
        });

        render(
            <frame.Provider>
                <ListShell resource="members" />
            </frame.Provider>,
        );

        expect(await screen.findByText('Ada Lovelace')).toBeTruthy();
        expect(screen.getByText('grace@example.test')).toBeTruthy();
        expect(headers()).toEqual(expect.arrayContaining(['Name', 'Email']));
    });

    it('nested inside itself, a Provider passes through: one injection', () => {
        const frame = createFrameKit({ transport: createMemoryTransport(), urlState: 'memory' });
        const seen: FrameInjection[] = [];
        function Probe() {
            seen.push(useFrameInjection());
            return null;
        }

        render(
            <frame.Provider>
                <Probe />
                <frame.Provider>
                    <Probe />
                </frame.Provider>
            </frame.Provider>,
        );

        expect(seen.length).toBeGreaterThanOrEqual(2);
        expect(new Set(seen).size).toBe(1);
    });

    it('a shell outside any provider throws the message naming createFrameKit', () => {
        vi.spyOn(console, 'error').mockImplementation(() => {});
        expect(() => render(<ListShell resource="members" />)).toThrow(/createFrameKit\(\)/);
    });

    it('two kits under one query client each draw their own columns, and useManifest beside a Provider shares its entry', async () => {
        const first = createMemoryTransport({ rows: { members: MEMBERS }, manifest: manifestWith({ name: 'Name' }) });
        const getManifest = vi.spyOn(first, 'getManifest');
        const one = createFrameKit({ transport: first, urlState: 'memory' });
        const two = createFrameKit({
            transport: createMemoryTransport({ rows: { members: MEMBERS }, manifest: manifestWith({ email: 'Email' }) }),
            urlState: 'memory',
        });
        const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
        function Beside({ children }: { children: ReactNode }) {
            one.useManifest();
            return <>{children}</>;
        }

        render(
            <QueryClientProvider client={client}>
                <Beside>
                    <div data-testid="one">
                        <one.Provider>
                            <ListShell resource="members" />
                        </one.Provider>
                    </div>
                </Beside>
                <div data-testid="two">
                    <two.Provider>
                        <ListShell resource="members" />
                    </two.Provider>
                </div>
            </QueryClientProvider>,
        );

        const firstList = within(screen.getByTestId('one'));
        const secondList = within(screen.getByTestId('two'));
        expect(await firstList.findByText('Ada Lovelace')).toBeTruthy();
        expect(await secondList.findByText('ada@example.test')).toBeTruthy();
        expect(firstList.getAllByRole('columnheader').map((th) => th.textContent?.trim())).toContain('Name');
        expect(firstList.getAllByRole('columnheader').map((th) => th.textContent?.trim())).not.toContain('Email');
        expect(secondList.getAllByRole('columnheader').map((th) => th.textContent?.trim())).toContain('Email');
        expect(secondList.getAllByRole('columnheader').map((th) => th.textContent?.trim())).not.toContain('Name');
        expect(getManifest).toHaveBeenCalledTimes(1);
    });

    it('with no QueryClient anywhere, useManifest above and inside the Provider read one entry: one call, one object', async () => {
        // A fresh object per call, so the identity below can only hold if both sides read one cache entry.
        const getManifest = vi.fn(async () => manifestWith({ name: 'Name' }));
        const transport = createMemoryTransport({ rows: { members: MEMBERS } }, { getManifest });
        const frame = createFrameKit({ transport, urlState: 'memory' });
        const seen: { above?: FrameManifest; inside?: FrameManifest } = {};
        function Above({ children }: { children: ReactNode }) {
            const manifest = frame.useManifest();
            if (manifest.data) seen.above = manifest.data;
            return (
                <>
                    <output data-testid="above">{manifest.data ? 'loaded' : 'loading'}</output>
                    {children}
                </>
            );
        }
        function Inside() {
            const manifest = frame.useManifest();
            if (manifest.data) seen.inside = manifest.data;
            return <output data-testid="inside">{manifest.data ? 'loaded' : 'loading'}</output>;
        }

        render(
            <Above>
                <frame.Provider>
                    <Inside />
                    <ListShell resource="members" />
                </frame.Provider>
            </Above>,
        );

        expect(await screen.findByText('Ada Lovelace')).toBeTruthy();
        await waitFor(() => expect(seen.above && seen.inside).toBeTruthy());
        // The same cache entry, so the same object: the kit's own client serves both sides.
        expect(seen.inside).toBe(seen.above);
        expect(getManifest).toHaveBeenCalledTimes(1);
    });
});
