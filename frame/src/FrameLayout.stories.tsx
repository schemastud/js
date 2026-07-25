import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState, type ReactNode } from 'react';
import {
    Badge,
    Button,
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@schemastud/ui';
import {
    FrameLayout,
    MasterDetail,
    SingleColumn,
    SubNavColumn,
    type FrameLayoutVariant,
} from './FrameLayout';

/**
 * The inner-layout family (component-seams map, tickets 02 → 05 → 09): the finite,
 * named set of content-region grammars any mainframe `main` slot hosts. Three plugs
 * (SingleColumn / SubNavColumn / MasterDetail) behind one `FrameLayout` socket.
 *
 * TREATMENTS catalogued here (ticket 02's sanctioned axes): the two-canvas axis
 * (flat settings paper ↔ dotted work surface), per-grammar widths, MasterDetail's
 * `presentation` prop (`inline | panel | sheet`), and the `collapse` policy. The
 * fillings shown are lightweight stand-ins — the real master is a Frame `ListShell`
 * (DataTable) and the real detail an `EditShell` (SchemaForm); those graduate with
 * their own catalog waves.
 *
 * STRUCTURAL cascade (ticket 36): the `canvas` axis is authored off the
 * `[data-canvas]` deployment-root attribute, not a hardcoded pattern — the `Canvas`
 * wrapper below sets `[data-canvas]`/`[data-density]` at a root wrapper and every
 * `FrameLayoutShell` beneath paints via `canvas-surface` off `--canvas-bg` (defined in
 * `.storybook/preview.css`). Setting the attribute at the root re-treats everything under
 * it with zero JS — the structural twin of the color-token cascade, and exactly the surface
 * a satellite overrides.
 *
 * VR PROOF (ticket 37): the `RootCascade` story below opts into the structural VR matrix
 * (`parameters.vr.canvas`) — it composes the real `canvas-surface` utility WITHOUT pinning
 * `[data-canvas]` itself, so the test-runner's root-level `[data-canvas=flat|dotted]` flip is
 * the only thing that treats it. That snapshot proves a satellite deployment-root override
 * reaches pixels; the six pinned stories above stay ambient-only (their wrapper pins the
 * attribute, so a root flip can't move them — correctly not opted in).
 */
const meta = {
    title: 'Frame/Inner Layout Family',
    parameters: { layout: 'fullscreen' },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

// ── Structural cascade — the deployment root (ticket 36) ──────────────────────
// The canvas axis is NOT hardcoded in the story: this wrapper stands in for the
// DEPLOYMENT ROOT, setting `[data-canvas]` (and optionally `[data-density]`) so the
// `FrameLayoutShell`s beneath re-treat off the cascade — `canvas-surface` reads
// `--canvas-bg` (defined in `.storybook/preview.css`, re-declarable by a satellite).
// flat = calm settings paper; dotted = work / operator surface. A satellite flips the
// whole surface by re-declaring the attribute at exactly this level.
function Canvas({
    variant,
    density,
    children,
}: {
    variant: 'flat' | 'dotted';
    density?: 'comfortable' | 'compact';
    children: ReactNode;
}) {
    return (
        <div
            className="canvas-surface min-h-[480px] w-full bg-background px-6 py-8"
            data-canvas={variant}
            data-density={density}
        >
            {children}
        </div>
    );
}

// ── Lightweight fillings (stand-ins for ListShell / EditShell) ────────────────
const SURFACES = [
    { id: 'billing', name: 'Tenant billing home', grammar: 'single' },
    { id: 'settings', name: 'Workspace settings', grammar: 'subnav' },
    { id: 'scaffold', name: 'Scaffold pack', grammar: 'master-detail' },
    { id: 'circuits', name: 'Circuit studio', grammar: 'master-detail' },
];

function Roster({
    activeId,
    onSelect,
}: {
    activeId: string | null;
    onSelect: (id: string) => void;
}) {
    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-base">Surfaces</CardTitle>
                <CardDescription className="font-mono text-[11px]">
                    master · selection roster (ListShell fills this)
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-1">
                {SURFACES.map((s) => (
                    <button
                        key={s.id}
                        type="button"
                        onClick={() => onSelect(s.id)}
                        aria-current={s.id === activeId ? 'true' : undefined}
                        className={
                            'flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm transition-colors ' +
                            (s.id === activeId
                                ? 'bg-accent text-accent-foreground'
                                : 'hover:bg-accent/50')
                        }
                    >
                        <span>{s.name}</span>
                        <Badge variant="secondary" className="font-mono text-[10px]">
                            {s.grammar}
                        </Badge>
                    </button>
                ))}
            </CardContent>
        </Card>
    );
}

function DetailCard({ id }: { id: string | null }) {
    const surface = SURFACES.find((s) => s.id === id);
    if (!surface) {
        return (
            <Card>
                <CardContent className="py-10 text-center text-sm text-muted-foreground">
                    Select a surface to edit its layout assignment.
                </CardContent>
            </Card>
        );
    }
    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-base">{surface.name}</CardTitle>
                <CardDescription className="font-mono text-[11px]">
                    detail · EditShell (SchemaForm) fills this
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="space-y-2 text-sm">
                    <div className="flex justify-between border-b pb-2">
                        <span className="text-muted-foreground">Grammar</span>
                        <span className="font-mono">{surface.grammar}</span>
                    </div>
                    <div className="flex justify-between border-b pb-2">
                        <span className="text-muted-foreground">Canvas</span>
                        <span className="font-mono">dotted</span>
                    </div>
                </div>
                <Button size="sm">Save assignment</Button>
            </CardContent>
        </Card>
    );
}

// ── PLUG 1 — SingleColumn (flat, 3xl reading column) ──────────────────────────
export const Single: Story = {
    name: 'SingleColumn (flat · 3xl)',
    render: () => (
        <Canvas variant="flat">
            <SingleColumn width="3xl">
                {['Budget & usage', 'Recent bills', 'Payment method'].map((title) => (
                    <Card key={title}>
                        <CardHeader>
                            <CardTitle className="text-base">{title}</CardTitle>
                            <CardDescription className="font-mono text-[11px]">
                                space-y-6 card stack · width-by-content
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="text-sm text-muted-foreground">
                            One object of attention as a vertical stack. No sub-nav, no roster.
                        </CardContent>
                    </Card>
                ))}
            </SingleColumn>
        </Canvas>
    ),
};

// ── PLUG 2 — SubNavColumn (flat, 5xl, sub-section nav) ────────────────────────
const SECTIONS = [
    { key: 'general', label: 'General' },
    { key: 'members', label: 'Members' },
    { key: 'privacy', label: 'Privacy & retention' },
    { key: 'billing', label: 'Billing' },
];

export const SubNav: Story = {
    name: 'SubNavColumn (flat · 5xl · settings)',
    render: () => {
        const [active, setActive] = useState('general');
        const section = SECTIONS.find((s) => s.key === active) ?? SECTIONS[0];
        return (
            <Canvas variant="flat">
                <SubNavColumn nav={SECTIONS} active={active} onSelect={setActive}>
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">{section.label}</CardTitle>
                            <CardDescription className="font-mono text-[11px]">
                                md:w-44 nav + flex-1 content · picks a sub-SECTION, not a record
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="text-sm text-muted-foreground">
                            Navigation within a surface — the Settings grammar.
                        </CardContent>
                    </Card>
                </SubNavColumn>
            </Canvas>
        );
    },
};

// ── PLUG 3 — MasterDetail, presentation="inline" (dotted, 6xl) ────────────────
export const MasterDetailInline: Story = {
    name: 'MasterDetail (dotted · inline)',
    render: () => {
        const [id, setId] = useState<string | null>('scaffold');
        return (
            <Canvas variant="dotted">
                <MasterDetail
                    presentation="inline"
                    master={<Roster activeId={id} onSelect={setId} />}
                    detail={<DetailCard id={id} />}
                />
            </Canvas>
        );
    },
};

// ── MasterDetail, presentation="panel" (persistent docked panel — image 8) ────
export const MasterDetailPanel: Story = {
    name: 'MasterDetail (dotted · panel)',
    render: () => {
        const [id, setId] = useState<string | null>('circuits');
        return (
            <Canvas variant="dotted">
                <MasterDetail
                    presentation="panel"
                    master={<Roster activeId={id} onSelect={setId} />}
                    detail={<DetailCard id={id} />}
                />
            </Canvas>
        );
    },
};

// ── MasterDetail, presentation="sheet" (transient overlay) ────────────────────
// Standalone fallback path: renders the foundation @schemastud/ui Sheet. In a
// beam-mainframe host, inject `SidePanel` (FramePrimitives.SidePanel) so the detail
// contributes into the mainframe overlay slot instead of nesting its own portal.
export const MasterDetailSheet: Story = {
    name: 'MasterDetail (dotted · sheet)',
    render: () => {
        const [id, setId] = useState<string | null>(null);
        const [open, setOpen] = useState(false);
        return (
            <Canvas variant="dotted">
                <MasterDetail
                    presentation="sheet"
                    sheetOpen={open}
                    onSheetOpenChange={setOpen}
                    sheetTitle="Layout assignment"
                    sheetDescription="Transient overlay · contributes into the mainframe overlay slot"
                    master={
                        <Roster
                            activeId={id}
                            onSelect={(next) => {
                                setId(next);
                                setOpen(true);
                            }}
                        />
                    }
                    detail={<DetailCard id={id} />}
                />
            </Canvas>
        );
    },
};

// ── The SOCKET — FrameLayout resolves `variant` → one plug ─────────────────────
type SocketStory = StoryObj<{ variant?: FrameLayoutVariant }>;

export const Socket: SocketStory = {
    name: 'FrameLayout socket (variant resolution)',
    argTypes: {
        variant: {
            control: 'select',
            options: ['single', 'subnav', 'master-detail'] satisfies FrameLayoutVariant[],
        },
    },
    args: { variant: 'master-detail' },
    render: (args) => {
        const variant = args.variant ?? 'single';
        const [id, setId] = useState<string | null>('scaffold');
        const [active, setActive] = useState('general');
        const canvas = variant === 'master-detail' ? 'dotted' : 'flat';

        if (variant === 'subnav') {
            const section = SECTIONS.find((s) => s.key === active) ?? SECTIONS[0];
            return (
                <Canvas variant={canvas}>
                    <FrameLayout variant="subnav" nav={SECTIONS} active={active} onSelect={setActive}>
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-base">{section.label}</CardTitle>
                            </CardHeader>
                            <CardContent className="text-sm text-muted-foreground">
                                Resolved through the socket registry map.
                            </CardContent>
                        </Card>
                    </FrameLayout>
                </Canvas>
            );
        }
        if (variant === 'master-detail') {
            return (
                <Canvas variant={canvas}>
                    <FrameLayout
                        variant="master-detail"
                        master={<Roster activeId={id} onSelect={setId} />}
                        detail={<DetailCard id={id} />}
                    />
                </Canvas>
            );
        }
        return (
            <Canvas variant={canvas}>
                <FrameLayout variant="single" width="3xl">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">SingleColumn</CardTitle>
                            <CardDescription className="font-mono text-[11px]">
                                the socket's generic fallback
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="text-sm text-muted-foreground">
                            An unknown variant degrades here, too.
                        </CardContent>
                    </Card>
                </FrameLayout>
            </Canvas>
        );
    },
};

// ── ROOT CASCADE — the satellite deployment-root proof (ticket 37) ────────────
// This story composes the real `canvas-surface` utility but deliberately does NOT set
// `[data-canvas]` on any wrapper — the surface reads `--canvas-bg` off the cascade, so the
// treatment can only be supplied from an ANCESTOR. `parameters.vr.canvas` opts it into the
// structural VR matrix: the test-runner flips `[data-canvas=flat|dotted]` on the DEPLOYMENT
// ROOT (documentElement) and screenshots each, proving a satellite-style root override
// re-treats a component that never declared the attribute itself. Unlike the six stories
// above (which pin canvas on their own `Canvas` wrapper and so stay ambient-only), this is
// the one surface a root-level flip actually moves.
export const RootCascade: Story = {
    name: 'Root cascade (satellite [data-canvas] proof · VR)',
    parameters: { vr: { canvas: true } },
    render: () => (
        <div className="canvas-surface min-h-[480px] w-full bg-background px-6 py-8">
            <SingleColumn width="3xl">
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">Root-driven canvas</CardTitle>
                        <CardDescription className="font-mono text-[11px]">
                            canvas-surface · no local [data-canvas] · treated only by the root
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="text-sm text-muted-foreground">
                        The dotted work-surface here is painted by a root-level{' '}
                        <code>[data-canvas=dotted]</code> override — the same channel a satellite
                        re-declares at its deployment root. Flip it to <code>flat</code> and this
                        surface goes calm, with zero changes to this component.
                    </CardContent>
                </Card>
            </SingleColumn>
        </div>
    ),
};
