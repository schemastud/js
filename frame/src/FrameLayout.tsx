// =============================================================================
// FrameLayout — the inner-layout family (component-seams map, ticket 05 → 09).
//
// The base set of content-region layouts any mainframe `main` slot hosts. It is a
// REGISTRY, per canon `the-seam-is-a-registry` (uniformity is a property of the
// socket, never the plug) + `resolution-by-intent-is-the-core-primitive`:
//
//   • SOCKET (uniform):  <FrameLayout variant=… > — one resolution face, `pick-one`
//     arity, resolves `variant` to a named plug via a registry MAP (not a switch)
//     with a `SingleColumn` generic fallback. Rhymes with <Mainframe mode=…> exactly
//     (Mainframe resolves *slots* by mode; FrameLayout resolves *one grammar* by
//     variant). It is NOT a nested mainframe — the mainframe `main` slot is a
//     render-prop with zero layout constraints, so FrameLayout is simply content
//     rendered inside `main`.
//   • PLUGS (non-uniform):  SingleColumn / SubNavColumn / MasterDetail — three
//     components with honest, divergent props (`presentation`/`collapse` exist only
//     on MasterDetail). Directly importable + tree-shakeable for hand-authored
//     surfaces.
//   • SHARED BASE:  FrameLayoutShell holds the cross-cutting axes (max-width +
//     centering) all three plugs compose — width/centering live in ONE place.
//
// The finite grammar set + every measured width/class is ticket 02's catalog
// (content-page-grammars.md), mined from the 24 admin-redesign prototypes; the
// factoring decision is ticket 05's resolution. ListShell fills a MasterDetail
// master; EditShell (`container="panel"`) fills its detail — they plug IN, the
// grammar owns the grid.
// =============================================================================

import {
    useEffect,
    useState,
    type ComponentType,
    type ReactNode,
} from 'react';
import {
    cn,
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
} from '@schemastud/ui';

// -----------------------------------------------------------------------------
// Shared axis — width. `SingleColumn`'s width follows its content (ticket 02 §1),
// the others carry a grammar default (SubNavColumn `5xl`, MasterDetail `6xl`).
// -----------------------------------------------------------------------------
export type FrameLayoutWidth = '3xl' | '4xl' | '5xl' | '6xl';

const WIDTH: Record<FrameLayoutWidth, string> = {
    '3xl': 'max-w-3xl',
    '4xl': 'max-w-4xl',
    '5xl': 'max-w-5xl',
    '6xl': 'max-w-6xl',
};

/**
 * Canvas — the flat/dotted background treatment (ticket 02 §3: MasterDetail is the
 * "dotted" grammar; SingleColumn/SubNavColumn are flat). Authored as the STRUCTURAL
 * cascade twin of the color tokens (ticket 36 / apocryphon
 * `satellite-re-treatment-is-a-deployment-root-cascade`): a plug states its grammar
 * DEFAULT by setting `[data-canvas]` on its own container and painting via the
 * `canvas-surface` utility, which reads `--canvas-bg` off the cascade. It never
 * hardcodes a `dotted-bg` pattern — so a deployment root (or satellite) that sets
 * `[data-canvas]` higher up re-treats it with zero JS.
 */
export type FrameLayoutCanvas = 'flat' | 'dotted';

/**
 * SHARED BASE — the one place width + centering (+ the canvas axis) live; every plug
 * composes it. A bare centered, width-capped, `space-y-6`-stacked container. Exposed
 * so a host authoring a fourth surface stays inside the family's width/canvas
 * vocabulary. `canvas` is authored cascade-reachable: it sets the `data-canvas`
 * attribute (an override surface a satellite re-declares at the root) and paints via
 * `canvas-surface` off `--canvas-bg` — no hardcoded background pattern.
 */
export function FrameLayoutShell({
    width = '5xl',
    canvas,
    className,
    children,
}: {
    width?: FrameLayoutWidth;
    canvas?: FrameLayoutCanvas;
    className?: string;
    children: ReactNode;
}) {
    return (
        <div
            className={cn('mx-auto space-y-6', WIDTH[width], canvas && 'canvas-surface', className)}
            data-frame-layout-shell
            data-canvas={canvas}
        >
            {children}
        </div>
    );
}

// =============================================================================
// PLUG 1 — SingleColumn (ticket 02 §1)
// One object of attention as a vertical stack. No sub-nav, no roster, no second
// pane; secondary interactions ride overlays, never a persistent second column.
// Width follows content (`3xl` reading column ↔ `5xl` wide cards).
// =============================================================================
export interface SingleColumnProps {
    width?: FrameLayoutWidth;
    className?: string;
    children: ReactNode;
}

export function SingleColumn({ width = '3xl', className, children }: SingleColumnProps) {
    return (
        <FrameLayoutShell width={width} className={className}>
            <div className="space-y-6" data-grammar="single">
                {children}
            </div>
        </FrameLayoutShell>
    );
}

// =============================================================================
// PLUG 2 — SubNavColumn (ticket 02 §2, the Settings grammar)
// A left section-nav column beside a `flex-1` content region. Navigation WITHIN a
// surface — the left column picks a sub-SECTION, not a record (that distinction is
// what separates it from MasterDetail). Collapses to a horizontal scroller below
// the breakpoint.
// =============================================================================
export interface SubNavItem {
    key: string;
    label: string;
}

export interface SubNavColumnProps {
    nav: SubNavItem[];
    active: string;
    onSelect: (key: string) => void;
    children: ReactNode;
    width?: FrameLayoutWidth;
    className?: string;
}

export function SubNavColumn({
    nav,
    active,
    onSelect,
    children,
    width = '5xl',
    className,
}: SubNavColumnProps) {
    return (
        <FrameLayoutShell width={width} className={className}>
            <div className="flex flex-col gap-6 md:flex-row" data-grammar="subnav">
                <nav className="flex gap-1 overflow-x-auto md:w-44 md:flex-none md:flex-col">
                    {nav.map((item) => (
                        <button
                            key={item.key}
                            type="button"
                            onClick={() => onSelect(item.key)}
                            aria-current={item.key === active ? 'page' : undefined}
                            className={cn(
                                'whitespace-nowrap rounded-md px-3 py-1.5 text-left text-[13px] font-medium transition-colors',
                                item.key === active
                                    ? 'bg-accent text-accent-foreground'
                                    : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground',
                            )}
                        >
                            {item.label}
                        </button>
                    ))}
                </nav>
                <div className="min-w-0 flex-1">{children}</div>
            </div>
        </FrameLayoutShell>
    );
}

// =============================================================================
// PLUG 3 — MasterDetail (ticket 02 §3)
// A persistent master roster/list ⇄ a detail region for the selected record. The
// detail's presentation is a PROP, not a layout fork — this is what folds the
// mining pass's three master-detail-ish groupings into one grammar.
// =============================================================================

/**
 * How the detail region is presented (ticket 02 §3 / ticket 05):
 *  • `inline` — side-by-side, always visible; detail sticks on scroll.
 *  • `panel`  — a persistent first-class docked panel that stays open (image 8 /
 *    scaffold-pack); the owner-preferred shape. Does not displace the master.
 *  • `sheet`  — a TRANSIENT overlay, docked right, dismissible. Per ticket 05 it
 *    CONTRIBUTES into the mainframe `overlay` slot rather than inventing a second
 *    overlay path: when the host injects a `SidePanel` (bind to
 *    `FramePrimitives.SidePanel` — ticket 03's Layer-2 slot, which the mainframe
 *    wires to its Layer-3 `overlay` core slot), the detail routes through it and
 *    does NOT nest its own portal. Absent a host `SidePanel` (standalone / Storybook)
 *    it falls back to the foundation `@schemastud/ui` Sheet.
 */
export type DetailPresentation = 'inline' | 'panel' | 'sheet';

/**
 * Responsive-collapse policy (orthogonal to `presentation`, ticket 02 cross-cutting
 * axes): below `breakpoint` the two panes fold to one column, either
 *  • `stack` — detail stacks under the master (works everywhere; the default), or
 *  • `sheet` — detail detaches into a right Sheet (ar22), reusing the same overlay
 *    path as `presentation="sheet"`.
 */
export type CollapseMode = 'stack' | 'sheet';

/**
 * The host overlay a `sheet` detail routes through. Bind to
 * `FramePrimitives.SidePanel`; the mainframe contributes it into its `overlay` core
 * slot so the sheet does not nest its own portal (ticket 03/05).
 */
export type FrameLayoutSidePanel = ComponentType<{
    open: boolean;
    onOpenChange: (open: boolean) => void;
    title?: ReactNode;
    children: ReactNode;
}>;

export interface MasterDetailProps {
    master: ReactNode;
    detail: ReactNode;
    /** Detail presentation (default `inline`). See {@link DetailPresentation}. */
    presentation?: DetailPresentation;
    /** Below-breakpoint fold policy (default `stack`). See {@link CollapseMode}. */
    collapse?: CollapseMode;
    /** The fold breakpoint (default `md`). `lg` for the wider two-pane grammars. */
    breakpoint?: 'md' | 'lg';
    width?: FrameLayoutWidth;
    /**
     * Canvas treatment (default `dotted` — MasterDetail is ticket 02 §3's dotted
     * grammar). Authored off the `[data-canvas]` cascade; a satellite re-defaults it
     * per-deployment by setting the attribute at the root. See {@link FrameLayoutCanvas}.
     */
    canvas?: FrameLayoutCanvas;
    className?: string;
    /**
     * Whether the detail sheet is open. Used only by the `sheet` overlay path
     * (`presentation="sheet"`, or `collapse="sheet"` once folded). Controlled when
     * provided; uncontrolled otherwise (opens whenever `detail` is non-null). Ignored
     * by the inline/panel presentations, which are always visible.
     */
    sheetOpen?: boolean;
    onSheetOpenChange?: (open: boolean) => void;
    /** Accessible title for the detail sheet (overlay path only). */
    sheetTitle?: ReactNode;
    sheetDescription?: ReactNode;
    /**
     * Host overlay for the `sheet` path — bind to `FramePrimitives.SidePanel` so the
     * detail contributes into the mainframe `overlay` slot instead of a self-portaling
     * foundation Sheet (ticket 05). Absent, the `@schemastud/ui` Sheet is used.
     */
    SidePanel?: FrameLayoutSidePanel;
}

/**
 * SSR-safe `min-width` match. Defaults to `true` (desktop / two-pane) on the server
 * and the first client paint, then reconciles on mount — so the two-pane layout is
 * the default and a narrow viewport folds after hydration, never the other way
 * (avoids a desktop flash-of-single-column).
 */
function useIsAtLeast(breakpoint: 'md' | 'lg'): boolean {
    const query = breakpoint === 'lg' ? '(min-width: 1024px)' : '(min-width: 768px)';
    const [matches, setMatches] = useState(true);
    useEffect(() => {
        if (typeof window === 'undefined' || !window.matchMedia) return;
        const mql = window.matchMedia(query);
        const sync = () => setMatches(mql.matches);
        sync();
        mql.addEventListener('change', sync);
        return () => mql.removeEventListener('change', sync);
    }, [query]);
    return matches;
}

/** Render the detail in the sheet overlay — host `SidePanel` if injected, else foundation Sheet. */
function DetailSheet({
    open,
    onOpenChange,
    title,
    description,
    SidePanel,
    children,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    title?: ReactNode;
    description?: ReactNode;
    SidePanel?: FrameLayoutSidePanel;
    children: ReactNode;
}) {
    if (SidePanel) {
        // Contributes into the mainframe `overlay` slot (ticket 03 Layer-2 → Layer-3):
        // the host owns the portal; we do not nest one.
        return (
            <SidePanel open={open} onOpenChange={onOpenChange} title={title}>
                {children}
            </SidePanel>
        );
    }
    // Standalone / Storybook fallback: the foundation Sheet (its own Radix portal).
    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent side="right" className="sm:max-w-md">
                {(title || description) && (
                    <SheetHeader>
                        {title ? <SheetTitle>{title}</SheetTitle> : null}
                        {description ? <SheetDescription>{description}</SheetDescription> : null}
                    </SheetHeader>
                )}
                {children}
            </SheetContent>
        </Sheet>
    );
}

export function MasterDetail({
    master,
    detail,
    presentation = 'inline',
    collapse = 'stack',
    breakpoint = 'md',
    width = '6xl',
    canvas = 'dotted',
    className,
    sheetOpen,
    onSheetOpenChange,
    sheetTitle,
    sheetDescription,
    SidePanel,
}: MasterDetailProps) {
    const wide = useIsAtLeast(breakpoint);

    // The overlay is engaged either explicitly (`presentation="sheet"`) or by a
    // folded `collapse="sheet"` below the breakpoint. Both reuse one Sheet path.
    const sheetByPresentation = presentation === 'sheet';
    const sheetByCollapse = collapse === 'sheet' && !wide;
    const overlayDetail = sheetByPresentation || sheetByCollapse;

    // Uncontrolled open state tracks the presence of a detail; a controlled
    // `sheetOpen` (with `onSheetOpenChange`) overrides it.
    const [selfOpen, setSelfOpen] = useState(false);
    const open = sheetOpen ?? (selfOpen && detail != null);
    const setOpen = (next: boolean) => {
        setSelfOpen(next);
        onSheetOpenChange?.(next);
    };
    // Open the uncontrolled sheet whenever a detail arrives for an overlay presentation.
    useEffect(() => {
        if (sheetOpen === undefined && overlayDetail && detail != null) setSelfOpen(true);
    }, [sheetOpen, overlayDetail, detail]);

    const twoCol =
        breakpoint === 'lg' ? 'lg:grid-cols-[1.35fr_1fr]' : 'md:grid-cols-[300px_1fr]';
    // `panel` is a first-class docked panel (does not stick); `inline` sticks on scroll.
    const detailSticky = presentation === 'panel' ? '' : 'lg:sticky lg:top-2';

    // Overlay presentations render only the master in-flow; the detail lives in the sheet.
    if (overlayDetail) {
        return (
            <FrameLayoutShell width={width} canvas={canvas} className={className}>
                <section
                    className="min-w-0 space-y-3"
                    data-grammar="master-detail"
                    data-detail="sheet"
                >
                    {master}
                </section>
                <DetailSheet
                    open={open}
                    onOpenChange={setOpen}
                    title={sheetTitle}
                    description={sheetDescription}
                    SidePanel={SidePanel}
                >
                    {detail}
                </DetailSheet>
            </FrameLayoutShell>
        );
    }

    // inline / panel: two columns above the breakpoint; `collapse="stack"` folds to
    // one column below it (detail stacks under master — pure CSS, no overlay).
    return (
        <FrameLayoutShell width={width} canvas={canvas} className={className}>
            <div
                className={cn('grid grid-cols-1 gap-6', twoCol)}
                data-grammar="master-detail"
                data-detail={presentation}
                data-collapse={collapse}
            >
                <section className="min-w-0 space-y-3">{master}</section>
                <section className={cn('space-y-3', detailSticky)}>{detail}</section>
            </div>
        </FrameLayoutShell>
    );
}

// =============================================================================
// SOCKET — FrameLayout. The uniform resolution face over the three plugs.
//
// `pick-one` arity: `variant` resolves to exactly one plug through a registry MAP
// (not a switch) with a `SingleColumn` generic fallback for an unknown variant. The
// remaining props are the chosen plug's own props (a discriminated union at the call
// site). This is the data/manifest-driven entry point: a host that stores a layout
// on a resource's manifest resolves it by passing `variant={manifest.layout ?? undefined}`.
// `ContextManifest.layout` is the wire field (ticket 31, off `#[AdminResource(layout: …)]`);
// a null/absent layout degrades to the SingleColumn fallback below, so a host may pass it
// unconditionally.
// =============================================================================
export type FrameLayoutVariant = 'single' | 'subnav' | 'master-detail';

const LAYOUT_REGISTRY: Record<FrameLayoutVariant, ComponentType<any>> = {
    single: SingleColumn,
    subnav: SubNavColumn,
    'master-detail': MasterDetail,
};

export type FrameLayoutProps =
    // The MANIFEST-DRIVEN arm (ticket 31): a `variant` resolved from data — the
    // `ContextManifest.layout` wire field, whose static type is the whole (nullable)
    // variant union. It targets the SingleColumn family because that grammar requires no
    // grammar-specific props, so it's the type-safe home for a not-statically-known
    // variant; a `subnav`/`master-detail` value still resolves its plug at runtime via the
    // registry (those grammars degrade gracefully — their extra props are optional here),
    // and a null/undefined/unknown value falls back to SingleColumn. This is what makes
    // `<FrameLayout variant={manifest.layout ?? undefined} …>` typecheck.
    | ({ variant?: FrameLayoutVariant | null } & SingleColumnProps)
    // The STATICALLY-KNOWN arms: a host that hard-codes the grammar gets that plug's full,
    // honest prop contract (SubNavColumn's `nav`/`active`/`onSelect`, MasterDetail's
    // `master`/`detail`) type-checked at the call site.
    | ({ variant: 'subnav' } & SubNavColumnProps)
    | ({ variant: 'master-detail' } & MasterDetailProps);

export function FrameLayout({ variant, ...rest }: FrameLayoutProps) {
    // Registry lookup with a generic fallback — a null/undefined/unknown variant degrades
    // to SingleColumn rather than throwing (resolution-by-intent: the socket always
    // resolves *something*). This is the null→SingleColumn manifest fallback (ticket 09/31).
    const Plug = LAYOUT_REGISTRY[variant as FrameLayoutVariant] ?? SingleColumn;
    return <Plug {...(rest as Record<string, unknown>)} />;
}
