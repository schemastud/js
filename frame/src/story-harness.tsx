/* eslint-disable */
// =============================================================================
// story-harness — the shared Storybook fixtures for the @schemastud/frame catalog
// (component-seams map, ticket 15). NOT part of the shipped package: tsup builds
// only the `index.ts` graph, so this file (imported solely by *.stories.tsx) never
// enters `dist`. It exists so every frame story renders the REAL shell against a
// realistic-but-in-memory injection instead of re-mocking the four-kind contract
// (transport · primitives · registry · can) per story.
//
// Two harnesses, one per injection family the frame surface splits into:
//   • <MockFrameProvider>  — the four-kind FrameInjection + a QueryClient, for the
//     data shells (ListShell / EditShell / WidgetShell / SchemaView / slot defaults).
//   • <MockMount> + makeMount — a static EditShellMountValue, for the mount-driven
//     edit panes (StatusBar / SavePill / Inspector / PalettePane / MissingSlots).
// =============================================================================
import { useMemo, useState, type ComponentType, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
    Badge,
    Button,
    Input,
    Label,
    Popover,
    PopoverContent,
    PopoverTrigger,
    SimpleSelect,
    cn,
} from '@schemastud/ui';
import {
    WidgetRegistryContext,
    createWidgetRegistry,
    type SchemaNode,
    type WidgetRegistry,
} from '@schemastud/seam';
import { FrameProvider } from './context';
import {
    EditShellMountProvider,
    type Conformance,
    type EditShellMountValue,
} from './EditShellMount';
import type {
    FormResolver,
    FrameCan,
    FrameInjection,
    FramePrimitives,
    FrameTransport,
    Paginated,
    Row,
} from './types';

// ── Primitives ────────────────────────────────────────────────────────────────
// The workbench binding of frame's `FramePrimitives` seam — the @schemastud/ui
// foundation set (the exact primitives the app binds in ui/src/frame/primitives.tsx),
// plus two workbench-local chrome primitives so the shells read as panels inline in a
// story (the app passes these through to its own Sheet/table chrome).

/** No standalone Skeleton primitive ships from foundation; a token-skinned shimmer covers the loading slot. */
function Skeleton({ className }: { className?: string }) {
    return <div className={cn('animate-pulse rounded-md bg-muted', className ?? 'h-24 w-full')} />;
}

/** A bordered inline panel so EditShell's DefaultContainer reads as a docked side-panel in the catalog. */
function InlinePanel({ children, ...rest }: { children?: ReactNode }) {
    return (
        <div
            {...rest}
            className="rounded-lg border bg-card p-4 text-card-foreground shadow-sm"
            style={{ maxWidth: 480 }}
        >
            {children}
        </div>
    );
}

/** A minimal inline table so the ListShell default renders without host chrome. */
const PlainTable: ComponentType<any> = ({ children }: { children?: ReactNode }) => (
    <>{children}</>
);

export const mockPrimitives: FramePrimitives = {
    Button,
    Input,
    Label,
    Badge,
    Popover,
    PopoverTrigger,
    PopoverContent,
    SimpleSelect,
    Skeleton,
    Table: PlainTable,
    SidePanel: InlinePanel,
    Dialog: InlinePanel,
};

// ── Transport fixtures ──────────────────────────────────────────────────────────
export interface TransportFixtures {
    /** Rows returned by `list` / `get`, keyed by resource. */
    rows?: Record<string, Row[]>;
    /** The form schema returned by `getFormSchema`, keyed by resource. */
    formSchema?: Record<string, SchemaNode>;
    /** Force `list` to resolve empty (the ListShell Empty state). */
    empty?: boolean;
    /** Never-resolving promises so the shell parks on its Loading state (deterministic). */
    loading?: boolean;
}

const DEMO_MEMBERS: Row[] = [
    { id: '1', name: 'Ada Lovelace', email: 'ada@analytical.engine', role: 'owner', active: true },
    { id: '2', name: 'Grace Hopper', email: 'grace@navy.mil', role: 'admin', active: true },
    { id: '3', name: 'Alan Turing', email: 'alan@bletchley.uk', role: 'member', active: false },
    { id: '4', name: 'Katherine Johnson', email: 'kj@nasa.gov', role: 'member', active: true },
];

const DEMO_FORM_SCHEMA: SchemaNode = {
    type: 'object',
    required: ['name', 'role'],
    properties: {
        name: { type: 'string', title: 'Name' },
        email: { type: 'string', title: 'Email', format: 'email' },
        role: { type: 'string', title: 'Role', enum: ['owner', 'admin', 'member'] },
        active: { type: 'boolean', title: 'Active' },
    },
} as SchemaNode;

const NEVER = new Promise<never>(() => {});

/** An in-memory `FrameTransport` — resolves list/get/schema from fixtures; save/remove echo. */
export function createMockTransport(fixtures: TransportFixtures = {}): FrameTransport {
    const rowsFor = (resource: string): Row[] =>
        fixtures.empty ? [] : (fixtures.rows?.[resource] ?? DEMO_MEMBERS);

    return {
        // CRUD
        list: (resource): Promise<Paginated<Row>> => {
            if (fixtures.loading) return NEVER;
            const data = rowsFor(resource);
            return Promise.resolve({ data, total: data.length, page: 1, perPage: 25 });
        },
        get: (resource, id) => {
            if (fixtures.loading) return NEVER;
            const row = rowsFor(resource).find((r) => String(r.id) === String(id));
            return Promise.resolve(row ?? {});
        },
        getFormSchema: (resource) => {
            if (fixtures.loading) return NEVER;
            return Promise.resolve(fixtures.formSchema?.[resource] ?? DEMO_FORM_SCHEMA);
        },
        save: (_resource, id, data) => Promise.resolve({ id: id ?? 'new', ...(data as Row) }),
        remove: () => Promise.resolve(),
        // Facets seam — minimal valid shapes so the filter bar mounts without error.
        getFilterSchema: () => Promise.resolve({ properties: {} }),
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
    };
}

// A fresh QueryClient per story tree — no retry/refetch so fixture data is deterministic.
function makeQueryClient(): QueryClient {
    return new QueryClient({
        defaultOptions: {
            queries: { retry: false, refetchOnWindowFocus: false, gcTime: Infinity },
        },
    });
}

/** react-router-free URL-state — a functional-setter over `useState`, matching the app's shape. */
function useMemoryUrlState() {
    const [params, setParams] = useState(() => new URLSearchParams());
    return [
        params,
        (updater: (prev: URLSearchParams) => URLSearchParams) =>
            setParams((prev) => updater(new URLSearchParams(prev))),
    ] as const;
}

export interface MockFrameProviderProps {
    children: ReactNode;
    fixtures?: TransportFixtures;
    /** Override the injected `can` (affordance gate). Defaults to allow-all. */
    can?: FrameCan;
    /** Register widgets onto the fresh registry (e.g. a demo heavyweight editor). */
    registerWidgets?: (registry: WidgetRegistry) => void;
    /** Optional canonical form resolver — for stories exercising the FormBody form-resolution seam. */
    formResolver?: FormResolver;
}

/**
 * The four-kind FrameInjection + a QueryClient, wired once. Every data-shell story
 * wraps in this instead of re-mocking the contract. A fresh registry/transport/client
 * per mount keeps stories isolated (Storybook remounts on args change).
 */
export function MockFrameProvider({
    children,
    fixtures,
    can = () => true,
    registerWidgets,
    formResolver,
}: MockFrameProviderProps) {
    const queryClient = useMemo(makeQueryClient, []);
    const injection = useMemo<FrameInjection>(() => {
        const registry = createWidgetRegistry();
        registerWidgets?.(registry);
        return {
            transport: createMockTransport(fixtures),
            primitives: mockPrimitives,
            useUrlState: useMemoryUrlState,
            registry,
            schemaFetcher: async (ref: string): Promise<SchemaNode> => ({ $id: ref }) as SchemaNode,
            can,
            formResolver,
        };
        // fixtures is a per-story literal; identity-stable across a story's life.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
        <QueryClientProvider client={queryClient}>
            <FrameProvider value={injection}>{children}</FrameProvider>
        </QueryClientProvider>
    );
}

// ── EditShellMount harness ──────────────────────────────────────────────────────
const NOOP = () => {};
const NOOP_UNSUB = () => () => {};

/**
 * A static EditShellMountValue for the mount-driven panes. Pass only the fields the
 * pane reads (`dirty`/`saving` for SavePill; `conformance` for StatusBar/MissingSlots;
 * `selectedNodeId`+`getNode` for the Inspector; `candidates` for the PalettePane); the
 * rest are inert no-ops. The panes are display-only readouts, so a frozen value is a
 * faithful catalog fixture (no controller/state machine needed for a snapshot).
 */
export function makeMount(overrides: Partial<EditShellMountValue> = {}): EditShellMountValue {
    return {
        selectedNodeId: null,
        selectNode: NOOP,
        revealNode: NOOP,
        registerRevealHandler: NOOP_UNSUB,
        dirty: false,
        markDirty: NOOP,
        saving: false,
        markSaving: NOOP,
        registerFlush: NOOP_UNSUB,
        flush: () => Promise.resolve(),
        candidates: [],
        publishCandidates: NOOP,
        registerInsertHandler: NOOP_UNSUB,
        insert: NOOP,
        registerNodeAccess: NOOP_UNSUB,
        getNode: () => null,
        setNodeAttrs: NOOP,
        conformance: null,
        publishConformance: NOOP,
        ...overrides,
    };
}

/**
 * Provide a mount value (and, for the Inspector's SchemaForm, a WidgetRegistry via
 * seam's context) to the mount-driven panes.
 */
export function MockMount({
    value,
    withRegistry = false,
    children,
}: {
    value: EditShellMountValue;
    withRegistry?: boolean;
    children: ReactNode;
}) {
    const registry = useMemo(() => createWidgetRegistry(), []);
    const tree = <EditShellMountProvider value={value}>{children}</EditShellMountProvider>;
    return withRegistry ? (
        <WidgetRegistryContext.Provider value={registry}>{tree}</WidgetRegistryContext.Provider>
    ) : (
        tree
    );
}

// A ready-made conformance fixture the StatusBar / MissingSlots stories reshape.
export function makeConformance(overrides: Partial<Conformance> = {}): Conformance {
    return {
        nodes: 12,
        requiredTotal: 4,
        requiredFilled: 4,
        grammarValid: true,
        incompleteNodeIds: [],
        requiredSlots: [],
        ...overrides,
    };
}

// ── Demo heavyweight editor ─────────────────────────────────────────────────────
// A stand-in for a real blockdoc/circuit-graph heavyweight widget, so the
// WidgetShell / WidgetSurface / FiveRegionEditShell stories mount a full-surface
// editor without depending on the real (much heavier) editors. It publishes onto the
// shared EditShellMount — candidates (→ PalettePane), conformance (→ StatusBar /
// MissingSlots) and a node (→ Inspector) — so the five-region shell renders populated
// panes, which is the whole point of cataloguing that shell.
const DEMO_NODE = {
    type: 'section',
    attrsSchema: {
        type: 'object',
        properties: {
            title: { type: 'string', title: 'Section title' },
            pinned: { type: 'boolean', title: 'Pinned' },
        },
    } as SchemaNode,
    attrs: { title: 'Overview', pinned: true },
};

interface DemoEditorProps {
    record?: Row;
    readOnly?: boolean;
    editShellMount?: EditShellMountValue;
}

function DemoEditorWidget({ record, readOnly, editShellMount }: DemoEditorProps) {
    // Publish once onto the shared mount so the surrounding panes have content.
    const published = useMemo(() => {
        editShellMount?.publishCandidates([
            { nodeType: 'heading', label: 'Heading', category: 'block' },
            { nodeType: 'paragraph', label: 'Paragraph', category: 'block' },
        ]);
        editShellMount?.publishConformance(makeConformance({ requiredFilled: 3, incompleteNodeIds: ['s1'] }));
        editShellMount?.registerNodeAccess({ getNode: () => DEMO_NODE, setNodeAttrs: () => {} });
        editShellMount?.selectNode('s1');
        return true;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
    void published;

    return (
        <div data-demo-editor="" className="rounded-md border bg-card p-4 text-sm">
            <div className="mb-2 font-medium text-card-foreground">
                {(record?.name as string) ?? 'Untitled record'}
            </div>
            <p className="text-muted-foreground">
                A demo heavyweight editor canvas{readOnly ? ' (read-only)' : ''}. In the product this is a
                blockdoc / circuit-graph widget mounted full-surface over the record.
            </p>
        </div>
    );
}

/** Register the demo heavyweight editor under a widget name a WidgetShell resolves. */
export function registerDemoEditor(name = 'demo-editor') {
    return (registry: WidgetRegistry) =>
        registry.registerWidget((s) => s['x-widget'] === name, DemoEditorWidget);
}
