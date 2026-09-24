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
    dashboardRowRenders,
    FigureCard,
    NavTile,
    RecentList,
    RecordLine,
    StatRow,
    formatRecordTime,
    registerCardWidgets,
    resolveDashboardCard,
    type CardLinkRenderer,
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
    create: async (_resource: string, data: unknown) => Response.json({ id: '3', ...(data as object) }).json(),
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
            ['dashboard-card', 'figure-card', 'nav-tile', 'recent-list', 'record-line', 'stat-row'],
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

    it('a tier bound to a name the registry does not know STOPS the chain as unbound', () => {
        // The declaration named something. Falling through to the next tier (or the default)
        // would dress a typo as a working card with nothing on screen to say so — and would
        // contradict what `registerCardWidgets` and `listItemRendersCards` answer for the
        // same unknown name.
        const m = manifest({
            summary: { participates: true, widget: 'tenant-card' },
            overview: { participates: true, widget: 'unregistered-overview' },
        });
        const resolved = resolveDashboardCard(row({ context: 'overview' }), m, registry);

        expect(resolved.unbound).toBe(true);
        expect(resolved.widget).toBeUndefined();
        expect(resolved.declared).toBe('unregistered-overview');
    });

    it('a summary row reads the SUMMARY tier — an overview binding never answers for it', () => {
        // Kills "the chain is always ['overview', 'summary']": a summary row whose target
        // declares only an overview must land on the summary DEFAULT, not the overview widget.
        const m = manifest({ overview: { participates: true, widget: 'tenant-card' } });
        const resolved = resolveDashboardCard(row({ context: 'summary' }), m, registry);

        expect(resolved.widget).toBe(StatRow);
        expect(resolved.tier).toBe('default');
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

    describe('a welcome row', () => {
        const firstRun = (over: Partial<DashboardRow['welcome'] & object> = {}): DashboardRow => ({
            resource: null,
            context: 'welcome',
            label: 'Welcome, Probe User',
            href: '',
            summary: null,
            welcome: {
                state: 'first-run',
                heading: 'Welcome, Probe User',
                body: "You aren't on a team yet, so there's nothing to show here.",
                actions: [
                    { key: 'create-team', label: 'Create a team', href: '/teams/create' },
                    { key: 'settings', label: 'Account settings', href: '/settings/profile' },
                ],
                hint: 'Have an invitation? Open the link from your email.',
                ...over,
            },
        });

        it('draws the first-run panel from the payload — heading, sentence, every action, the hint — with no manifest lookup', () => {
            const manifestFor = vi.fn(() => undefined);
            const registry = createWidgetRegistry();
            registerCardWidgets(registry);
            const { container } = render(<DashboardCard value={firstRun()} />, {
                wrapper: wrap({ ...makeInjection(registry, {}), manifestFor }),
            });

            const panel = container.querySelector('[data-frame-card="welcome"]');
            expect(panel?.getAttribute('data-frame-welcome-state')).toBe('first-run');
            expect(screen.getByRole('heading', { name: 'Welcome, Probe User' })).toBeTruthy();
            expect(screen.getByText("You aren't on a team yet, so there's nothing to show here.")).toBeTruthy();
            expect(screen.getByText('Have an invitation? Open the link from your email.')).toBeTruthy();
            expect(screen.getByRole('link', { name: 'Create a team' }).getAttribute('href')).toBe('/teams/create');
            expect(screen.getByRole('link', { name: 'Account settings' }).getAttribute('href')).toBe('/settings/profile');
            expect(manifestFor).not.toHaveBeenCalled();
        });

        it('draws only the actions the payload carries, and no hint when there is none', () => {
            const registry = createWidgetRegistry();
            registerCardWidgets(registry);
            render(
                <DashboardCard
                    value={firstRun({
                        state: 'empty',
                        heading: 'Nothing here yet',
                        body: 'Summaries of your work will appear here as soon as there is something to show.',
                        actions: [],
                        hint: null,
                    })}
                />,
                { wrapper: wrap(makeInjection(registry, {})) },
            );

            expect(screen.getByRole('heading', { name: 'Nothing here yet' })).toBeTruthy();
            expect(screen.queryAllByRole('link')).toHaveLength(0);
            expect(screen.queryByText(/invitation/i)).toBeNull();
        });

        it("routes every action through the host's renderLink", () => {
            const renderLink: CardLinkRenderer = ({ href, children, className }) => (
                <a href={href} className={className} data-host-link="">
                    {children}
                </a>
            );
            const registry = createWidgetRegistry();
            registerCardWidgets(registry);
            const { container } = render(<DashboardCard value={firstRun()} options={{ renderLink }} />, {
                wrapper: wrap(makeInjection(registry, {})),
            });

            expect(container.querySelectorAll('a[data-host-link]')).toHaveLength(2);
        });

        it('draws nothing, and is not counted as drawable, without its panel', () => {
            const registry = createWidgetRegistry();
            registerCardWidgets(registry);
            const bare = { ...firstRun(), welcome: null };
            const { container } = render(<DashboardCard value={bare} />, { wrapper: wrap(makeInjection(registry, {})) });

            expect(container.innerHTML).toBe('');
            expect(dashboardRowRenders(bare as never, () => undefined, registry)).toBe(false);
            expect(dashboardRowRenders(firstRun() as never, () => undefined, registry)).toBe(true);
        });
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

    it('a tier bound to a name nothing registered draws the UNBOUND marker, never the default card', () => {
        const wrapper = setup({ bills: manifest({ overview: { participates: true, widget: 'typo' } }) });
        const { container } = render(
            <DashboardCard value={row({ resource: 'bills', context: 'overview', summary: summary({ key: 'bills', label: 'Bills' }) })} />,
            { wrapper },
        );

        expect(container.querySelector('[data-frame-view-error]')?.textContent).toContain('typo');
        expect(container.querySelector('[data-frame-card="figure-card"]')).toBeNull();
        expect(container.querySelector('[data-frame-card="stat-row"]')).toBeNull();
    });

    it('an overview row that falls back to the summary binding keeps the overview chrome', () => {
        // The row asked for an overview and the server sent one. Mounting the summary widget
        // bare would drop `headline` / `period` / `note` with no trace.
        const wrapper = setup({ bills: manifest({ summary: { participates: true, widget: 'stat-row' } }) });
        const payload = summary({
            key: 'bills',
            label: 'Bills',
            figures: [{ key: 'open', label: 'Open', value: 3 }],
            overview: {
                headline: { key: 'total', label: 'Period total', value: '$1,240' },
                items: [],
                period: 'Current period · 2026-09',
                note: 'Excludes voided bills',
            },
        });
        const { container } = render(
            <DashboardCard value={row({ resource: 'bills', context: 'overview', summary: payload })} />,
            { wrapper },
        );

        expect(container.querySelector('[data-frame-card="overview-frame"]')).toBeTruthy();
        expect(container.querySelector('[data-frame-card="stat-row"]')).toBeTruthy();
        expect(container.querySelector('[data-frame-figure="total"]')?.textContent).toBe('$1,240');
        expect(screen.getByText('Current period · 2026-09')).toBeTruthy();
        expect(screen.getByText('Excludes voided bills')).toBeTruthy();
        expect(container.querySelectorAll('[data-stat-tile]')).toHaveLength(1);
    });
});

// -----------------------------------------------------------------------------------------
// 3b. renderLink — frame ships no navigation primitive.
// -----------------------------------------------------------------------------------------

describe('renderLink', () => {
    const renderLink: CardLinkRenderer = ({ href, className, children }) => (
        <button type="button" data-testid="router-link" data-href={href} className={className}>
            {children}
        </button>
    );

    /** Exactly what `SchemaView` hands a mounted widget: the matched registry entry's config. */
    function setup() {
        const registry = createWidgetRegistry();
        registerCardWidgets(registry, { renderLink });
        return {
            options: registry.resolveEntry({ 'x-widget': 'dashboard-card' }).config,
            wrapper: wrap(
                makeInjection(registry, {
                    tenants: manifest({ summary: { participates: true } }),
                    bills: manifest(undefined),
                }),
            ),
        };
    }

    const links = (container: HTMLElement) => Array.from(container.querySelectorAll('[data-testid="router-link"]'));

    it('draws the heading link through the host renderer, and no raw anchor', () => {
        const { options, wrapper } = setup();
        const { container } = render(<DashboardCard value={row()} options={options} />, { wrapper });

        expect(container.querySelector('a')).toBeNull();
        expect(links(container)).toHaveLength(1);
        expect(links(container)[0].getAttribute('data-href')).toBe('/operator/tenants');
    });

    it('draws "View all" through the host renderer, and no raw anchor', () => {
        const { options, wrapper } = setup();
        const { container } = render(
            <DashboardCard value={row({ resource: 'bills', context: 'overview' })} options={options} />,
            { wrapper },
        );

        expect(container.querySelector('a')).toBeNull();
        expect(links(container).map((n) => n.textContent)).toContain('View all →');
    });

    it('draws the whole nav tile through the host renderer, and no raw anchor', () => {
        const { options, wrapper } = setup();
        const { container } = render(
            <DashboardCard
                value={row({ resource: 'usage', context: 'nav', label: 'Usage', href: '/operator/usage', summary: null })}
                options={options}
            />,
            { wrapper },
        );

        expect(container.querySelector('a')).toBeNull();
        expect(links(container)).toHaveLength(1);
        expect(links(container)[0].getAttribute('data-href')).toBe('/operator/usage');
        expect(screen.getByText('Usage')).toBeTruthy();
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

    // What `CentralActivityData` carries: no name/title/label — text in `description`, the verb in
    // `event`, the moment in `created_at`. The measured defect rendered these as `5,4,3,2,1`.
    const centralItems = [
        { id: 5, event: 'created', description: 'Tenant acme provisioned', created_at: '2026-01-05T09:00:00Z' },
        { id: 4, event: 'suspended', description: 'globex suspended by operator', created_at: '2026-01-04T09:00:00Z' },
        { id: 3, description: 'Realm bootstrapped', created_at: 'not a date' },
    ];
    const centralRow = row({
        resource: 'activity',
        context: 'overview',
        href: '/operator/activity',
        summary: summary({ key: 'activity', label: 'Recent activity', figures: [], overview: { items: centralItems } }),
    });

    it('renders record-line per item — description, event badge, time; never the id — when the target declares NO list-item name', () => {
        const registry = createWidgetRegistry();
        registerCardWidgets(registry);
        const wrapper = wrap(makeInjection(registry, { activity: manifest({ 'list-item': { participates: true } }) }));

        const { container } = render(<RecentList value={centralRow.summary!} row={centralRow} />, { wrapper });

        expect(container.querySelectorAll('[data-frame-record-line]')).toHaveLength(3);
        expect(Array.from(container.querySelectorAll('[data-frame-record-line-text]')).map((n) => n.textContent)).toEqual([
            'Tenant acme provisioned',
            'globex suspended by operator',
            'Realm bootstrapped',
        ]);
        expect(Array.from(container.querySelectorAll('[data-frame-record-line-badge]')).map((n) => n.textContent)).toEqual([
            'created',
            'suspended',
        ]);
        const times = Array.from(container.querySelectorAll('time[data-frame-record-line-time]'));
        expect(times.map((n) => n.getAttribute('datetime'))).toEqual([
            '2026-01-05T09:00:00Z',
            '2026-01-04T09:00:00Z',
            'not a date',
        ]);
        expect(times[0].textContent).toBe(new Date('2026-01-05T09:00:00Z').toLocaleDateString());
        // Populated-and-wrong shows RAW, never `Invalid Date`.
        expect(times[2].textContent).toBe('not a date');
        expect(container.innerHTML).not.toContain('Invalid Date');
        expect(container.querySelector('[data-frame-view-error]')).toBeNull();
        expect(screen.queryByText('5')).toBeNull();
        expect(container.innerHTML).not.toContain('{"id"');
    });

    it('fires the record-line default just the same with no list-item entry, and with no target manifest at all', () => {
        const registry = createWidgetRegistry();
        registerCardWidgets(registry);

        const noEntry = render(<RecentList value={centralRow.summary!} row={centralRow} />, {
            wrapper: wrap(makeInjection(registry, { activity: manifest(undefined) })),
        });
        expect(noEntry.container.querySelectorAll('[data-frame-record-line]')).toHaveLength(3);
        cleanup();

        const noManifest = render(<RecentList value={centralRow.summary!} row={centralRow} />, {
            wrapper: wrap(makeInjection(registry, {})),
        });
        expect(noManifest.container.querySelectorAll('[data-frame-record-line]')).toHaveLength(3);
        expect(noManifest.container.innerHTML).not.toContain('{"id"');
    });

    it('record-line shows the id only when the record carries no text field', () => {
        const registry = createWidgetRegistry();
        registerCardWidgets(registry);
        const wrapper = wrap(makeInjection(registry, { activity: manifest({ 'list-item': { participates: true } }) }));

        const { container } = render(<RecentList value={activityRow.summary!} row={activityRow} />, { wrapper });

        expect(container.querySelectorAll('[data-frame-record-line]')).toHaveLength(3);
        expect(screen.getByText('e1')).toBeTruthy();
        expect(container.querySelector('[data-frame-record-line-badge]')).toBeNull();
        expect(container.querySelector('[data-frame-record-line-time]')).toBeNull();
    });

    it('a DECLARED name the registry does not know stays the honest unbound marker — never record-line, never JSON', () => {
        const registry = createWidgetRegistry();
        registerCardWidgets(registry);
        const wrapper = wrap(
            makeInjection(registry, { activity: manifest({ 'list-item': { participates: true, widget: 'activity-lien' } }) }),
        );

        const { container } = render(<RecentList value={centralRow.summary!} row={centralRow} />, { wrapper });

        expect(container.querySelector('[data-frame-view="unbound-list-item"] [data-frame-view-error]')?.textContent).toContain(
            'activity-lien',
        );
        expect(container.querySelector('[data-frame-record-line]')).toBeNull();
        expect(container.querySelector('[data-frame-recent-items]')).toBeNull();
        expect(container.innerHTML).not.toContain('{"id"');
        // The card chrome survives: the heading and "View all" still reach the screen.
        expect(container.querySelector('a[data-frame-card-link]')?.getAttribute('href')).toBe('/operator/activity');
    });

    it('a host that registers a LATER record-line replaces the default for unbound targets', () => {
        const registry = createWidgetRegistry();
        registerCardWidgets(registry);
        registry.registerWidget((s) => s['x-widget'] === 'record-line', ActivityLine);
        const wrapper = wrap(makeInjection(registry, { activity: manifest({ 'list-item': { participates: true } }) }));

        render(<RecentList value={activityRow.summary!} row={activityRow} />, { wrapper });

        expect(screen.getAllByTestId('activity-line').map((n) => n.textContent)).toEqual([
            'Provisioned acme',
            'Suspended globex',
            'Restored initech',
        ]);
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
        // The headline plus one sub-tile per figure — counted by the attribute the card stamps,
        // not by the utility classes it happens to be styled with.
        expect(container.querySelectorAll('[data-frame-figure]')).toHaveLength(3);
        expect(container.querySelector('[data-frame-figure="draft"]')?.textContent).toContain('2');
        expect(screen.getByText('Current period · 2026-09')).toBeTruthy();
        expect(screen.getByText('Excludes voided bills')).toBeTruthy();
    });

    it('FigureCard: with no headline (a summary cascaded into an overview row) the first figure leads', () => {
        const { container } = render(
            <FigureCard value={summary({ figures: [{ key: 'total', label: 'Period total', value: '$1,240' }, { key: 'draft', label: 'Draft', value: 2 }] })} />,
        );
        expect(container.querySelector('[data-frame-figure="total"]')?.textContent).toBe('$1,240');
        // The leading figure is spent on the headline slot, so one sub-tile remains: two in all.
        expect(container.querySelectorAll('[data-frame-figure]')).toHaveLength(2);
    });

    it('RecordLine: text field order is title | label | name | description | summary; badge is event, else status', () => {
        const { container, rerender } = render(
            <RecordLine value={{ id: 9, name: 'Named', description: 'Described', status: 'open' }} />,
        );
        expect(container.querySelector('[data-frame-record-line-text]')?.textContent).toBe('Named');
        expect(container.querySelector('[data-frame-record-line-badge]')?.textContent).toBe('open');

        rerender(<RecordLine value={{ id: 9, summary: 'Summarised', status: 'open', event: 'created' }} />);
        expect(container.querySelector('[data-frame-record-line-text]')?.textContent).toBe('Summarised');
        expect(container.querySelector('[data-frame-record-line-badge]')?.textContent).toBe('created');

        // A blank string is absent, not a text field; the id is the last resort.
        rerender(<RecordLine value={{ id: 9, title: '   ' }} />);
        expect(container.querySelector('[data-frame-record-line-text]')?.textContent).toBe('9');
    });

    it('formatRecordTime: relative within a week, the locale date beyond it, raw when unparseable', () => {
        const now = Date.parse('2026-09-18T12:00:00Z');
        const at = (ms: number) => new Date(now - ms).toISOString();

        expect(formatRecordTime(at(10_000), now)).toMatch(/now/i);
        expect(formatRecordTime(at(5 * 60_000), now)).toMatch(/5\s?m.*ago/);
        expect(formatRecordTime(at(2 * 3_600_000), now)).toMatch(/2\s?h.*ago/);
        expect(formatRecordTime(at(26 * 3_600_000), now)).toMatch(/yesterday|1\s?d.*ago/);
        expect(formatRecordTime(at(3 * 86_400_000), now)).toMatch(/3\s?d.*ago/);
        expect(formatRecordTime(at(30 * 86_400_000), now)).toBe(new Date(now - 30 * 86_400_000).toLocaleDateString());
        expect(formatRecordTime('not a date', now)).toBe('not a date');
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
