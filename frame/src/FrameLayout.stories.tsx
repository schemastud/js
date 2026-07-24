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
 */
const meta = {
    title: 'Frame/Inner Layout Family',
    parameters: { layout: 'fullscreen' },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

// ── Canvas treatment axis ─────────────────────────────────────────────────────
// flat = calm settings paper (`bg-background`); dotted = work / operator surface.
// The dotted texture is inlined (not an app utility) so the story is self-contained.
function Canvas({ variant, children }: { variant: 'flat' | 'dotted'; children: ReactNode }) {
    return (
        <div
            className="min-h-[480px] w-full bg-background px-6 py-8"
            style={
                variant === 'dotted'
                    ? {
                          backgroundImage:
                              'radial-gradient(circle, color-mix(in oklch, currentColor 12%, transparent) 1px, transparent 1px)',
                          backgroundSize: '16px 16px',
                      }
                    : undefined
            }
            data-canvas={variant}
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
