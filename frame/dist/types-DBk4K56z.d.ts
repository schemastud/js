import { SchemaNode, FormIntentBus, WidgetRegistry, SchemaFetcher } from '@schemastud/seam';
import { FacetsTransport, FacetsPrimitives, UseUrlState } from '@schemastud/facets';
import * as react from 'react';
import { ReactNode, ComponentType } from 'react';
import { StatTone } from '@schemastud/ui';

type FrameLayoutWidth = '3xl' | '4xl' | '5xl' | '6xl';
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
type FrameLayoutCanvas = 'flat' | 'dotted';
/**
 * SHARED BASE — the one place width + centering (+ the canvas axis) live; every plug
 * composes it. A bare centered, width-capped, `space-y-6`-stacked container. Exposed
 * so a host authoring a fourth surface stays inside the family's width/canvas
 * vocabulary. `canvas` is authored cascade-reachable: it sets the `data-canvas`
 * attribute (an override surface a satellite re-declares at the root) and paints via
 * `canvas-surface` off `--canvas-bg` — no hardcoded background pattern.
 */
declare function FrameLayoutShell({ width, canvas, className, children, }: {
    width?: FrameLayoutWidth;
    canvas?: FrameLayoutCanvas;
    className?: string;
    children: ReactNode;
}): react.JSX.Element;
interface SingleColumnProps {
    width?: FrameLayoutWidth;
    className?: string;
    children: ReactNode;
}
declare function SingleColumn({ width, className, children }: SingleColumnProps): react.JSX.Element;
interface SubNavItem {
    key: string;
    label: string;
}
interface SubNavColumnProps {
    nav: SubNavItem[];
    active: string;
    onSelect: (key: string) => void;
    children: ReactNode;
    width?: FrameLayoutWidth;
    className?: string;
}
declare function SubNavColumn({ nav, active, onSelect, children, width, className, }: SubNavColumnProps): react.JSX.Element;
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
type DetailPresentation = 'inline' | 'panel' | 'sheet';
/**
 * Responsive-collapse policy (orthogonal to `presentation`, ticket 02 cross-cutting
 * axes): below `breakpoint` the two panes fold to one column, either
 *  • `stack` — detail stacks under the master (works everywhere; the default), or
 *  • `sheet` — detail detaches into a right Sheet (ar22), reusing the same overlay
 *    path as `presentation="sheet"`.
 */
type CollapseMode = 'stack' | 'sheet';
/**
 * The host overlay a `sheet` detail routes through. Bind to
 * `FramePrimitives.SidePanel`; the mainframe contributes it into its `overlay` core
 * slot so the sheet does not nest its own portal (ticket 03/05).
 */
type FrameLayoutSidePanel = ComponentType<{
    open: boolean;
    onOpenChange: (open: boolean) => void;
    title?: ReactNode;
    children: ReactNode;
}>;
interface MasterDetailProps {
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
declare function MasterDetail({ master, detail, presentation, collapse, breakpoint, width, canvas, className, sheetOpen, onSheetOpenChange, sheetTitle, sheetDescription, SidePanel, }: MasterDetailProps): react.JSX.Element;
type FrameLayoutVariant = 'single' | 'subnav' | 'master-detail';
type FrameLayoutProps = ({
    variant?: FrameLayoutVariant | null;
} & SingleColumnProps) | ({
    variant: 'subnav';
} & SubNavColumnProps) | ({
    variant: 'master-detail';
} & MasterDetailProps);
declare function FrameLayout({ variant, ...rest }: FrameLayoutProps): react.JSX.Element;

/**
 * The seven render contexts, in three subject grains:
 *
 *  - property   `edit`, `detail`, `list-column`, `row-cell` — one field of one record;
 *               live under a property pointer.
 *  - record     `list-item` — one whole record (a card body, a row); lives at pointer "".
 *  - collection `summary`, `overview` — the whole collection, compressed to figures
 *               (`summary`) or expanded to a card with a body (`overview`); also at "".
 *
 * "A summary of THIS record" is `list-item`, not a new context. The PHP projector
 * refuses a record or collection context on a property, so the client never sees one
 * under a property pointer.
 */
type FrameContext = 'edit' | 'detail' | 'list-column' | 'list-item' | 'row-cell' | 'summary' | 'overview';
/**
 * Per-node participation entry. `widget` is a NAME only (never a component) —
 * component resolution happens client-side through the seam registry.
 */
interface NodeParticipation {
    participates: boolean;
    widget?: string;
    options?: Record<string, unknown>;
    sort?: number;
    label?: string;
    inheritsBinding?: boolean | string;
    heavyweight?: boolean;
}
/**
 * The per-resource contexts manifest. `byNode` keys: "" = resource root, carrying
 * every class-level declaration (`list-item`, `summary`, `overview`, and the
 * `#[RowActions]` `list-column` entry); any other key = a property key. `inherits`
 * is the cascade graph on the wire; `known` echoes the enabled contexts.
 */
interface ContextManifest {
    byNode: Record<string, Partial<Record<FrameContext, NodeParticipation>>>;
    inherits: Partial<Record<FrameContext, FrameContext[]>>;
    known: FrameContext[];
    /**
     * The resource's declared inner-layout grammar (ticket 31) — the FrameLayout
     * socket's `variant` token, emitted off the PHP `#[AdminResource(layout: …)]`.
     * A host resolves the surface's layout straight from the manifest with
     * `<FrameLayout variant={manifest.layout ?? undefined} …>`. `null`/absent = the
     * resource is layout-agnostic; the socket falls back to `SingleColumn` (ticket 09).
     * Optional so existing manifests (and hand-built fixtures) still typecheck.
     */
    layout?: FrameLayoutVariant | null;
    /**
     * Where this resource's create affordance lives — the RESOLVED value the shells read.
     *
     *  - `'frame'` — frame's list toolbar emits the "New …" button. Today's behaviour, and the
     *    default wherever the field is absent (an older server, a hand-built fixture).
     *  - `'host'` — frame emits none: either the resource is not creatable at all, or its
     *    declaration says the host's own chrome owns the affordance.
     *
     * It rides the per-resource context manifest rather than `AdminResourceDefinition` for the
     * same reason `layout` does: a shell is handed its `ContextManifest` and not the definition,
     * and this is a presentation fact about the surface, not a new capability. Resolving the two
     * inputs SERVER-side (`creatable === false ⇒ 'host'`, else the declared slot) is what keeps
     * the client from carrying a second spelling of `creatable` that could drift from the first.
     *
     * ⚠️ It gates only frame's OWN toolbar. A host Toolbar slot receives it as
     * `ToolbarSlotProps.framesCreate` and is free to ignore it — see that prop's docblock for the
     * two live host toolbars that would have been deleted had this been folded into `canCreate`.
     */
    createAffordance?: 'frame' | 'host';
    /**
     * What this resource calls ONE record — the noun a create affordance puts after "New"
     * ("New scaffold pack"), RESOLVED server-side from the declared `singularLabel` or, absent
     * one, the plural display label inflected.
     *
     * It rides this block rather than the definition for the same reason `layout` and
     * `createAffordance` do — a shell is handed its manifest and never the definition — and it
     * is resolved server-side because the client has neither the label nor an inflector. That
     * is precisely why frame's own toolbar has been offering "New scaffold-packs": the raw
     * resource KEY was the only noun it had.
     *
     * Optional, and absent/empty falls back to the key, so every pre-existing manifest and
     * hand-built fixture renders exactly as before.
     */
    singularLabel?: string;
    /**
     * What THIS ACTOR may do to this resource — the axis every other field on this block lacks.
     *
     * `createAffordance`, `creatable`, `deletable` and `editable` all describe the RESOURCE: may
     * this be created at all, whose chrome owns the button. None of them describes who is asking,
     * so a shell driven by them alone renders a "New entry" button and a column of "Delete entry"
     * buttons to a reader holding nothing but `view`. Measured at `~/Herd/beam` on 2026-09-05:
     * exactly that, 13 delete buttons for a member.
     *
     * Resolved SERVER-side (`ResourceAuthorizer::capabilities()`) by the same object the write
     * endpoint asks, so an offered button and the 403 behind it cannot disagree. Already ANDed
     * with the resource flags, so a `deletable: false` resource reports `delete: false` no matter
     * what the actor holds — the shell reads one field per verb and never recombines two.
     *
     * ⚠️ This is **advisory**. It exists to stop offering controls that cannot work; it is not the
     * gate. The gate is the endpoint, which re-checks with the real record and 403s. A host wires
     * this into the injected {@link FrameCan} rather than the shells reading it directly, because
     * `can` is the seam frame already calls and a host may have a richer answer than the manifest's
     * class-level one.
     *
     * Absent (an older server, a hand-built fixture) ⇒ a host's `can` falls back to whatever it did
     * before, so nothing that exists today changes shape.
     */
    can?: {
        create?: boolean;
        update?: boolean;
        delete?: boolean;
        /**
         * Per declared action key: may THIS ACTOR press it (ADR-0005). Answered server-side by the
         * producer with the rule the action's own URL enforces. A shell draws an action only where
         * this is `true` — absent or `false` hides it — and the URL still refuses a wrong answer.
         */
        actions?: Record<string, boolean>;
    };
    /**
     * The resource's declared ACTIONS (ADR-0005), riding this block for the reason `layout` does: a
     * shell is handed its manifest, never the definition. Absent for a resource that declares none.
     */
    actions?: ResourceActionDefinition[];
}
/** The full context vocabulary, in wire order. */
declare const KNOWN_CONTEXTS: FrameContext[];
/**
 * The cascade edges, in the single-parent form the resolver consumes:
 *
 *  - `row-cell` inherits `edit`'s binding unless the node opts out
 *    (inheritsBinding:false) or the parent binding is heavyweight (suppressed).
 *  - `overview` inherits `summary`'s binding unless the node opts out, so a resource
 *    that declares only a summary still renders an honest overview card.
 *
 * The wire `inherits` block carries the same edges as arrays; this is the
 * resolver-facing projection.
 */
declare const INHERITS: Partial<Record<FrameContext, FrameContext>>;

/** The submit context handed to an `onSubmitted` handler alongside the saved record. */
interface SubmittedContext {
    resource: string;
    mode: 'create' | 'edit';
}
type SubmittedHandler = (record: Row, ctx: SubmittedContext) => void;
interface FrameHooks {
    /** Register a handler for a resource's successful submit; returns an unregister fn. */
    onSubmitted(resource: string, handler: SubmittedHandler): () => void;
    /** Fire every handler registered for `resource` with the saved record + context. */
    fireSubmitted(resource: string, record: Row, ctx: SubmittedContext): void;
}
/**
 * Create an isolated hook bus. Handlers are held in a `Map<resource, Set<handler>>`;
 * a resource with no handlers is a silent no-op. `fireSubmitted` iterates a copy so a
 * handler that unregisters mid-fire never mutates the set under iteration.
 */
declare function createFrameHooks(): FrameHooks;

/** One figure of a summary: `{ key, label, value, tone? }`. */
interface SummaryFigure {
    key: string;
    label: string;
    value: number | string;
    tone?: StatTone | null;
}
/**
 * The `resources/{resource}/summary` response, and the `summary` payload on a dashboard
 * row. `key` is the resource key. No `href` — the socket is realm-blind; hrefs are stamped
 * onto the dashboard row by the realm-aware backing.
 */
interface SummaryPayload {
    key: string;
    label: string;
    icon?: string | null;
    figures: SummaryFigure[];
    overview?: OverviewPayload | null;
}
/**
 * The expanded body of a summary — the PHP `OverviewData`. `headline` is the one figure an
 * overview leads with; `items` are the top-N records of the resource (what `recent-list`
 * renders through the resource's own `list-item` binding); `period` names the window the
 * figures cover; `note` is a one-line caption.
 */
interface OverviewPayload {
    headline?: SummaryFigure | null;
    items: Row[];
    period?: string | null;
    note?: string | null;
}
/** One next step on a {@link WelcomePayload}: a host-routed destination, addressed by `key`. */
interface WelcomeAction {
    key: string;
    label: string;
    href: string;
}
/**
 * The panel a dashboard draws when it has nothing else for the viewer — the PHP
 * `DashboardWelcomeData`. `first-run`: the viewer is on no team; `empty`: nothing to show yet.
 * The copy is the server's; `actions` are only destinations the host routes, and `hint` is a
 * line with no destination of its own (null when it would promise a flow the host lacks).
 */
interface WelcomePayload {
    state: 'first-run' | 'empty';
    heading: string;
    body: string;
    actions: WelcomeAction[];
    hint?: string | null;
}
/**
 * A row of a `{realm}-dashboard` resource. `context` says which rendering of the TARGET
 * resource this card is (`overview` when the target declares one, else `summary`); a
 * jump-to tile appended from the realm's nav contribution carries `'nav'` and no summary.
 * A `'welcome'` row is the dashboard's ONLY row when it has no card and no tile for the
 * viewer: no `resource`, no `summary`, its panel in `welcome`.
 */
interface DashboardRow {
    resource?: string | null;
    context: Extract<FrameContext, 'summary' | 'overview'> | 'nav' | 'welcome';
    navOrder?: number | null;
    label: string;
    icon?: string | null;
    href: string;
    description?: string | null;
    summary?: SummaryPayload | null;
    welcome?: WelcomePayload | null;
}
/** What `nav-tile` draws — a nav leaf. */
interface NavTilePayload {
    label: string;
    icon?: string | null;
    href: string;
    description?: string | null;
}
/**
 * A host's icon-name → glyph resolver (`frameIcon` at beam-inertia). Frame ships no icon
 * vocabulary; the host passes one to {@link registerCardWidgets} and every card reads it
 * off its registry config as `options.iconFor`. Absent, cards draw no glyph.
 */
type IconResolver = (name: string | null | undefined) => ComponentType<{
    className?: string;
}> | undefined;
/**
 * A host's navigation primitive, the same seam `@schemastud/nav`'s `ExpandableNav` takes as
 * `renderLink`. Frame ships none: a raw `<a href>` full-page-reloads an Inertia or router
 * host. The host passes one to {@link registerCardWidgets} and every anchor a card draws —
 * the heading link, "View all", the whole nav tile — goes through it. Absent, cards render a
 * plain anchor carrying frame's own `data-frame-*` marker.
 */
type CardLinkRenderer = (props: {
    href: string;
    className?: string;
    children: ReactNode;
    'aria-label'?: string;
}) => ReactNode;
/** The registry config every card entry carries — reaches a widget as `options`. */
interface CardWidgetOptions {
    iconFor?: IconResolver;
    renderLink?: CardLinkRenderer;
    [key: string]: unknown;
}
/**
 * The props `SchemaView` mounts a resolved widget with (`value` + read-only hints + the
 * matched registry config as `options`), plus the dashboard `row` when `dashboard-card`
 * is the one mounting it — that is how `recent-list` learns its "View all" href.
 */
interface CardWidgetProps<T = unknown> {
    value: T;
    formData?: T;
    schema?: SchemaNode;
    options?: CardWidgetOptions;
    readOnly?: boolean;
    disabled?: boolean;
    row?: DashboardRow;
}

type Row = Record<string, unknown>;
interface Paginated<T> {
    data: T[];
    total: number;
    page: number;
    perPage: number;
}
/** A streamed page has no total or numbered-page claim. */
interface CursorPaginated<T> {
    data: T[];
    perPage: number;
    nextCursor: string | null;
}
type ResourcePage<T> = Paginated<T> | CursorPaginated<T>;
type FormMode = 'enriched' | 'bare';
type FrameAction = 'viewAny' | 'view' | 'create' | 'update' | 'delete';
type FrameCan = (action: FrameAction, resource: string, record?: unknown) => boolean;
interface FrameTransport extends FacetsTransport {
    list<Result = Row>(resource: string, params: Record<string, string>): Promise<ResourcePage<Result>>;
    summary(resource: string, params: Record<string, string>): Promise<SummaryPayload>;
    get(resource: string, id: string): Promise<Row>;
    getFormSchema(resource: string, form: FormMode): Promise<SchemaNode>;
    /** Create returns the resource's declared createResultData, or its ordinary row by default. */
    create<Result = Row>(resource: string, data: unknown): Promise<Result>;
    save(resource: string, id: string, data: unknown): Promise<Row>;
    remove(resource: string, id: string): Promise<void>;
    /**
     * Send a declared ACTION's request to its own URL (schemastud/laravel-frame ADR-0005). The action's
     * URL is the producer's mount — frame does not route it through its socket — so the transport
     * sends `method` to `url` (with a record action's `{id}` filled from `target.id`) and hands back the
     * response's `message`/`data`. Reject with a {@link FrameActionError} on a non-2xx answer so the
     * shell can show the server's message and a 422's field errors.
     *
     * Optional: a transport without it renders no action buttons at all — hidden, never broken.
     * `createResourceTransport` supplies it when the host's HTTP adapter can `write`.
     */
    invoke?(action: ResourceActionDefinition, target: {
        id?: string | null;
        data?: unknown;
    }): Promise<ActionResult>;
    /**
     * The form schema of an action with a declared `input` —
     * `GET {prefix}/resources/{resource}/actions/{action}/schema`. Optional like `invoke`; an action
     * with an input and no way to fetch its form renders no button.
     */
    getActionSchema?(resource: string, action: string): Promise<SchemaNode>;
}
/**
 * One ACTION a resource offers beyond CRUD — the hand-written mirror of the PHP
 * `Schemastud\Frame\Registry\ResourceActionDefinition` (ADR-0005). It names no producer and no
 * operation system: a button, the request it sends, an optional form, and how the answer is shown.
 */
interface ResourceActionDefinition {
    /** Unique within the resource; the `can.actions` key and the schema endpoint's segment. */
    key: string;
    label: string;
    /** `resource` renders beside the list's "New"; `record` on each row and on the detail page. */
    scope: 'resource' | 'record';
    method: string;
    /** Host-relative URL; a `record` action's template carries `{id}`. */
    url: string;
    /**
     * The generated type of the request body, dot form (never a PHP class) — or null for a
     * CONFIRM-ONLY action that sends no body. The form's schema comes from `getActionSchema`.
     */
    input: string | null;
    /** `toast` shows the response's message and refetches the resource; `navigate` opens the resulting record. */
    result: 'toast' | 'navigate';
    /** Reads as dangerous; a confirm-only press asks in those words. */
    destructive: boolean;
}
/** What an action's response hands back — the `{ message, data }` of a producer's response envelope. */
interface ActionResult {
    message?: string | null;
    data?: unknown;
}
/**
 * A notification frame asks the host to show — an action's result. A host binds its own toast
 * (`FrameInjection.notify`); absent one, the shell renders the message inline in a status region.
 */
interface FrameNotice {
    tone: 'success' | 'error';
    message: string;
}
interface FramePrimitives extends FacetsPrimitives {
    Table: ComponentType<any>;
    Skeleton: ComponentType<any>;
    SidePanel: ComponentType<any>;
    Dialog?: ComponentType<any>;
    /**
     * The full-surface container an `EditShell` with `container="page"` renders into. Optional, and its
     * absence falls back to a plain `<div>` — NEVER to `SidePanel`, which is what it used to do and is
     * why a page route could silently render as a drawer.
     */
    Page?: ComponentType<any>;
}
/**
 * Another resource's context manifest, by key. THE ONE shape for this lookup: the mount
 * dispatcher's `manifestFor` option and the injection's `manifestFor` below are both this
 * type, so a host wires one function (`(resource) => manifest.contexts[resource]`) and hands
 * it to both — the two cannot drift. A hook is the expected wiring, so it is called during
 * render, never at dispatch time; `undefined` is the normal answer while the manifest query
 * is in flight and for a resource this host does not mount.
 */
type ManifestLookup = (resource: string) => ContextManifest | undefined;
interface FrameInjection {
    transport: FrameTransport;
    primitives: FramePrimitives;
    useUrlState: UseUrlState;
    registry: WidgetRegistry;
    schemaFetcher: SchemaFetcher;
    can: FrameCan;
    /**
     * Look up ANOTHER resource's context manifest (realm-dashboards ticket 03). A shell is
     * handed its own manifest as a prop; a card on a dashboard renders a row that names a
     * different resource (`{ resource: 'tenants', context: 'summary', … }`) and must resolve
     * that resource's root `summary`/`overview` entry, so the lookup rides the injection.
     * Optional so every existing consumer still compiles — absent, `dashboard-card` and
     * `recent-list` render nothing for a row that needs it (a drop, never a throw).
     */
    manifestFor?: ManifestLookup;
    /**
     * Optional host-side hook bus. When present, frame fires `onSubmitted` after a
     * successful save (see EditShell). Optional so existing consumers still compile;
     * a host opts in by passing `createFrameHooks()`.
     */
    hooks?: FrameHooks;
    /**
     * Optional canonical whole-object form resolver ({@see createFormResolver}). When present,
     * `DefaultFormBody` consults it to render a bespoke form for an object whose schema kind is
     * registered, in place of the generic `SchemaForm`; an explicit root `x-widget` and any
     * unregistered schema fall through unchanged. Optional so existing consumers still compile —
     * absent, every object root renders the generic form (zero migration).
     */
    formResolver?: FormResolver;
    /**
     * The app-wide DEFAULT design-system slot sets. A host that has picked a design system
     * (`@schemastud/frame/shadcn`) names it once here instead of every page spreading
     * `slots={shadcnListSlots}` by hand — which is what 13 surfaces at the flagship were doing,
     * one import at a time, with a plain-HTML table as the punishment for forgetting.
     *
     * Merged PER SLOT, not per object: a page's own `slots.Table` wins for `Table` alone and
     * still inherits `Cell`, `Empty`, `Pagination` … from here. The resolution order in both
     * shells is `page slot → injection default → frame's plain-HTML default`, so absent these
     * keys nothing changes anywhere (zero-migration, exactly like `hooks`/`formResolver`).
     *
     * ⚠️ `editSlots.Container` is the one slot the `container` prop outranks: an `EditShell`
     * asked for `container: 'page'` is making an explicit per-render statement about being a
     * full page rather than a drawer, and an app-wide default must not silently turn that back
     * into a panel. See `EditShell`.
     */
    listSlots?: Partial<ListSlots>;
    editSlots?: Partial<EditSlots>;
    /**
     * Show a notice — an action's result (ADR-0005). A host binds its toast here. Optional: absent,
     * the list and detail shells render the message in their own `role="status"` region, so an
     * action's outcome is never silent.
     */
    notify?: (notice: FrameNotice) => void;
}
/**
 * A registry for canonical whole-object forms keyed by schema identity (kind = terminal `$id`
 * segment) with a predicate escape hatch. See {@see createFormResolver} for the resolution order.
 */
interface FormResolver {
    registerFormForSchema(match: string | ((schema: SchemaNode) => boolean), form: ComponentType<FormBodySlotProps>): void;
    resolveFormForSchema(schema: SchemaNode): {
        form: ComponentType<FormBodySlotProps> | null;
        reason: 'x-widget' | 'by-kind' | 'by-predicate' | 'generic';
    };
}
interface FrameColumn {
    field: string;
    header?: string;
    sortField?: string;
    cell?: (record: Row) => ReactNode;
    /**
     * Who produced `cell` — set by `resolveColumns`, never by a host (a host that sets it
     * is describing its own column, which is always `'host'` anyway).
     *
     * It exists for exactly one decision. `ListShell`'s `row-cell` editable-in-place wiring
     * skips any column that already has a `cell`, on the reading "the host said how this
     * renders, so do not replace it". A cell synthesized from the manifest's declared
     * presentation kind is NOT that statement — it is frame's own default — and letting it
     * suppress inline editing would mean adding `#[Column('badge')]` to a field silently
     * turned that field read-only. So the editable wiring skips `'host'` and overrides
     * `'declared'`: an explicit `row-cell` declaration outranks a presentation default,
     * and a host closure outranks both.
     */
    cellSource?: 'host' | 'declared';
}
type ResolveColumns = (resource: string, schema: unknown, hostColumns: FrameColumn[], manifest?: ContextManifest) => FrameColumn[];
interface AdminResourceDefinition {
    key: string;
    /**
     * The GENERATED type of a list row, in dot form — `Vendor.Package.Data.RowData`, the exact
     * name `typescript:transform` emits — never a PHP class-string. Informational on the client:
     * a type name is not something to `import()`, it is the label that says which generated
     * interface these rows are.
     */
    data: string;
    /**
     * The generated type of the declared edit/create DTO, in the same dot form as `data`; null means
     * the edit shape is the read projection. Informational like `data` — the form's schema comes from
     * `GET /frame/resources/{key}/schema`, and a host need not emit every write DTO as a type.
     */
    editData: string | null;
    /** Generated create-result type identity, dot form; null means the ordinary read projection. */
    createResultData: string | null;
    form: FormMode;
    /**
     * The four capability gates the PHP `ResourceDefinition` has carried for some time and which
     * `GET /frame/manifest` has been serving on every entry — and which this projection did not
     * declare, so nothing on the client could read them without an `as any`. That gap is why the
     * flagship suppresses frame's create affordance by hand on nine surfaces: the declaration
     * already said `creatable: false` and the answer could not reach the shell.
     *
     * Optional purely so a hand-built fixture that predates them still typechecks; the server
     * always sends all four.
     */
    creatable?: boolean;
    editable?: boolean;
    deletable?: boolean;
    showable?: boolean;
    /**
     * Where this resource's create affordance lives — `'frame'` (its list toolbar emits the "New"
     * button) or `'host'` (the host's own page chrome owns it, so frame emits none). See
     * `ContextManifest.createAffordance` for the resolved per-resource value the shells read;
     * this is the raw declared slot.
     */
    createAffordance?: 'frame' | 'host';
    /**
     * The resource's declared ACTIONS beyond CRUD (ADR-0005). Also carried, with the per-actor
     * `can.actions` beside them, on the resource's `ContextManifest` — which is what the shells read.
     * Optional so an older server and a hand-built fixture still typecheck; absent means none.
     */
    actions?: ResourceActionDefinition[];
    nav: {
        label: string;
        group?: string | null;
        icon?: string | null;
        section?: string | null;
        navOrder?: number | null;
        routeName?: string | null;
    };
}
type RouteMounts = 'list' | 'edit' | 'detail' | 'widget' | 'redirect';
interface RouteContextEntry {
    routeName: string;
    path: string;
    shell: string | null;
    lazy: boolean;
    guard: string | null;
    mounts: RouteMounts;
    widget?: string | null;
    resource?: string | null;
}
type RealmScope = 'central' | 'tenant' | 'user';
interface RealmDefinition {
    key: string;
    routeBase: string;
    guard: string | null;
    central: boolean;
    stack?: string[];
}
interface ToolbarSlotProps {
    resource: string;
    onNew?: () => void;
    /**
     * May THIS ACTOR create — the injected `can('create', resource)`, unchanged.
     *
     * ⚠️ It is deliberately NOT ANDed with the resource's declared create affordance below, and
     * the separation is load-bearing. `canCreate` is an AUTHORIZATION answer; `framesCreate` is a
     * statement about WHERE the affordance lives. Folding the second into the first would have
     * silently deleted two host toolbars that read `canCreate` and render their own button —
     * `tenants` (`readOnly: true`, yet its create is real: it submits `CreateTenantData` to the
     * REST provisioning endpoint, which is why that declaration carries `editData` alongside
     * `readOnly`) and `fragments`. Both would have lost a working create behind a green suite.
     * Same shape as `FrameColumn.cellSource`: a frame-side default must never revoke a host's
     * own declaration by wearing its name.
     */
    canCreate: boolean;
    /**
     * Does FRAME own the create affordance for this resource — i.e. should a frame-supplied
     * Toolbar emit its own "New …" button at all?
     *
     * Resolved server-side onto the resource's `ContextManifest` from two facts (see
     * `ContextManifest.createAffordance`): the resource is not creatable at all, or it declares
     * that its create affordance is the HOST's (a page-title button, a reveal-once dialog).
     * Frame's own `DefaultToolbar`/`ShadcnToolbar` honour it; a host Toolbar slot receives it and
     * decides for itself, because a host component is the caller, not a default.
     *
     * Defaults to `true` wherever no manifest is present, so every existing surface is unchanged.
     */
    framesCreate: boolean;
    /**
     * What this resource calls ONE record — "scaffold pack", not the key `scaffold-packs`.
     *
     * Resolved SERVER-side onto the `ContextManifest` (declared `singularLabel`, else the plural
     * display label inflected) because the client has neither the label nor an inflector. Absent
     * a manifest it is `undefined` and frame's own toolbars fall back to the resource key, which
     * is byte-identical to their previous behaviour.
     *
     * ⚠️ It is a WORD, not a gate. Nothing here decides whether a create exists — `canCreate` and
     * `framesCreate` already answer that, separately and for different reasons.
     */
    singularLabel?: string;
}
/**
 * Props for the row-actions slot. `record` alone was the whole contract until the declared
 * fallback needed the other three; every existing host component typed `{ record: Row }` stays
 * assignable, so this is additive.
 */
interface RowActionsSlotProps {
    record: Row;
    /** The resource key, for the delete mutation and the transport's cache invalidation. */
    resource: string;
    /**
     * The verbs the RESOURCE declared (`#[RowActions([...])]`), already filtered to the ones
     * frame can render. Empty for every resource that declared nothing — which is why frame's
     * own fallback never appears on a list that did not ask for it.
     */
    actions: string[];
    /** The resolved display singular, for the button label and the confirm sentence. */
    singularLabel?: string;
}
interface CellSlotProps {
    column: FrameColumn;
    record: Row;
}
/**
 * Props for the cards slot — the list shell's SECOND row surface (realm-dashboards ticket 03),
 * taken instead of `Table` when the resource's root `list-item` entry resolves a card renderer.
 */
interface CardsSlotProps {
    resource: string;
    rows: Row[];
    manifest: ContextManifest;
    /** The root node the `list-item` entry resolved against (the resource's list/filter schema). */
    schema: SchemaNode;
    onOpen?: (record: Row) => void;
    /**
     * Frame's per-row card body: `SchemaView` at context `list-item`, bound to this resource's
     * manifest and registry. A host `Cards` slot lays these out however it likes (a masonry, a
     * carousel) and keeps the resolved rendering; one that wants its own row rendering ignores it.
     */
    Card: ComponentType<{
        record: Row;
    }>;
}
interface ListSlots {
    Toolbar: ComponentType<ToolbarSlotProps>;
    Filters: ComponentType<any>;
    Table: ComponentType<any>;
    /**
     * The grid the cards path lays rows out in. Optional like `ErrorState`, and for the same
     * reason: a host that builds a whole `ListSlots` object must keep compiling. Frame's own
     * `DefaultCards` is an auto-fill grid riding the `--density-gap` token.
     *
     * ⚠️ This slot does not DECIDE the path — the manifest does (root `list-item` resolves a
     * component). Naming it only says how cards are laid out once that decision is made, so a
     * host cannot turn a table into cards by supplying it, and a table consumer that never
     * declares `list-item` never sees it.
     */
    Cards?: ComponentType<CardsSlotProps>;
    Cell: ComponentType<CellSlotProps>;
    /**
     * The row's action controls. Supplying it here (or per page) renders it UNCONDITIONALLY —
     * unchanged, and deliberately: a host naming this slot is making a statement about every
     * list it covers. Frame's own `DefaultRowActions` is the LAST fallback and is gated on the
     * resource's `#[RowActions]` declaration instead, so the estate does not grow a delete
     * column on 40-odd lists that never asked for one.
     */
    RowActions: ComponentType<RowActionsSlotProps>;
    Empty: ComponentType<any>;
    Loading: ComponentType<any>;
    /**
     * Rendered when the list READ FAILED, in place of `Empty` (api-surface-coherence 107).
     *
     * Optional so no existing host that builds a whole `ListSlots` object breaks; the shell
     * falls back to its own default. It is a separate slot rather than a flag on `Empty`
     * because the two say opposite things: `Empty` asserts the server answered and there is
     * nothing there, and for as long as this slot did not exist, every 5xx on every list in
     * the estate asserted that too — a hard server error rendering as a clean empty state.
     */
    ErrorState?: ComponentType<ErrorSlotProps>;
    Pagination: ComponentType<PaginationSlotProps>;
}
interface ErrorSlotProps {
    /** The transport/query error. `unknown` because a transport may reject with anything. */
    error: unknown;
    /** Re-run the list read. */
    retry: () => void;
}
interface PaginationCommonProps {
    perPage: number;
    disabled?: boolean;
    onPerPageChange?: (perPage: number) => void;
    perPageOptions?: number[];
}
type PaginationSlotProps = PaginationCommonProps & ({
    mode: 'offset';
    page: number;
    total: number;
    onPageChange: (page: number) => void;
} | {
    mode: 'cursor';
    hasNext: boolean;
    hasPrevious: boolean;
    isFirst: boolean;
    onNext: () => void;
    onPrevious: () => void;
    onFirst: () => void;
});
interface ListShellProps {
    resource: string;
    columns: FrameColumn[];
    onOpen?: (record: Row) => void;
    slots?: Partial<ListSlots>;
    /**
     * The resource's ContextManifest. When present, `list-column` participation folds
     * into the columns (sort/label) AND `row-cell`-participating fields with no host
     * `cell` override become editable-in-place (FC-23). When ABSENT the list is a pure
     * passthrough — exactly today's behavior (zero migration; not a gate).
     */
    manifest?: ContextManifest;
    /**
     * Per-field commit hook for the editable `row-cell` runtime. Called with
     * (record, field, value) when an in-cell edit commits; the host wires it to a
     * per-field save (e.g. `transport.save` / a narrow PATCH). Required only to make
     * row-cell cells actually persist; without it an edited cell commits to a no-op.
     */
    onCellCommit?: (record: Row, field: string, value: unknown) => void;
    /**
     * Where the pagination bar (count · rows-per-page · prev/next) renders relative to
     * the table. Defaults to `'both'` — a bar above and below. Swap the `Pagination`
     * slot to fully customize the bar; set `'bottom'`/`'top'`/`'none'` to place it.
     */
    paginationPlacement?: 'top' | 'bottom' | 'both' | 'none';
}
interface FormBodySlotProps {
    schema: SchemaNode;
    formData: Row;
    intentBus: FormIntentBus;
    readOnly: boolean;
    form: FormMode;
    onChange: (data: Row) => void;
    onSubmit: (data: Row) => void;
    /** Register this body's validated submission path; null keeps the shell Save unavailable. */
    registerSubmit: (handler: (() => void) | null) => void;
}
interface EditSlots {
    FormBody: ComponentType<FormBodySlotProps>;
    Toggle: ComponentType<{
        value: FormMode;
        onChange: (m: FormMode) => void;
    }>;
    SaveBar: ComponentType<SaveBarSlotProps>;
    Container: ComponentType<any>;
}
interface SaveBarSlotProps {
    saving: boolean;
    canSubmit: boolean;
    readOnly: boolean;
    onSave: () => void;
    onCancel?: () => void;
}
/**
 * The widget route shell (ED-04): a `mounts: 'widget'` route mounts one
 * heavyweight widget full-surface. `widget` is the registered widget name the
 * route entry carries (`RouteContextEntry.widget`).
 */
interface WidgetShellProps {
    resource: string;
    id: string | null;
    widget: string;
    readOnly?: boolean;
    onSaved?: (record: Row) => void;
}
interface EditShellProps {
    resource: string;
    id: string | null;
    readOnly?: boolean;
    /**
     * The resource's ContextManifest, for the record ACTIONS a detail page draws (ADR-0005). Absent,
     * the shell asks the injection's `manifestFor`; with neither, no action renders.
     */
    manifest?: ContextManifest;
    /**
     * Where a `navigate`-result action goes: called with `{ id }` of the resulting record. Absent, a
     * navigate action refreshes this record instead.
     */
    onNavigate?: (record: Row) => void;
    /**
     * The surface this shell renders INTO.
     *
     *  - `'panel'` (default) — frame supplies the overlay: `editSlots.Container`, else the
     *    `SidePanel` primitive.
     *  - `'page'` — a full surface, never an overlay. See {@link EditShell}'s `PageContainer`.
     *  - `'bare'` — frame supplies NOTHING and the shell renders its children directly. For the
     *    case the census found four times verbatim at the flagship (plus a fifth on a settings
     *    surface): the page has ALREADY opened its own `<Sheet>`/`<Dialog>` and is mounting the
     *    shell inside it, so frame's own `SidePanel` would be a second overlay nested in the
     *    first. Every one of those five sites paid the identical
     *    `Container: ({ children }) => <>{children}</>` tax to undo a default it never wanted.
     *
     * ⚠️ This is a per-RENDER prop and deliberately not a resource declaration. The same resource
     * legitimately takes different containers in different places — `context-scopes` renders
     * `'bare'` inside ScopesPage's Sheet AND `'page'` when the `mounts` dispatcher drives it — so
     * a resource-level slot would have to pick one and be wrong at the other.
     *
     * Precedence is unchanged: a page's own `slots.Container` still outranks all three values,
     * and `editSlots.Container` still sits BELOW the prop.
     */
    container?: 'panel' | 'page' | 'bare';
    form?: FormMode;
    /**
     * Show the splicewire/raw mode toggle — a dev/debug affordance for previewing a
     * field with host widgets stripped. Off by default: a resource already declares
     * its `form` mode, so the runtime switch is noise in the product UX. Opt in
     * (e.g. behind `import.meta.env.DEV`) to expose it.
     */
    showModeToggle?: boolean;
    onSaved?: (record: Row) => void;
    onCancel?: () => void;
    slots?: Partial<EditSlots>;
}

export { MasterDetail as $, type ActionResult as A, type FrameAction as B, type ContextManifest as C, type DashboardRow as D, type EditShellProps as E, type FrameInjection as F, type FrameCan as G, type FrameHooks as H, type IconResolver as I, FrameLayout as J, type FrameLayoutProps as K, type ListShellProps as L, type ManifestLookup as M, type NodeParticipation as N, FrameLayoutShell as O, type PaginationSlotProps as P, type FrameLayoutSidePanel as Q, type Row as R, type SummaryPayload as S, type ToolbarSlotProps as T, type FrameLayoutVariant as U, type FrameLayoutWidth as V, type WidgetShellProps as W, type FramePrimitives as X, INHERITS as Y, KNOWN_CONTEXTS as Z, type ListSlots as _, type RouteContextEntry as a, type MasterDetailProps as a0, type OverviewPayload as a1, type Paginated as a2, type RealmDefinition as a3, type RealmScope as a4, type RouteMounts as a5, SingleColumn as a6, type SingleColumnProps as a7, SubNavColumn as a8, type SubNavColumnProps as a9, type SubNavItem as aa, type SubmittedContext as ab, type SubmittedHandler as ac, type SummaryFigure as ad, type WelcomeAction as ae, createFrameHooks as af, type FrameColumn as b, type FormMode as c, type ResolveColumns as d, type FormResolver as e, type FrameContext as f, type CardWidgetProps as g, type NavTilePayload as h, type WelcomePayload as i, type CardWidgetOptions as j, type CardLinkRenderer as k, type FrameTransport as l, type ResourcePage as m, type ResourceActionDefinition as n, type FrameNotice as o, type CardsSlotProps as p, type CellSlotProps as q, type ErrorSlotProps as r, type FormBodySlotProps as s, type RowActionsSlotProps as t, type SaveBarSlotProps as u, type AdminResourceDefinition as v, type CollapseMode as w, type CursorPaginated as x, type DetailPresentation as y, type EditSlots as z };
