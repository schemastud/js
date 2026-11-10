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
import { useMemo, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { defaultPrimitives } from './primitives';
import {
    WidgetRegistryContext,
    createWidgetRegistry,
    type SchemaNode,
    type WidgetRegistry,
} from '@schemastud/seam';
import { FrameProvider } from './context';
import type { HeavyweightWidgetProps } from './WidgetShell';
import { createMemoryTransport, createMemoryUrlState, type MemoryTransportFixtures } from './testing';
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
    Row,
} from './types';

// ── Primitives ────────────────────────────────────────────────────────────────
// The workbench binding of frame's `FramePrimitives` seam: frame's default bundle, with the
// two overlays swapped for an inline panel so the shells read as panels in a story.

/** A bordered inline panel so EditShell's DefaultContainer reads as a docked side-panel in the catalog. */
function InlinePanel({
    children,
    open: _open,
    onOpenChange: _onOpenChange,
    title,
    ...rest
}: {
    children?: ReactNode;
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
    title?: string;
}) {
    // A Dialog-shaped call (an action's form, ADR-0005) hands `open`/`onOpenChange`/`title`; an inline
    // panel is always open, and the title reads as the panel's heading.
    return (
        <div
            {...rest}
            role={title ? 'dialog' : undefined}
            aria-label={title}
            className="rounded-lg border bg-card p-4 text-card-foreground shadow-sm"
            style={{ maxWidth: 480 }}
        >
            {title ? <div className="mb-3 text-sm font-semibold">{title}</div> : null}
            {children}
        </div>
    );
}

export const mockPrimitives: FramePrimitives = {
    ...defaultPrimitives,
    SidePanel: InlinePanel,
    Dialog: InlinePanel,
};

// ── Transport fixtures ──────────────────────────────────────────────────────────
/**
 * A story's fixtures: the memory transport's (`@schemastud/frame/testing`), over the demo
 * members, form schema and action schema below, plus the URL the story opens on.
 */
export type TransportFixtures = MemoryTransportFixtures & { initialQuery?: string };

const DEMO_MEMBERS: Row[] = [
    {
        id: '1',
        name: 'Ada Lovelace',
        email: 'ada@analytical.engine',
        role: 'owner',
        active: true,
    },
    {
        id: '2',
        name: 'Grace Hopper',
        email: 'grace@navy.mil',
        role: 'admin',
        active: true,
    },
    {
        id: '3',
        name: 'Alan Turing',
        email: 'alan@bletchley.uk',
        role: 'member',
        active: false,
    },
    {
        id: '4',
        name: 'Katherine Johnson',
        email: 'kj@nasa.gov',
        role: 'member',
        active: true,
    },
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

/** The demo transport: the memory transport over the demo members, schema and action, unless a fixture names its own. */
function demoTransport(fixtures: TransportFixtures = {}): FrameTransport {
    return createMemoryTransport({
        ...fixtures,
        rows: { '*': DEMO_MEMBERS, ...fixtures.rows },
        formSchema: { '*': DEMO_FORM_SCHEMA, ...fixtures.formSchema },
        actionSchema: { '*': DEMO_ACTION_SCHEMA, ...fixtures.actionSchema },
    });
}

const DEMO_ACTION_SCHEMA: SchemaNode = {
    type: 'object',
    title: 'Reload credits',
    required: ['amount_usd'],
    properties: {
        amount_usd: {
            type: 'number',
            title: 'Amount (USD)',
            description: 'How much credit to buy, in USD.',
            minimum: 1,
            maximum: 10000,
        },
    },
} as SchemaNode;

// A fresh QueryClient per story tree — no retry/refetch so fixture data is deterministic.
function makeQueryClient(): QueryClient {
    return new QueryClient({
        defaultOptions: {
            queries: { retry: false, refetchOnWindowFocus: false, gcTime: Infinity },
        },
    });
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
    /** Optional host notice sink (a toast); absent, the shells render an inline status region. */
    notify?: FrameInjection['notify'];
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
    notify,
}: MockFrameProviderProps) {
    const queryClient = useMemo(makeQueryClient, []);
    const injection = useMemo<FrameInjection>(() => {
        const registry = createWidgetRegistry();
        registerWidgets?.(registry);
        return {
            transport: demoTransport(fixtures),
            primitives: mockPrimitives,
            useUrlState: createMemoryUrlState(fixtures?.initialQuery),
            registry,
            schemaFetcher: async (ref: string): Promise<SchemaNode> => ({ $id: ref }) as SchemaNode,
            can,
            formResolver,
            ...(notify ? { notify } : {}),
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

/** The harness's full-surface editor, written to frame's heavyweight contract: it reads `readonly`. */
function DemoEditorWidget({ formData: record, readonly, editShellMount }: HeavyweightWidgetProps) {
    // Publish once onto the shared mount so the surrounding panes have content.
    const published = useMemo(() => {
        editShellMount?.publishCandidates([
            { nodeType: 'heading', label: 'Heading', category: 'block' },
            { nodeType: 'paragraph', label: 'Paragraph', category: 'block' },
        ]);
        editShellMount?.publishConformance(
            makeConformance({ requiredFilled: 3, incompleteNodeIds: ['s1'] }),
        );
        editShellMount?.registerNodeAccess({
            getNode: () => DEMO_NODE,
            setNodeAttrs: () => {},
        });
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
                A demo heavyweight editor canvas{readonly ? ' (read-only)' : ''}. In the product
                this is a blockdoc / circuit-graph widget mounted full-surface over the record.
            </p>
        </div>
    );
}

/** Register the demo heavyweight editor under a widget name a WidgetShell resolves. */
export function registerDemoEditor(name = 'demo-editor') {
    return (registry: WidgetRegistry) =>
        registry.registerWidget(name, DemoEditorWidget);
}
