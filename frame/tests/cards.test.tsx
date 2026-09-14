import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { useState, type ReactNode } from 'react';
import { createWidgetRegistry, type WidgetRegistry } from '@schemastud/seam';
import { FrameProvider } from '../src/context';
import { KNOWN_CONTEXTS, type ContextManifest } from '../src/contexts';
import { FRAME_CONTEXT_KEYWORD } from '../src/resolveWidgetFor';
import {
    CARD_WIDGETS,
    DashboardCard,
    FigureCard,
    NavTile,
    RecentList,
    StatRow,
    registerCardWidgets,
    resolveDashboardCard,
    type DashboardRow,
    type SummaryPayload,
} from '../src/cards';
import type { FrameInjection, FramePrimitives, FrameTransport } from '../src/types';

afterEach(cleanup);

// -----------------------------------------------------------------------------------------
// Harness — the injection a card needs is `registry` + `manifestFor`; the rest is inert.
// -----------------------------------------------------------------------------------------

const transport = {
    getFilterSchema: async () => ({ properties: {} }),
    getFilterVariants: async (resource: string) => ({ resource, variants: [] }),
    getFilterOptions: async () => [],
    getSavedFilters: async () => [],
    saveFilter: async () => ({
        id: '1',
        name: 'v',
        resource: 'x',
        query_parameters: {},
        visibility: 'private',
        is_default: false,
    }),
    deleteSavedFilter: async () => undefined,
    list: async () => ({ data: [], total: 0, page: 1, perPage: 25 }),
    get: async () => ({}),
    getFormSchema: async () => ({ type: 'object' }),
    save: async () => ({}),
    remove: async () => undefined,
} as unknown as FrameTransport;

const primitives = {
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
} as FramePrimitives;

function useMemoryUrlState() {
    const [params, setParams] = useState(() => new URLSearchParams());
    const set = (updater: (prev: URLSearchParams) => URLSearchParams) =>
        setParams((prev) => new URLSearchParams(updater(new URLSearchParams(prev))));
    return [params, set] as const;
}

function makeInjection(registry: WidgetRegistry, manifests: Record<string, ContextManifest>): FrameInjection {
    return {
        transport,
        primitives,
        useUrlState: useMemoryUrlState,
        registry,
        schemaFetcher: async (ref) => ({ $id: ref }),
        can: () => true,
        manifestFor: (resource) => manifests[resource],
    };
}

function wrap(injection: FrameInjection) {
    return ({ children }: { children: ReactNode }) => <FrameProvider value={injection}>{children}</FrameProvider>;
}

const manifest = (root: ContextManifest['byNode']['']): ContextManifest => ({
    byNode: root ? { '': root } : {},
    inherits: { overview: ['summary'] },
    known: KNOWN_CONTEXTS,
});

const summary = (over: Partial<SummaryPayload> = {}): SummaryPayload => ({
    key: 'tenants',
    label: 'Tenants',
    figures: [
        { key: 'total', label: 'Total', value: 42 },
        { key: 'active', label: 'Active', value: 37, tone: 'active' },
    ],
    ...over,
});

const row = (over: Partial<DashboardRow> = {}): DashboardRow => ({
    resource: 'tenants',
    context: 'summary',
    navOrder: 0,
    label: 'Tenants',
    icon: 'building',
    href: '/operator/tenants',
    summary: summary(),
    ...over,
});

const HostCard = ({ value }: any) => <div data-testid="host-card">{value?.label}</div>;
const ActivityLine = ({ value }: any) => <span data-testid="activity-line">{value?.message}</span>;

// -----------------------------------------------------------------------------------------
// 1. registerCardWidgets — entry order is the contract.
// -----------------------------------------------------------------------------------------

describe('registerCardWidgets', () => {
    it('fires the context defaults for an UNBOUND node stamped summary / overview', () => {
        const registry = createWidgetRegistry();
        registerCardWidgets(registry);

        expect(registry.resolveWidget({ type: 'object', [FRAME_CONTEXT_KEYWORD]: 'summary' })).toBe(StatRow);
        expect(registry.resolveWidget({ type: 'object', [FRAME_CONTEXT_KEYWORD]: 'overview' })).toBe(FigureCard);
        // Other contexts have no card default — nothing here answers for a `detail` node.
        expect(registry.resolveWidget({ type: 'object', [FRAME_CONTEXT_KEYWORD]: 'detail' })).toBeUndefined();
    });

    it('resolves every named widget by its x-widget name', () => {
        const registry = createWidgetRegistry();
        registerCardWidgets(registry);

        for (const [name, widget] of Object.entries(CARD_WIDGETS)) {
            expect(registry.resolveWidget({ 'x-widget': name })).toBe(widget);
        }
        expect(Object.keys(CARD_WIDGETS).sort()).toEqual(
            ['dashboard-card', 'figure-card', 'nav-tile', 'recent-list', 'stat-row'],
        );
    });

    it('a declared name registered BEFORE the card set still wins over the context default', () => {
        const registry = createWidgetRegistry();
        registry.registerWidget((s) => s['x-widget'] === 'tenant-card', HostCard);
        registerCardWidgets(registry);

        expect(
            registry.resolveWidget({ type: 'object', 'x-widget': 'tenant-card', [FRAME_CONTEXT_KEYWORD]: 'summary' }),
        ).toBe(HostCard);
    });

    it('a declared name the registry does NOT know stays unbound rather than taking the default', () => {
        const registry = createWidgetRegistry();
        registerCardWidgets(registry);

        expect(
            registry.resolveWidget({ type: 'object', 'x-widget': 'nobody-registered-this', [FRAME_CONTEXT_KEYWORD]: 'summary' }),
        ).toBeUndefined();
    });

    it('a host replaces a default by registering a LATER predicate on the same context', () => {
        const registry = createWidgetRegistry();
        registerCardWidgets(registry);
        registry.registerWidget((s) => s[FRAME_CONTEXT_KEYWORD] === 'summary', HostCard);

        expect(registry.resolveWidget({ type: 'object', [FRAME_CONTEXT_KEYWORD]: 'summary' })).toBe(HostCard);
        // The names are untouched by a context override.
        expect(registry.resolveWidget({ 'x-widget': 'stat-row' })).toBe(StatRow);
    });

    it('carries the host icon resolver as config, and is idempotent per registry', () => {
        const registry = createWidgetRegistry();
        const iconFor = vi.fn();
        registerCardWidgets(registry, { iconFor });
        registerCardWidgets(registry, { iconFor: vi.fn() });

        expect(registry.resolveEntry({ 'x-widget': 'nav-tile' }).config).toEqual({ iconFor });
    });
});

// -----------------------------------------------------------------------------------------
// 2. resolveDashboardCard — the fallback chain, as a pure function.
// -----------------------------------------------------------------------------------------

describe('resolveDashboardCard — overview → summary → the context default', () => {
    const registry = createWidgetRegistry();
    registry.registerWidget((s) => s['x-widget'] === 'tenant-card', HostCard);
    registerCardWidgets(registry);

    it('a declared overview binding wins for an overview row', () => {
        const m = manifest({
            summary: { participates: true, widget: 'stat-row' },
            overview: { participates: true, widget: 'tenant-card' },
        });
        expect(resolveDashboardCard(row({ context: 'overview' }), m, registry).widget).toBe(HostCard);
    });

    it('an unbound overview inherits the summary binding — the parent is derived from the manifest', () => {
        const m = manifest({
            summary: { participates: true, widget: 'tenant-card' },
            overview: { participates: true },
        });
        expect(resolveDashboardCard(row({ context: 'overview' }), m, registry).widget).toBe(HostCard);
    });

    it('no overview entry at all falls to the summary binding', () => {
        const m = manifest({ summary: { participates: true, widget: 'tenant-card' } });
        expect(resolveDashboardCard(row({ context: 'overview' }), m, registry).widget).toBe(HostCard);
    });

    it('nothing declared at the root falls to the context default of the ROW context', () => {
        expect(resolveDashboardCard(row({ context: 'overview' }), manifest(undefined), registry).widget).toBe(FigureCard);
        expect(resolveDashboardCard(row({ context: 'summary' }), manifest(undefined), registry).widget).toBe(StatRow);
    });

    it('an opted-out summary lends NOTHING to an unbound overview — the overview default fires, not stat-row', () => {
        // `#[Summary(false)]` on the wire: the entry exists, participates false, and may still name
        // a widget. Treating it as a parent would hand `stat-row` to the overview.
        const m = manifest({
            summary: { participates: false, widget: 'stat-row' },
            overview: { participates: true },
        });
        expect(resolveDashboardCard(row({ context: 'overview' }), m, registry).widget).toBe(FigureCard);
    });

    it('a tier bound to a name the registry does not know is skipped, not rendered', () => {
        const m = manifest({
            summary: { participates: true, widget: 'tenant-card' },
            overview: { participates: true, widget: 'unregistered-overview' },
        });
        expect(resolveDashboardCard(row({ context: 'overview' }), m, registry).widget).toBe(HostCard);
    });
});

// -----------------------------------------------------------------------------------------
// 3. DashboardCard rendered — what a dashboard row actually shows.
// -----------------------------------------------------------------------------------------

describe('DashboardCard', () => {
    function setup(manifests: Record<string, ContextManifest>, extra?: (r: WidgetRegistry) => void) {
        const registry = createWidgetRegistry();
        extra?.(registry);
        registerCardWidgets(registry);
        return wrap(makeInjection(registry, manifests));
    }

    it('mounts the resolved card with the row summary payload and the row', () => {
        const wrapper = setup({ tenants: manifest({ summary: { participates: true } }) });
        const { container } = render(<DashboardCard value={row()} />, { wrapper });

        expect(container.querySelector('[data-frame-card="stat-row"]')).toBeTruthy();
        expect(screen.getByText('42')).toBeTruthy();
        expect(screen.getByText('Active')).toBeTruthy();
        // The heading links to the row href — the row reached the inner widget.
        expect(container.querySelector('a[data-frame-card-heading]')?.getAttribute('href')).toBe('/operator/tenants');
    });

    it('draws a figure-card for an overview row whose target declares only an overview default', () => {
        const wrapper = setup({ bills: manifest(undefined) });
        const { container } = render(
            <DashboardCard value={row({ resource: 'bills', context: 'overview', summary: summary({ key: 'bills', label: 'Bills' }) })} />,
            { wrapper },
        );

        expect(container.querySelector('[data-frame-card="figure-card"]')).toBeTruthy();
        expect(container.querySelector('a[data-frame-card-link]')?.getAttribute('href')).toBe('/operator/tenants');
    });

    it('a row whose target manifest is missing renders NOTHING and throws nothing', () => {
        const error = vi.spyOn(console, 'error').mockImplementation(() => {});
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
        const wrapper = setup({});

        let container: HTMLElement | undefined;
        expect(() => {
            ({ container } = render(<DashboardCard value={row({ resource: 'ghost' })} />, { wrapper }));
        }).not.toThrow();

        expect(container!.innerHTML).toBe('');
        expect(error).not.toHaveBeenCalled();
        expect(warn).not.toHaveBeenCalled();
        error.mockRestore();
        warn.mockRestore();
    });

    it('renders nothing when the injection carries no manifestFor at all', () => {
        const registry = createWidgetRegistry();
        registerCardWidgets(registry);
        const injection = makeInjection(registry, {});
        delete injection.manifestFor;
        const { container } = render(<DashboardCard value={row()} />, { wrapper: wrap(injection) });

        expect(container.innerHTML).toBe('');
    });

    it('a nav row draws a NavTile without any manifest lookup', () => {
        const manifestFor = vi.fn(() => undefined);
        const registry = createWidgetRegistry();
        registerCardWidgets(registry);
        const injection = { ...makeInjection(registry, {}), manifestFor };
        const { container } = render(
            <DashboardCard value={row({ resource: 'usage', context: 'nav', label: 'Usage', href: '/operator/usage', summary: null, description: 'Spend' })} />,
            { wrapper: wrap(injection) },
        );

        const tile = container.querySelector('a[data-frame-card="nav-tile"]');
        expect(tile?.getAttribute('href')).toBe('/operator/usage');
        expect(screen.getByText('Usage')).toBeTruthy();
        expect(screen.getByText('Spend')).toBeTruthy();
        expect(manifestFor).not.toHaveBeenCalled();
    });
});

// -----------------------------------------------------------------------------------------
// 4. RecentList — the target's own list-item binding renders the items.
// -----------------------------------------------------------------------------------------

describe('RecentList', () => {
    const items = [
        { id: 'e1', message: 'Provisioned acme' },
        { id: 'e2', message: 'Suspended globex' },
        { id: 'e3', message: 'Restored initech' },
    ];
    const activityRow = row({
        resource: 'activity',
        context: 'overview',
        href: '/operator/activity',
        summary: summary({ key: 'activity', label: 'Recent activity', figures: [], overview: { items } }),
    });

    it('renders overview.items through the target resource list-item widget, plus "View all"', () => {
        const registry = createWidgetRegistry();
        registry.registerWidget((s) => s['x-widget'] === 'activity-line', ActivityLine);
        registerCardWidgets(registry);
        const wrapper = wrap(
            makeInjection(registry, {
                activity: manifest({
                    'list-item': { participates: true, widget: 'activity-line' },
                    overview: { participates: true, widget: 'recent-list' },
                }),
            }),
        );

        const { container } = render(<DashboardCard value={activityRow} />, { wrapper });

        expect(container.querySelector('[data-frame-card="recent-list"]')).toBeTruthy();
        expect(screen.getAllByTestId('activity-line').map((n) => n.textContent)).toEqual([
            'Provisioned acme',
            'Suspended globex',
            'Restored initech',
        ]);
        expect(container.querySelector('a[data-frame-card-link]')?.getAttribute('href')).toBe('/operator/activity');
        expect(container.innerHTML).not.toContain('{"id"');
    });

    it('falls to a display name per item — never JSON — when the target binds no list-item component', () => {
        const registry = createWidgetRegistry();
        registerCardWidgets(registry);
        const wrapper = wrap(makeInjection(registry, { activity: manifest({ 'list-item': { participates: true } }) }));

        const { container } = render(
            <RecentList value={activityRow.summary!} row={activityRow} />,
            { wrapper },
        );

        expect(container.querySelectorAll('[data-frame-recent-fallback]')).toHaveLength(3);
        expect(screen.getByText('e1')).toBeTruthy();
        expect(container.innerHTML).not.toContain('{"id"');
    });

    it('shows an honest empty state for zero items', () => {
        const registry = createWidgetRegistry();
        registerCardWidgets(registry);
        render(<RecentList value={summary({ overview: { items: [] } })} />, {
            wrapper: wrap(makeInjection(registry, {})),
        });

        expect(screen.getByText('Nothing recent.')).toBeTruthy();
    });
});

// -----------------------------------------------------------------------------------------
// 5. The leaf cards render off a plain payload with no provider at all.
// -----------------------------------------------------------------------------------------

describe('leaf cards', () => {
    it('StatRow: one tile per figure, tone forwarded, honest empty', () => {
        const { container, rerender } = render(<StatRow value={summary()} />);
        expect(container.querySelectorAll('[data-stat-tile]')).toHaveLength(2);
        expect(container.querySelector('[data-stat-tile][data-tone="active"]')).toBeTruthy();

        rerender(<StatRow value={summary({ figures: [] })} />);
        expect(screen.getByText('No figures.')).toBeTruthy();
    });

    it('FigureCard: the overview headline leads, every figure strips beneath, period is the subtitle', () => {
        const { container } = render(
            <FigureCard
                value={summary({
                    figures: [{ key: 'draft', label: 'Draft', value: 2 }, { key: 'paid', label: 'Paid', value: 27 }],
                    overview: {
                        headline: { key: 'total', label: 'Period total', value: '$1,240' },
                        items: [],
                        period: 'Current period · 2026-09',
                        note: 'Excludes voided bills',
                    },
                })}
            />,
        );
        expect(container.querySelector('[data-frame-figure="total"]')?.textContent).toBe('$1,240');
        expect(container.querySelectorAll('.rounded-md.border.p-2')).toHaveLength(2);
        expect(container.querySelector('[data-frame-figure="draft"]')?.textContent).toContain('2');
        expect(screen.getByText('Current period · 2026-09')).toBeTruthy();
        expect(screen.getByText('Excludes voided bills')).toBeTruthy();
    });

    it('FigureCard: with no headline (a summary cascaded into an overview row) the first figure leads', () => {
        const { container } = render(
            <FigureCard value={summary({ figures: [{ key: 'total', label: 'Period total', value: '$1,240' }, { key: 'draft', label: 'Draft', value: 2 }] })} />,
        );
        expect(container.querySelector('[data-frame-figure="total"]')?.textContent).toBe('$1,240');
        expect(container.querySelectorAll('.rounded-md.border.p-2')).toHaveLength(1);
    });

    it('NavTile: uses the host icon resolver, else the label initial; nothing without an href', () => {
        const Glyph = ({ className }: { className?: string }) => <svg data-testid="glyph" className={className} />;
        const { container, rerender } = render(
            <NavTile value={{ label: 'Tenants', icon: 'building', href: '/t' }} options={{ iconFor: () => Glyph }} />,
        );
        expect(screen.getByTestId('glyph')).toBeTruthy();

        rerender(<NavTile value={{ label: 'Tenants', icon: 'building', href: '/t' }} />);
        expect(screen.getByText('T')).toBeTruthy();

        rerender(<NavTile value={{ label: 'Tenants', href: '' }} />);
        expect(container.innerHTML).toBe('');
    });
});
