import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import {
    BigCalendarProvider,
    BigCalendarSurface,
    planEventDrop,
    planEventSelect,
    reAnchorEvent,
    type CalendarClient,
    type CalendarServices,
    type FoundationCalendarEvent,
} from '../src/index';

/**
 * The isolation bar (rehome-ui §8a): the surface renders off a PLAIN
 * `FoundationCalendarEvent[]` fixture — no Laravel, no app context, no `@/`. If the
 * surface had smuggled an app coupling, importing `../src/index` here would fail to
 * resolve and this file would not even load. The single-instance-React recipe
 * (vitest.config) carries RBC's drag/overlay portals.
 */

// RBC measures its container via ResizeObserver; jsdom lacks it. Portable test-only polyfill.
beforeAll(() => {
    if (!('ResizeObserver' in globalThis)) {
        globalThis.ResizeObserver = class {
            observe() {}
            unobserve() {}
            disconnect() {}
        } as unknown as typeof ResizeObserver;
    }
});

const MONTH = new Date(2026, 6, 15); // July 2026 — deterministic visible month.
const iso = (day: number) => new Date(2026, 6, day);

function event(over: Partial<FoundationCalendarEvent> = {}): FoundationCalendarEvent {
    const start = over.start ?? iso(15);
    return {
        id: 'e1',
        title: 'Weekly Digest #24',
        start,
        end: start,
        allDay: true,
        compositionId: 'comp_digest',
        laneId: 'default',
        colorToken: 'sky',
        resident: true,
        ref: 'ser_digest|r-24',
        meta: { status: 'approved', kind: 'digest' },
        ...over,
    };
}

/** A client whose reads return a fixture and whose writes are spies. */
function fakeClient(events: FoundationCalendarEvent[], over: Partial<CalendarClient> = {}): CalendarClient {
    const nope = () => Promise.reject(new Error('not implemented in fixture'));
    return {
        listEvents: () => Promise.resolve(events),
        reAnchor: vi.fn(() => Promise.resolve()),
        createRelease: nope as CalendarClient['createRelease'],
        editCell: vi.fn(() => Promise.resolve()),
        materialize: nope as CalendarClient['materialize'],
        override: nope as CalendarClient['override'],
        ...over,
    };
}

function withProviders(services: CalendarServices) {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    return ({ children }: { children: ReactNode }) => (
        <QueryClientProvider client={qc}>
            <BigCalendarProvider services={services}>{children}</BigCalendarProvider>
        </QueryClientProvider>
    );
}

// ── The pure interaction contract (residence → gesture) ───────────────────────────

describe('interaction contract', () => {
    it('routes a resident drag to a re-anchor and a non-resident drag to reference mode', () => {
        const resident = event({ resident: true, ref: 'r|1' });
        const virtual = event({ resident: false, ref: 'r|2' });
        const target = iso(22);

        expect(planEventDrop(resident, target)).toEqual({ kind: 'reAnchor', ref: 'r|1', newDate: target });
        expect(planEventDrop(virtual, target)).toEqual({ kind: 'confirmReference', event: virtual, newDate: target });
    });

    it('opens the edit panel in resident-edit for a Release and reference for a virtual', () => {
        expect(planEventSelect(event({ resident: true }))).toBe('resident-edit');
        expect(planEventSelect(event({ resident: false }))).toBe('reference');
    });

    it('a resident drag calls client.reAnchor(ref, newDate) and notifies with a host-side undo', async () => {
        const reAnchor = vi.fn(() => Promise.resolve());
        const notify = vi.fn();
        const resident = event({ ref: 'ser|24', start: iso(15) });
        const services: CalendarServices = { client: fakeClient([], { reAnchor }), notify };

        await reAnchorEvent(services, resident, iso(22));

        expect(reAnchor).toHaveBeenCalledWith('ser|24', iso(22));
        expect(notify).toHaveBeenCalledWith(
            expect.objectContaining({ level: 'success', action: expect.objectContaining({ label: 'Undo' }) }),
        );

        // The undo action re-issues reAnchor with the OLD date (undo is host-side).
        notify.mock.calls[0][0].action.run();
        expect(reAnchor).toHaveBeenLastCalledWith('ser|24', iso(15));
    });
});

// ── §8a: the surface mounts off a pure fixture (no Laravel) ────────────────────────

describe('BigCalendarSurface mounts in isolation', () => {
    it('renders events off the injected client and routes clicks to the edit panel by residence', async () => {
        const resident = event({ id: 'r1', title: 'Weekly Digest #24', resident: true, start: iso(15) });
        const virtual = event({ id: 'v1', title: 'Weekly Digest #26', resident: false, ref: 'ser|26', start: iso(20) });
        const renderEditPanel = vi.fn((ctx) => <div data-testid="panel">{ctx.mode}</div>);
        const Wrapper = withProviders({ client: fakeClient([resident, virtual]), renderEditPanel });

        render(<BigCalendarSurface defaultDate={MONTH} />, { wrapper: Wrapper });

        // The list query resolved through client.listEvents() and RBC painted both bars.
        await waitFor(() => expect(screen.getByText('Weekly Digest #24')).toBeDefined());
        expect(screen.getByText('Weekly Digest #26')).toBeDefined();

        // Clicking the resident event opens the panel in resident-edit mode.
        fireEvent.click(screen.getByText('Weekly Digest #24'));
        await waitFor(() => expect(renderEditPanel).toHaveBeenCalledWith(expect.objectContaining({ mode: 'resident-edit' })));

        // Clicking the non-resident occurrence opens it in reference mode.
        fireEvent.click(screen.getByText('Weekly Digest #26'));
        await waitFor(() => expect(renderEditPanel).toHaveBeenLastCalledWith(expect.objectContaining({ mode: 'reference' })));
    });

    it('wires the real-time subscription through the injected subscribe and tears it down on unmount', () => {
        const unsubscribe = vi.fn();
        const subscribe = vi.fn(() => unsubscribe);
        const Wrapper = withProviders({ client: fakeClient([]), subscribe });

        const { unmount } = render(<BigCalendarSurface defaultDate={MONTH} />, { wrapper: Wrapper });

        expect(subscribe).toHaveBeenCalledWith(expect.any(Function));
        unmount();
        expect(unsubscribe).toHaveBeenCalled();
    });

    it('renders per-lane headers off the opaque lane axis when multi-channel', async () => {
        const renderLaneHeader = vi.fn((lane) => <span>{lane.label}</span>);
        const Wrapper = withProviders({ client: fakeClient([]), renderLaneHeader });

        render(
            <BigCalendarSurface
                defaultDate={MONTH}
                lanes={[
                    { id: 'default', label: 'Default' },
                    { id: 'social', label: 'Social' },
                ]}
            />,
            { wrapper: Wrapper },
        );

        await waitFor(() => expect(screen.getByText('Social')).toBeDefined());
        expect(renderLaneHeader).toHaveBeenCalledWith(expect.objectContaining({ id: 'social' }));
    });
});
