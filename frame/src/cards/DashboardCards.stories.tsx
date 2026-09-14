/* eslint-disable react-hooks/rules-of-hooks */
import type { Meta, StoryObj } from '@storybook/react-vite';
import { within } from 'storybook/test';
import { useMemo, useState, type ComponentType, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Activity, Building2, Cable, ReceiptText, Server } from 'lucide-react';
import {
    Badge,
    Button,
    Input,
    Label,
    Popover,
    PopoverContent,
    PopoverTrigger,
    SimpleSelect,
} from '@schemastud/ui';
import { createWidgetRegistry, type SchemaNode, type WidgetRegistry } from '@schemastud/seam';
import { FrameProvider } from '../context';
import { ListShell } from '../ListShell';
import { KNOWN_CONTEXTS, type ContextManifest } from '../contexts';
import type { FrameInjection, FramePrimitives, FrameTransport, Paginated, Row } from '../types';
import { registerCardWidgets, type DashboardRow, type IconResolver } from './index';

/**
 * Frame/Cards (realm-dashboards ticket 03). A `{realm}-dashboard` resource is a plain frame
 * list whose root `list-item` binds `dashboard-card`, so the list shell takes its CARDS path:
 * each row is dispatched to the TARGET resource's root `summary`/`overview` entry, jump-to
 * rows draw as nav tiles. Rendered here over a self-contained in-memory injection (this file
 * owns its harness — the shared `story-harness.tsx` has no `manifestFor` seam).
 *
 * TREATMENT axes (treatment-axes.md): the **states** axis — populated / empty / all-derived
 * (no target declares anything; the context defaults fire) / one-absent (a contributed card
 * names a resource this host does not mount, and drops). Ambient token + light⊗dark wired
 * globally. `density` rides the `--density-gap` token the grid reads.
 */
const meta = {
    title: 'Frame/Cards',
    parameters: { layout: 'padded' },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

// ── Fixture rows — what the realm-aware backing answers for `operator-dashboard` ──────────

const ACTIVITY_ITEMS: Row[] = [
    { id: 'e1', tenantName: 'Acme', message: 'Provisioned', state: 'complete' },
    { id: 'e2', tenantName: 'Globex', message: 'Suspended by operator', state: 'complete' },
    { id: 'e3', tenantName: 'Initech', message: 'Provisioning', state: 'running' },
];

const ROWS: DashboardRow[] = [
    {
        resource: 'tenants',
        context: 'summary',
        navOrder: 0,
        label: 'Tenants',
        icon: 'building',
        href: '/operator/tenants',
        summary: {
            key: 'tenants',
            label: 'Tenants',
            icon: 'building',
            figures: [
                { key: 'total', label: 'Total tenants', value: 42 },
                { key: 'active', label: 'Active', value: 37, tone: 'active' },
                { key: 'provisioning', label: 'Provisioning', value: 3, tone: 'busy' },
                { key: 'suspended', label: 'Suspended', value: 1, tone: 'warn' },
                { key: 'failed', label: 'Failed', value: 1, tone: 'danger' },
            ],
        },
    },
    {
        resource: 'bills',
        context: 'overview',
        navOrder: 1,
        label: 'Bills',
        icon: 'receipt',
        href: '/operator/bills',
        summary: {
            key: 'bills',
            label: 'Billing snapshot',
            icon: 'receipt',
            figures: [
                { key: 'draft', label: 'Draft', value: 4 },
                { key: 'finalized', label: 'Finalized', value: 11 },
                { key: 'paid', label: 'Paid', value: 27 },
            ],
            overview: {
                headline: { key: 'total', label: 'Period total', value: '$12,480' },
                items: [],
                period: 'Current period · 2026-09',
                note: 'Excludes voided bills',
            },
        },
    },
    {
        resource: 'activity',
        context: 'overview',
        navOrder: 2,
        label: 'Recent activity',
        icon: 'activity',
        href: '/operator/activity',
        summary: {
            key: 'activity',
            label: 'Recent activity',
            icon: 'activity',
            figures: [{ key: 'today', label: 'Events today', value: 3 }],
            overview: { items: ACTIVITY_ITEMS },
        },
    },
    { resource: 'operations', context: 'nav', navOrder: 3, label: 'Operations', icon: 'server', href: '/operator/operations', description: 'Platform actions', summary: null },
    { resource: 'conduits', context: 'nav', navOrder: 4, label: 'Conduits', icon: 'cable', href: '/operator/conduits', description: 'Provider catalogue', summary: null },
];

// ── Fixture manifests — the targets' root entries ─────────────────────────────────────────

const manifest = (root?: ContextManifest['byNode']['']): ContextManifest => ({
    byNode: root ? { '': root } : {},
    inherits: { overview: ['summary'] },
    known: KNOWN_CONTEXTS,
});

/** The dashboard resource itself: root `list-item` → `dashboard-card`. */
const DASHBOARD = manifest({ 'list-item': { participates: true, widget: 'dashboard-card' } });

/** Declared targets: tenants binds stat-row, bills declares an overview, activity binds recent-list + its own list-item. */
const DECLARED: Record<string, ContextManifest> = {
    'operator-dashboard': DASHBOARD,
    tenants: manifest({ summary: { participates: true, widget: 'stat-row' } }),
    bills: manifest({ summary: { participates: true }, overview: { participates: true } }),
    activity: manifest({
        'list-item': { participates: true, widget: 'activity-line' },
        overview: { participates: true, widget: 'recent-list' },
    }),
};

/** Nothing declared anywhere: every card is the context default for its row's context. */
const DERIVED: Record<string, ContextManifest> = {
    'operator-dashboard': DASHBOARD,
    tenants: manifest(),
    bills: manifest(),
    activity: manifest(),
};

// ── Harness ────────────────────────────────────────────────────────────────────────────────

const ICONS: Record<string, ComponentType<{ className?: string }>> = {
    building: Building2,
    receipt: ReceiptText,
    activity: Activity,
    server: Server,
    cable: Cable,
};
const iconFor: IconResolver = (name) => (name ? ICONS[name] : undefined);

/** The activity resource's own `list-item` rendering — what `recent-list` mounts per item. */
function ActivityLine({ value }: { value: Row }) {
    return (
        <div className="flex items-center justify-between gap-2 text-sm">
            <span className="truncate font-medium">{String(value.tenantName)}</span>
            <span className="truncate text-xs text-muted-foreground">{String(value.message)}</span>
        </div>
    );
}

const primitives: FramePrimitives = {
    Button,
    Input,
    Label,
    Badge,
    Popover,
    PopoverTrigger,
    PopoverContent,
    SimpleSelect,
    Skeleton: () => <div className="h-24 w-full animate-pulse rounded-md bg-muted" />,
    Table: ({ children }: { children?: ReactNode }) => <>{children}</>,
    SidePanel: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
};

function makeTransport(rows: Row[]): FrameTransport {
    return {
        list: (): Promise<Paginated<Row>> => Promise.resolve({ data: rows, total: rows.length, page: 1, perPage: 25 }),
        get: () => Promise.resolve({}),
        getFormSchema: () => Promise.resolve({ type: 'object' } as SchemaNode),
        save: (_r, id, data) => Promise.resolve({ id: id ?? 'new', ...(data as Row) }),
        remove: () => Promise.resolve(),
        getFilterSchema: () => Promise.resolve({ properties: {} }),
        getFilterVariants: (resource: string) => Promise.resolve({ resource, variants: [] }),
        getFilterOptions: () => Promise.resolve([]),
        getSavedFilters: () => Promise.resolve([]),
        saveFilter: (resource, payload) =>
            Promise.resolve({
                id: 'saved-1',
                name: payload.name,
                resource,
                query_parameters: payload.query_parameters,
                visibility: 'private',
                is_default: false,
            }),
        deleteSavedFilter: () => Promise.resolve(),
    } as FrameTransport;
}

function useMemoryUrlState() {
    const [params, setParams] = useState(() => new URLSearchParams());
    return [
        params,
        (updater: (prev: URLSearchParams) => URLSearchParams) =>
            setParams((prev) => updater(new URLSearchParams(prev))),
    ] as const;
}

function DashboardHarness({
    rows,
    manifests,
    registerWidgets,
}: {
    rows: DashboardRow[];
    manifests: Record<string, ContextManifest>;
    registerWidgets?: (registry: WidgetRegistry) => void;
}) {
    const queryClient = useMemo(
        () => new QueryClient({ defaultOptions: { queries: { retry: false, refetchOnWindowFocus: false } } }),
        [],
    );
    const injection = useMemo<FrameInjection>(() => {
        const registry = createWidgetRegistry();
        registerWidgets?.(registry);
        registerCardWidgets(registry, { iconFor });
        return {
            transport: makeTransport(rows as unknown as Row[]),
            primitives,
            useUrlState: useMemoryUrlState,
            registry,
            schemaFetcher: async (ref: string): Promise<SchemaNode> => ({ $id: ref }),
            can: () => true,
            manifestFor: (resource) => manifests[resource],
        };
        // Per-story literals; identity-stable for the story's life.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
        <QueryClientProvider client={queryClient}>
            <FrameProvider value={injection}>
                <ListShell
                    resource="operator-dashboard"
                    columns={[]}
                    manifest={manifests['operator-dashboard']}
                    slots={{ Filters: () => null, Toolbar: () => null }}
                    paginationPlacement="none"
                />
            </FrameProvider>
        </QueryClientProvider>
    );
}

const registerActivityLine = (registry: WidgetRegistry) =>
    registry.registerWidget((s) => s['x-widget'] === 'activity-line', ActivityLine);

const awaitCards: Story['play'] = async ({ canvasElement }) => {
    await within(canvasElement).findByText('Total tenants');
};

/** Populated — declared targets: a stat-row, a figure-card, a recent-list over the activity resource's own list-item, two nav tiles. */
export const Populated: Story = {
    render: () => <DashboardHarness rows={ROWS} manifests={DECLARED} registerWidgets={registerActivityLine} />,
    play: awaitCards,
};

/** Empty — the backing answered no rows (an actor who may list nothing): the shell's Empty slot, not a blank grid. */
export const Empty: Story = {
    render: () => <DashboardHarness rows={[]} manifests={DECLARED} />,
    play: async ({ canvasElement }) => {
        await within(canvasElement).findByText('No records.');
    },
};

/** All derived — no target declares a summary or overview: every card is its context default (stat-row / figure-card), the recent list falls to display names. */
export const AllDerived: Story = {
    render: () => <DashboardHarness rows={ROWS} manifests={DERIVED} />,
    play: awaitCards,
};

/** One absent — a contributed card names `ghost`, a resource this host does not mount: that row drops; nothing throws, the rest render. */
export const OneAbsent: Story = {
    render: () => (
        <DashboardHarness
            rows={[
                ROWS[0],
                { ...ROWS[0], resource: 'ghost', label: 'Ghost', href: '/operator/ghost' },
                ...ROWS.slice(1),
            ]}
            manifests={DECLARED}
            registerWidgets={registerActivityLine}
        />
    ),
    play: awaitCards,
};

/** viewport = mobile — the auto-fill grid collapses to one column. */
export const Mobile: Story = {
    parameters: { viewport: { defaultViewport: 'mobile1' } },
    render: () => <DashboardHarness rows={ROWS} manifests={DECLARED} registerWidgets={registerActivityLine} />,
    play: awaitCards,
};
