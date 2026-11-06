import { ClassValue } from 'clsx';
import * as class_variance_authority_types from 'class-variance-authority/types';
import { VariantProps } from 'class-variance-authority';
import * as React from 'react';
import { ReactNode, ComponentType } from 'react';
import * as SwitchPrimitive from '@radix-ui/react-switch';
import * as SheetPrimitive from '@radix-ui/react-dialog';
import * as SelectPrimitive from '@radix-ui/react-select';
import * as SeparatorPrimitive from '@radix-ui/react-separator';
import * as TooltipPrimitive from '@radix-ui/react-tooltip';
import { ColumnDef } from '@tanstack/react-table';

/** Merge conditional class lists, de-duplicating conflicting Tailwind utilities. */
declare function cn(...inputs: ClassValue[]): string;

/**
 * The sort vocabulary the DataTable's sortable column headers read and write.
 *
 * A sort is an ordered list of keys, each `field` (ascending) or `-field`
 * (descending), serialized as a single comma-joined `sort` query param — e.g.
 * `sort=-createdAt,name` = createdAt descending then name ascending. This is exactly
 * the shape Spatie query-builder parses, so header state round-trips through one URL
 * param and can never define a competing mechanism.
 *
 * NOTE — shared vocabulary, two homes. This is a byte-for-byte copy of the vocabulary
 * that also lives in `@schemastud/facets` (the facets-bar Sort control). It is copied,
 * not imported, on purpose: `@schemastud/ui` is a lean foundation-primitives package and
 * must not depend on a higher-level *surface* package (facets peer-requires react-query),
 * which would pull that graph into every consumer of a `Button`. These four pure,
 * stable functions are a settled vocabulary; the tiny duplication is the deliberate cost
 * of keeping the primitives package dependency-clean. If the vocabulary ever needs to
 * change, change both — or graduate it into a shared leaf atom (fog for ticket 07).
 */
interface SortKey {
    /** The `x-sort` field name (never prefixed). */
    field: string;
    desc: boolean;
}
/** Parse a comma-joined `sort` param into its ordered keys. Empty/null → []. */
declare function parseSort(sort: string | null | undefined): SortKey[];
/** Serialize ordered keys back to the comma-joined param. Empty → null (clears it). */
declare function serializeSort(keys: SortKey[]): string | null;
/**
 * Apply a header click to the current keys and return the next ordered list.
 *
 * - Plain click: the field becomes the *sole* sort, cycling asc → desc → cleared
 *   when it's already the only active key; otherwise it replaces the whole sort.
 * - Shift-click (`append`): the field joins/updates the ordered list without
 *   dropping the others, cycling asc → desc → removed in place — its ordinal
 *   position is preserved across the asc→desc toggle.
 */
declare function toggleSortKey(keys: SortKey[], field: string, append: boolean): SortKey[];
/** The current sort state for one field, for rendering its header affordance. */
declare function sortStateFor(keys: SortKey[], field: string): {
    active: boolean;
    desc: boolean;
    index: number;
};

declare const buttonVariants: (props?: ({
    variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link" | null | undefined;
    size?: "default" | "sm" | "lg" | "icon" | null | undefined;
} & class_variance_authority_types.ClassProp) | undefined) => string;
declare function Button({ className, variant, size, ...props }: React.ComponentProps<'button'> & VariantProps<typeof buttonVariants>): React.JSX.Element;

/**
 * C40 (UX04) — a composable mobile hit-target floor, the single source of truth for the 44px rule.
 *
 * Add it to any small icon/chip control (via the control's own `className`, whatever its element —
 * `<button>`, `<a>`, a pill). It leaves the control's visual footprint AND the surrounding layout
 * unchanged: the expansion is an `absolute`, paint-free `::before` overlay, so it adds no layout box
 * and no pixels. Below the 768px (`md`) breakpoint it widens the INTERACTIVE target to 44×44; at
 * desktop width `md:before:hidden` removes it entirely, so the desktop footprint is provably unchanged.
 * The control keeps its own size/variant classes, its native keyboard behaviour, and its accessible
 * name. The shared {@link Button} `icon` size composes this same constant — do not duplicate the tokens.
 */
declare const hitTargetFloor = "relative before:absolute before:left-1/2 before:top-1/2 before:size-11 before:-translate-x-1/2 before:-translate-y-1/2 before:content-[\"\"] md:before:hidden";

declare const badgeVariants: (props?: ({
    variant?: "default" | "destructive" | "outline" | "secondary" | null | undefined;
} & class_variance_authority_types.ClassProp) | undefined) => string;
declare function Badge({ className, variant, ...props }: React.ComponentProps<'span'> & VariantProps<typeof badgeVariants>): React.JSX.Element;

declare function Switch({ className, ...props }: React.ComponentProps<typeof SwitchPrimitive.Root>): React.JSX.Element;

declare function Card({ className, ...props }: React.ComponentProps<'div'>): React.JSX.Element;
declare function CardHeader({ className, ...props }: React.ComponentProps<'div'>): React.JSX.Element;
declare function CardTitle({ className, ...props }: React.ComponentProps<'div'>): React.JSX.Element;
declare function CardDescription({ className, ...props }: React.ComponentProps<'div'>): React.JSX.Element;
declare function CardContent({ className, ...props }: React.ComponentProps<'div'>): React.JSX.Element;
declare function CardFooter({ className, ...props }: React.ComponentProps<'div'>): React.JSX.Element;

declare const Dialog: React.FC<SheetPrimitive.DialogProps>;
declare const DialogTrigger: React.ForwardRefExoticComponent<SheetPrimitive.DialogTriggerProps & React.RefAttributes<HTMLButtonElement>>;
declare const DialogClose: React.ForwardRefExoticComponent<SheetPrimitive.DialogCloseProps & React.RefAttributes<HTMLButtonElement>>;
declare function DialogContent({ className, children, ...props }: React.ComponentProps<typeof SheetPrimitive.Content>): React.JSX.Element;
declare function DialogHeader({ className, ...props }: React.ComponentProps<'div'>): React.JSX.Element;
declare function DialogFooter({ className, ...props }: React.ComponentProps<'div'>): React.JSX.Element;
declare function DialogTitle({ className, ...props }: React.ComponentProps<typeof SheetPrimitive.Title>): React.JSX.Element;
declare function DialogDescription({ className, ...props }: React.ComponentProps<typeof SheetPrimitive.Description>): React.JSX.Element;

declare const Sheet: React.FC<SheetPrimitive.DialogProps>;
declare const SheetTrigger: React.ForwardRefExoticComponent<SheetPrimitive.DialogTriggerProps & React.RefAttributes<HTMLButtonElement>>;
declare const SheetClose: React.ForwardRefExoticComponent<SheetPrimitive.DialogCloseProps & React.RefAttributes<HTMLButtonElement>>;
declare const SheetPortal: React.FC<SheetPrimitive.DialogPortalProps>;
type SheetSide = 'right' | 'left' | 'top' | 'bottom';
declare function SheetContent({ className, children, side, ...props }: React.ComponentProps<typeof SheetPrimitive.Content> & {
    side?: SheetSide;
}): React.JSX.Element;
declare function SheetHeader({ className, ...props }: React.ComponentProps<'div'>): React.JSX.Element;
declare function SheetFooter({ className, ...props }: React.ComponentProps<'div'>): React.JSX.Element;
declare function SheetTitle({ className, ...props }: React.ComponentProps<typeof SheetPrimitive.Title>): React.JSX.Element;
declare function SheetDescription({ className, ...props }: React.ComponentProps<typeof SheetPrimitive.Description>): React.JSX.Element;

declare function Input({ className, type, ...props }: React.ComponentProps<'input'>): React.JSX.Element;

declare function Textarea({ className, ...props }: React.ComponentProps<'textarea'>): React.JSX.Element;

declare function Label({ className, ...props }: React.ComponentProps<'label'>): React.JSX.Element;

declare const Select: React.FC<SelectPrimitive.SelectProps>;
declare const SelectGroup: React.ForwardRefExoticComponent<SelectPrimitive.SelectGroupProps & React.RefAttributes<HTMLDivElement>>;
declare const SelectValue: React.ForwardRefExoticComponent<SelectPrimitive.SelectValueProps & React.RefAttributes<HTMLSpanElement>>;
declare function SelectTrigger({ className, children, ...props }: React.ComponentProps<typeof SelectPrimitive.Trigger>): React.JSX.Element;
declare function SelectContent({ className, children, position, ...props }: React.ComponentProps<typeof SelectPrimitive.Content>): React.JSX.Element;
declare function SelectItem({ className, children, ...props }: React.ComponentProps<typeof SelectPrimitive.Item>): React.JSX.Element;
declare function SelectLabel({ className, ...props }: React.ComponentProps<typeof SelectPrimitive.Label>): React.JSX.Element;
declare function SelectSeparator({ className, ...props }: React.ComponentProps<typeof SelectPrimitive.Separator>): React.JSX.Element;
interface SimpleSelectOption {
    value: string;
    label: string;
}
/**
 * Flat-list convenience over the Radix Select: `{ value, label }` options with
 * plain `value`/`onValueChange` strings, empty-string values allowed.
 */
declare function SimpleSelect({ value, onValueChange, options, placeholder, disabled, className, id, 'aria-label': ariaLabel, }: {
    value: string;
    onValueChange: (value: string) => void;
    options: SimpleSelectOption[];
    placeholder?: string;
    disabled?: boolean;
    className?: string;
    id?: string;
    'aria-label'?: string;
}): React.JSX.Element;

declare function Popover({ open: controlledOpen, onOpenChange, children, }: {
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
    children: React.ReactNode;
}): React.JSX.Element;
declare function PopoverTrigger({ asChild, children, }: {
    asChild?: boolean;
    children: React.ReactElement;
}): React.JSX.Element;
declare function PopoverContent({ align, side, className, children, }: {
    align?: 'start' | 'end';
    /** Which edge of the trigger the panel opens from. `top` opens upward. */
    side?: 'bottom' | 'top';
    className?: string;
    children: React.ReactNode;
}): React.JSX.Element | null;

/**
 * The state-transition primitives `motion.css` styles (owner-review 18, ruled 2026-11-02).
 *
 * Each is a thin, host-neutral wrapper that puts the right class on the right element at the
 * right moment; the timing lives in `motion.css` (tokens + per-piece reduced motion). A host that
 * has not imported `motion.css` gets the same DOM with no animation, never a stuck state: every
 * piece that waits on an `animationend` also has a fallback timer.
 */
declare function prefersReducedMotion(): boolean;
interface MotionFace {
    key: string;
    node: React.ReactNode;
}
/**
 * B1 — every label stacked in one grid cell, so the widest one holds the width and the active
 * one fades up 2 px on the feedback token. Inactive faces are `aria-hidden`, so the accessible
 * name is the active label only.
 */
declare function MotionFaces({ active, faces, className, faceClassName, }: {
    active: string;
    faces: readonly MotionFace[];
    className?: string;
    faceClassName?: string;
}): React.JSX.Element;
type DetailSwapMotion = 'soft-cut' | 'push' | 'back' | 'none';
/**
 * C1 / C2 — the detail pane of a list → detail layout. The first content renders as is (the
 * route enter already covers it); each later `swapKey` re-keys the element so its motion runs
 * once: `soft-cut` (C1, desktop: 120 ms opacity), `push` / `back` (C2, the phone stack: 16 px
 * from the side the content came from). Re-keying remounts the subtree, which is the point: the
 * old record's local state does not leak into the new one.
 *
 * Focus follows the phone stack (`push` / `back`), because the re-key removes the control that
 * had it and would otherwise drop focus to `<body>`:
 * - **push** focuses the new content's `[data-swap-focus]` element, else its first heading (made
 *   programmatically focusable with `tabindex="-1"`), else the pane itself;
 *   A detail still loading (no marker or heading yet) focuses the pane, then hands focus to the
 *   marker or heading when it renders, unless the user has moved focus on meanwhile;
 * - **back** focuses `focusOnBack` (a selector naming the opener by identity, e.g.
 *   `[data-row-id="…"]`, which `DataTable` puts on each row's Open control), else the new
 *   content's `[data-swap-focus]` element, else the control at the same place the push left from
 *   (the row that opened it, while the list is unchanged), else the pane.
 *
 * Focus moves only when it was inside the pane (or lost to `<body>`), and never into a pane that
 * is not rendered (a phone stack under `lg:hidden` on a desktop). A `soft-cut` never moves focus:
 * the list keeps it. `manageFocus={false}` opts out.
 */
declare function DetailSwap({ swapKey, motion, manageFocus, focusOnBack, className, children, onFocus, onPointerDownCapture, ...rest }: {
    swapKey: React.Key;
    motion?: DetailSwapMotion;
    manageFocus?: boolean;
    focusOnBack?: string;
} & React.HTMLAttributes<HTMLDivElement> & {
    [data: `data-${string}`]: unknown;
}): React.JSX.Element;
/**
 * D3 — a cell whose value can change under a live list. It rolls its new content up 6 px from
 * 0.4 opacity only when `value` differs from the last render's; a mount, a re-render with the
 * same value, or a reorder (stable row keys) leaves it still.
 *
 * In a `DataTable`, give rows a stable identity (`rowId`, or a string `id`) and keep the column
 * definitions stable (`useMemo`): TanStack renders each `cell` function as a component, so a
 * column set rebuilt on every render remounts the cell and it can never roll.
 */
declare function ChangedCell({ value, className, children, }: {
    value: string | number | boolean | null | undefined;
    className?: string;
    children: React.ReactNode;
}): React.JSX.Element;
/**
 * D2 — a row the operator inserted or archived. `appear` opens its height on mount (an insert);
 * `open={false}` closes it, makes it inert, and calls `onClosed` once the height has closed (or,
 * under reduced motion, once it has faded), so the caller can drop it from the list. Rows that
 * change remotely should not use `appear`: only the cell rolls (D3).
 */
declare function MotionRow({ open, appear, onClosed, className, children, as: Tag, }: {
    open?: boolean;
    appear?: boolean;
    onClosed?: () => void;
    className?: string;
    children: React.ReactNode;
    as?: 'div' | 'li';
}): React.JSX.Element;
/**
 * D2 — FLIP for the operator's own re-sort. Call `capture()` when the operator asks for the new
 * order, and give each row `ref={register(id)}`; when the rows next move, each slides from where
 * it was (`--splice-motion-flip`, ease-out). A capture waits through renders in which nothing has
 * moved yet (a server-side sort still loading) and lapses after `pendingMs`. A second sort while
 * rows are still sliding starts from where they are on screen. Remote reorders never call
 * `capture()`, so they cut. Reduced motion: no slide.
 */
declare function useFlip<T extends HTMLElement = HTMLElement>({ pendingMs }?: {
    pendingMs?: number;
}): {
    capture: () => void;
    register: (id: string) => (el: T | null) => void;
};

/**
 * B1 (owner-review 18, ruled 2026-11-02) — a Save button that holds its width while it saves.
 * Both labels sit in one grid cell (`motion.css` `.motion-faces`), so `Save` → `Saving…` no
 * longer reflows the footer; the active label fades up on the feedback token. Its accessible
 * name is the visible label only.
 *
 * Unavailable (saving, or `disabled`) is `aria-disabled` plus a guarded click, never native
 * `disabled`: a natively disabled button drops the focus it holds to `<body>` the moment the save
 * starts (and again when a saved form disables it), so a keyboard user loses their place and a
 * screen reader hears nothing. Kept focusable, it announces "Saving…, dimmed, busy" (`aria-busy`
 * while saving), a click or Enter does nothing, and a `type="submit"` SaveButton does not submit
 * its form (the guarded click cancels the submission).
 */
declare function SaveButton({ saving, label, savingLabel, disabled, onClick, ...props }: Omit<React.ComponentProps<typeof Button>, 'children'> & {
    saving: boolean;
    label?: React.ReactNode;
    savingLabel?: React.ReactNode;
}): React.JSX.Element;

declare function Separator({ className, orientation, decorative, ...props }: React.ComponentProps<typeof SeparatorPrimitive.Root>): React.JSX.Element;

declare function Skeleton({ className, ...props }: React.ComponentProps<'div'>): React.JSX.Element;

declare function TooltipProvider({ delayDuration, ...props }: React.ComponentProps<typeof TooltipPrimitive.Provider>): React.JSX.Element;
declare function Tooltip({ ...props }: React.ComponentProps<typeof TooltipPrimitive.Root>): React.JSX.Element;
declare function TooltipTrigger({ ...props }: React.ComponentProps<typeof TooltipPrimitive.Trigger>): React.JSX.Element;
declare function TooltipContent({ className, sideOffset, children, ...props }: React.ComponentProps<typeof TooltipPrimitive.Content>): React.JSX.Element;

declare function useIsMobile(): boolean;

type SidebarContext = {
    state: 'expanded' | 'collapsed';
    open: boolean;
    setOpen: (open: boolean) => void;
    openMobile: boolean;
    setOpenMobile: (open: boolean) => void;
    isMobile: boolean;
    toggleSidebar: () => void;
};
declare const SidebarContext: React.Context<SidebarContext | null>;
declare function useSidebar(): SidebarContext;
declare function SidebarProvider({ defaultOpen, open: openProp, onOpenChange: setOpenProp, className, style, children, ...props }: React.ComponentProps<'div'> & {
    defaultOpen?: boolean;
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
}): React.JSX.Element;
declare function Sidebar({ side, variant, collapsible, className, children, ...props }: React.ComponentProps<'div'> & {
    side?: 'left' | 'right';
    variant?: 'sidebar' | 'floating' | 'inset';
    collapsible?: 'offcanvas' | 'icon' | 'none';
}): React.JSX.Element;
declare function SidebarTrigger({ className, onClick, ...props }: React.ComponentProps<typeof Button>): React.JSX.Element;
declare function SidebarRail({ className, ...props }: React.ComponentProps<'button'>): React.JSX.Element;
declare function SidebarInset({ className, ...props }: React.ComponentProps<'main'>): React.JSX.Element;
declare function SidebarInput({ className, ...props }: React.ComponentProps<typeof Input>): React.JSX.Element;
declare function SidebarHeader({ className, ...props }: React.ComponentProps<'div'>): React.JSX.Element;
declare function SidebarFooter({ className, ...props }: React.ComponentProps<'div'>): React.JSX.Element;
declare function SidebarSeparator({ className, ...props }: React.ComponentProps<typeof Separator>): React.JSX.Element;
declare function SidebarContent({ className, ...props }: React.ComponentProps<'div'>): React.JSX.Element;
declare function SidebarGroup({ className, ...props }: React.ComponentProps<'div'>): React.JSX.Element;
declare function SidebarGroupLabel({ className, asChild, ...props }: React.ComponentProps<'div'> & {
    asChild?: boolean;
}): React.JSX.Element;
declare function SidebarGroupAction({ className, asChild, ...props }: React.ComponentProps<'button'> & {
    asChild?: boolean;
}): React.JSX.Element;
declare function SidebarGroupContent({ className, ...props }: React.ComponentProps<'div'>): React.JSX.Element;
declare function SidebarMenu({ className, ...props }: React.ComponentProps<'ul'>): React.JSX.Element;
declare function SidebarMenuItem({ className, ...props }: React.ComponentProps<'li'>): React.JSX.Element;
declare const sidebarMenuButtonVariants: (props?: ({
    variant?: "default" | "outline" | null | undefined;
    size?: "default" | "sm" | "lg" | null | undefined;
} & class_variance_authority_types.ClassProp) | undefined) => string;
declare function SidebarMenuButton({ asChild, isActive, variant, size, tooltip, className, ...props }: React.ComponentProps<'button'> & {
    asChild?: boolean;
    isActive?: boolean;
    tooltip?: string | React.ComponentProps<typeof TooltipContent>;
} & VariantProps<typeof sidebarMenuButtonVariants>): React.JSX.Element;
declare function SidebarMenuAction({ className, asChild, showOnHover, ...props }: React.ComponentProps<'button'> & {
    asChild?: boolean;
    showOnHover?: boolean;
}): React.JSX.Element;
declare function SidebarMenuBadge({ className, ...props }: React.ComponentProps<'div'>): React.JSX.Element;
declare function SidebarMenuSkeleton({ className, showIcon, ...props }: React.ComponentProps<'div'> & {
    showIcon?: boolean;
}): React.JSX.Element;
declare function SidebarMenuSub({ className, ...props }: React.ComponentProps<'ul'>): React.JSX.Element;
declare function SidebarMenuSubItem({ className, ...props }: React.ComponentProps<'li'>): React.JSX.Element;
declare function SidebarMenuSubButton({ asChild, size, isActive, className, ...props }: React.ComponentProps<'a'> & {
    asChild?: boolean;
    size?: 'sm' | 'md';
    isActive?: boolean;
}): React.JSX.Element;

declare module '@tanstack/react-table' {
    interface ColumnMeta<TData extends unknown, TValue> {
        sortField?: string;
        sortAccessor?: (row: TData) => string | number | Date | null | undefined;
        label?: string;
    }
}
interface ServerPagination {
    page: number;
    lastPage: number;
    onPageChange: (page: number) => void;
}
/**
 * Shared sort state for sortable column headers. `sortableFields` are the `x-sort`
 * field names the resource declares (derive from the filter schema, never
 * hand-author); a column offers a sort affordance iff its `meta.sortField` is in
 * this set. `sort` / `onSortChange` are the *same* comma-joined `sort` param the
 * facets-bar Sort control reads and writes — headers and the Sort menu share one
 * state, never a competing mechanism.
 */
interface DataTableSort {
    sortableFields: Set<string>;
    sort: string | null;
    onSortChange: (value: string | null) => void;
}
/**
 * The index-view table: headless TanStack Table with server-driven pagination.
 * Saved-filter / x-filter wiring layers on top per surface.
 *
 * Loading is two-phase (issue 01): the very first load with no rows yet shows shaped
 * skeleton rows (never a bare "Loading…"), while a re-filter/re-sort that already has
 * rows keeps the previous set visible but dimmed and cross-fades to the new one — no
 * blank flash. The caller passes `loading` (the query is pending) and the current `data`;
 * the table decides which phase applies from whether rows already exist.
 *
 * Skin: all colors are semantic Tailwind tokens (`bg-card`, `text-muted-foreground`, …)
 * that resolve against the host's `@theme` vars — zero hard-coded colors. The
 * `list-cross-fade` class is a host-owned motion utility (see the beam token-var
 * convention); the host defines its transition, the table only opts in by name.
 *
 * `stackOnMobile` (opt-in): below the foundation's 768px breakpoint ({@link useIsMobile}) every row becomes a stacked
 * card that renders the SAME column cells, so a row's status and its actions stay on screen instead of being clipped or
 * parked past the right edge of a sideways scroller. The first column is the card's heading, a column whose id is
 * `actions` is the card's footer, and every other column is a labelled field (its string header is the label). Loading,
 * empty, row-click, re-fetch dimming and pagination behave exactly as in the table. (Promoted from beam-accounts'
 * ResponsiveRoster: X shot-review follow-up (b), orch-lead 15:26Z.)
 */
declare function DataTable<TData>({ columns, data, pagination, onRowClick, rowClassName, emptyMessage, loading, skeletonRows, className, sorting, clientSort, clientPageSize, stackOnMobile, renderExpanded, expandedRows, rowId, flipOnSort, }: {
    columns: ColumnDef<TData, unknown>[];
    data: TData[];
    pagination?: ServerPagination;
    onRowClick?: (row: TData) => void;
    rowClassName?: (row: TData) => string | undefined;
    emptyMessage?: string;
    loading?: boolean;
    skeletonRows?: number;
    className?: string;
    /** Server-driven sort (emits a `sort` param the server honors). */
    sorting?: DataTableSort;
    /** In-memory sort for non-paginated resources — same DataTableSort shape/state, resolved
     * locally. Mutually exclusive with `sorting`. */
    clientSort?: DataTableSort;
    /** When set, paginate the (client-sorted) rows in-memory at this page size. */
    clientPageSize?: number;
    /** Below 768px, render each row as a stacked card instead of a table row (see above). */
    stackOnMobile?: boolean;
    /** Detail content for caller-expanded rows; no expansion controls are added. */
    renderExpanded?: (row: TData) => ReactNode;
    /** Caller-owned object identities, not domain ids (two sources may share an id). */
    expandedRows?: ReadonlySet<TData>;
    /**
     * The row's stable identity, for rows without a string/number `id`. Rows then keep their
     * React identity across inserts and reorders, so per-cell state (a `ChangedCell` roll, an
     * open menu) stays on its own row instead of following the index.
     */
    rowId?: (row: TData) => string;
    /**
     * D2 (owner-review 18): when the operator sorts by a header, rows slide from their old place
     * (FLIP). Only the header click captures, so a remote reorder still cuts. On by default.
     */
    flipOnSort?: boolean;
}): React.JSX.Element;

/**
 * SidePanel — a reusable, edit-in-place right-hand panel.
 *
 * Unlike {@link Sheet}, this is a **non-blocking** surface: the underlying page
 * stays visible and interactive (Radix `modal={false}` — no dimming overlay, no
 * scroll-lock, no focus trap), so the panel reads as side-by-side reference
 * rather than a modal that eats the page. It hosts an arbitrary editor body for
 * one entity and surfaces save/cancel that the opener acts on.
 *
 * This is the shared shell that quick-edit surfaces mount into (Context Scope
 * edit-in-place, the fragment editor). Keep the contract generic — an entity
 * label + an editor body in, save/cancel out — don't special-case a consumer.
 *
 * The motion classes (`motion-standard`, the A2 overlay timing, the B1 save
 * faces) and the reduced-motion guard ship in `@schemastud/ui/motion.css`, which
 * the host imports; the `--splice-*` tokens stay host-overridable, so the
 * primitive stays presentational and themeable, never forking.
 */
interface SidePanelProps {
    /** Whether the panel is open. Controlled by the opener. */
    open: boolean;
    /** Fired when Radix requests a state change (Esc, outside interaction). */
    onOpenChange: (open: boolean) => void;
    /** Panel heading — typically the entity's label/name. */
    title: React.ReactNode;
    /** Optional sub-heading under the title (entity kind, id, hint). */
    description?: React.ReactNode;
    /** The editor body for the entity — a schema-driven form or arbitrary editor. */
    children: React.ReactNode;
    /**
     * Optional action node rendered in the header, immediately left of the Close
     * button — the panel's "button bar". Any panel with a full-page counterpart
     * passes an expand-to-full-page link here; kept generic so it's not
     * special-cased to one consumer.
     */
    headerActions?: React.ReactNode;
    /**
     * Invoked when the user commits the edit. The opener persists in place and
     * decides whether to close (return/resolve, then flip `open`).
     */
    onSave?: () => void;
    /** Invoked when the user abandons the edit. Defaults to closing the panel. */
    onCancel?: () => void;
    /** Label for the primary/commit action. */
    saveLabel?: string;
    /** Label for the dismiss action. */
    cancelLabel?: string;
    /** Disable the save action (e.g. invalid form, in-flight request). */
    saveDisabled?: boolean;
    /** Show a busy state on save (in-flight persistence). */
    saving?: boolean;
    /** Hide the built-in footer to supply a custom action row inside `children`. */
    hideFooter?: boolean;
    /** Extra classes for the panel content surface (e.g. a wider `max-w-*`). */
    className?: string;
}
declare function SidePanel({ open, onOpenChange, title, description, children, headerActions, onSave, onCancel, saveLabel, cancelLabel, saveDisabled, saving, hideFooter, className, }: SidePanelProps): React.JSX.Element;

/**
 * The keep-previous cross-fade + skeleton primitive for **non-table** list
 * surfaces (card grids, stacked lists) — the same two-phase loading the
 * DataTable already gives tabular lists (UI-01), generalized so no card list
 * flashes a bare "Loading…" anywhere (UI-18).
 *
 * Two phases, decided from whether content already exists:
 * - **First load** (pending, nothing to show yet) → shaped skeleton rows via
 *   {@link ListSkeleton}, never a bare "Loading…".
 * - **Re-filter / refetch** (pending but previous content is on screen) → keep
 *   the previous content, dimmed, and cross-fade to the new set.
 *
 * Feed it the query's `isPending` and whether it currently `hasItems`. Motion is
 * the shared standard (`list-cross-fade`, the `--splice-motion-*` tokens) — a
 * host-owned Tailwind utility, so the host owns the timing and the
 * `prefers-reduced-motion` guard; the primitive only names the class.
 */
declare function ListState({ isPending, hasItems, skeleton, children, className, }: {
    /** The list query is in flight with no cached data. */
    isPending: boolean;
    /** Whether the list currently has any items to show. */
    hasItems: boolean;
    /** The skeleton to show on first load. Defaults to shaped rows. */
    skeleton?: ReactNode;
    /** The rendered list (and empty state) when content is available. */
    children: ReactNode;
    className?: string;
}): React.JSX.Element;
/**
 * Shaped placeholder rows for a card/stacked list's first load — the card-list
 * analogue of the DataTable's skeleton rows. `variant="grid"` lays the
 * placeholders out in the same responsive grid the card lists use.
 */
declare function ListSkeleton({ rows, variant, className, }: {
    rows?: number;
    variant?: 'grid' | 'stack';
    className?: string;
}): React.JSX.Element;

/**
 * The tone a figure carries — the enum tower-ux's private `StatTile` had, lifted verbatim
 * so `@splicewire/tower-ux` and frame's `stat-row` card draw the same tile. Each tone maps
 * to ONE semantic token the host owns (`signal` / `info` / `warning` / `destructive`);
 * nothing here names a hue, so a satellite re-treats a tile by re-declaring the token at
 * its root, never by forking the component.
 */
type StatTone = 'default' | 'active' | 'busy' | 'warn' | 'danger';
interface StatTileProps {
    label: string;
    value: number | string | ReactNode;
    /** An optional glyph beside the figure — a lucide-style component taking `className`. */
    icon?: ComponentType<{
        className?: string;
    }>;
    tone?: StatTone;
    className?: string;
}
/**
 * One figure with its label — the at-a-glance tile a dashboard row is made of. Lifted from
 * `tower-ux/src/operator/OperatorDashboardPage.tsx` (realm-dashboards ticket 03) with the
 * brand-tier var fallbacks and the `text-amber-600` literal replaced by semantic tokens.
 *
 * Toneless by default: `tone` colours only the glyph well, never the figure, so a row of
 * tiles reads as one system with the status colour as the accent.
 */
declare function StatTile({ label, value, icon: Icon, tone, className }: StatTileProps): React.JSX.Element;

/** Host-declared presentation only. Amounts remain in currency units, never integer cents. */
interface MoneyFormat {
    currency: string;
    locale: string;
    minorDigits?: number;
    costMaxDigits?: number;
}
type MoneyMode = 'charge' | 'cost' | 'rate';
type MoneyBasis = 'priced' | 'unpriced' | 'replayed';
interface MoneyOptions {
    mode?: MoneyMode;
    /** Only a price (plan/offer/listing) of zero is Free. A recorded zero is an amount. */
    price?: boolean;
    /** Supplied by the row; never inferred from an amount or a missing model. */
    basis?: MoneyBasis | null;
}
declare const defaultMoneyFormat: Readonly<MoneyFormat>;
/** Charge rounding is presentation, not accounting. Cost/rate never hide a nonzero under the cap. */
declare function formatMoney(amount: number, options?: MoneyOptions, format?: MoneyFormat): string;

/** Mount once in the host shell with the served money format. */
declare function MoneyFormatProvider({ value, children }: {
    value: MoneyFormat;
    children: ReactNode;
}): React.JSX.Element;
declare function useMoneyFormat(): (amount: number, options?: MoneyOptions) => string;

export { Badge, Button, Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle, ChangedCell, DataTable, type DataTableSort, DetailSwap, type DetailSwapMotion, Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, Input, Label, ListSkeleton, ListState, type MoneyBasis, type MoneyFormat, MoneyFormatProvider, type MoneyMode, type MoneyOptions, type MotionFace, MotionFaces, MotionRow, Popover, PopoverContent, PopoverTrigger, SaveButton, Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectSeparator, SelectTrigger, SelectValue, Separator, type ServerPagination, Sheet, SheetClose, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetPortal, type SheetSide, SheetTitle, SheetTrigger, SidePanel, type SidePanelProps, Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupAction, SidebarGroupContent, SidebarGroupLabel, SidebarHeader, SidebarInput, SidebarInset, SidebarMenu, SidebarMenuAction, SidebarMenuBadge, SidebarMenuButton, SidebarMenuItem, SidebarMenuSkeleton, SidebarMenuSub, SidebarMenuSubButton, SidebarMenuSubItem, SidebarProvider, SidebarRail, SidebarSeparator, SidebarTrigger, SimpleSelect, type SimpleSelectOption, Skeleton, type SortKey, StatTile, type StatTileProps, type StatTone, Switch, Textarea, Tooltip, TooltipContent, TooltipProvider, TooltipTrigger, badgeVariants, buttonVariants, cn, defaultMoneyFormat, formatMoney, hitTargetFloor, parseSort, prefersReducedMotion, serializeSort, sortStateFor, toggleSortKey, useFlip, useIsMobile, useMoneyFormat, useSidebar };
