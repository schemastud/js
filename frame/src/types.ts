import type { FormIntentBus, SchemaFetcher, SchemaNode, WidgetRegistry } from '@schemastud/seam';
import type { FacetsPrimitives, FacetsTransport, UseUrlState } from '@schemastud/facets';
import type { ComponentType, ReactNode } from 'react';
import type { FrameHooks } from './hooks';

// =============================================================================
// frame v1 — shell + slot contract (ADR-0081). Every type generalizes something
// already proven; frame is CONSOLIDATION, not greenfield.
// =============================================================================

export type Row = Record<string, unknown>;

export interface Paginated<T> {
    data: T[];
    total: number;
    page: number;
    perPage: number;
}

export type FormMode = 'enriched' | 'bare';

// -----------------------------------------------------------------------------
// Injected auth check — frame CALLS `can`, never absorbs a policy cascade. numero
// binds it to a staff bool (Gate::allows('bypass-marquee')); a richer host can bind
// a full policy. Frame permits both, requires neither.
// -----------------------------------------------------------------------------
export type FrameAction = 'viewAny' | 'view' | 'create' | 'update' | 'delete';
export type FrameCan = (action: FrameAction, resource: string, record?: unknown) => boolean;

// -----------------------------------------------------------------------------
// Transport — facets' 5 methods + CRUD. Named-method object (a list/edit surface
// needs many operations). `getFormSchema`/`save` reach the server; the host's
// persist strategy and JsonSchemaGenerator->forRequest() sit BELOW this seam.
// -----------------------------------------------------------------------------
export interface FrameTransport extends FacetsTransport {
    list(resource: string, params: Record<string, string>): Promise<Paginated<Row>>;
    get(resource: string, id: string): Promise<Row>;
    getFormSchema(resource: string, form: FormMode): Promise<SchemaNode>;
    save(resource: string, id: string | null, data: unknown): Promise<Row>;
    remove(resource: string, id: string): Promise<void>;
}

// -----------------------------------------------------------------------------
// Primitives — facets' set + the shell chrome beyond the facets bar. The host
// supplies its design system; frame renders resource-blind through it.
// -----------------------------------------------------------------------------
export interface FramePrimitives extends FacetsPrimitives {
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

// -----------------------------------------------------------------------------
// The one injection bundle carried by <FrameProvider>. Generalizes seam's
// (schemaFetcher + registry + intent bus) and facets' three seams into one, and
// adds the injected `can`.
// -----------------------------------------------------------------------------
export interface FrameInjection {
    transport: FrameTransport;
    primitives: FramePrimitives;
    useUrlState: UseUrlState;
    registry: WidgetRegistry;
    schemaFetcher: SchemaFetcher;
    can: FrameCan;
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
}

/**
 * A registry for canonical whole-object forms keyed by schema identity (kind = terminal `$id`
 * segment) with a predicate escape hatch. See {@see createFormResolver} for the resolution order.
 */
export interface FormResolver {
    registerFormForSchema(
        match: string | ((schema: SchemaNode) => boolean),
        form: ComponentType<FormBodySlotProps>,
    ): void;
    resolveFormForSchema(schema: SchemaNode): {
        form: ComponentType<FormBodySlotProps> | null;
        reason: 'x-widget' | 'by-kind' | 'by-predicate' | 'generic';
    };
}

// -----------------------------------------------------------------------------
// Columns resolve through a SEAM, not a fixed prop. v1 strategy = host-supplied
// FrameColumn[]. The seam is forward-compatible with a future x-column reflection
// strategy (out of scope) without changing the shell contract.
// -----------------------------------------------------------------------------
export interface FrameColumn {
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

// `schema` is the resource's list/filter schema — unused by the v1 host-supplied
// strategy, but the seam carries it so a future x-column reflection strategy can
// derive columns from it without changing the shell contract. The optional
// `manifest` threads the resource's ContextManifest so `list-column` participation
// (sort/label) folds into the columns and host columns are validated against it; when
// omitted, the seam is a pure passthrough (zero migration for existing surfaces).
export type ResolveColumns = (
    resource: string,
    schema: unknown,
    hostColumns: FrameColumn[],
    manifest?: import('./contexts').ContextManifest,
) => FrameColumn[];

// The manifest entry shape frame's shells consume — the frontend projection of the
// backend AdminResourceDefinition, plus the one frontend overlay (`columns`).
export interface AdminResourceDefinition {
    key: string;
    model: string;
    data: string;
    query: string | null;
    editData: string | null;
    policy: string | null;
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
    nav: {
        label: string;
        group?: string | null;
        icon?: string | null;
        // Host-nav join keys (FC-22): the sitemap section this resource
        // auto-attaches into, its placement within that section, and the route
        // identity a host binds the generated leaf under. All nullable.
        section?: string | null;
        navOrder?: number | null;
        routeName?: string | null;
    };
}

// =============================================================================
// RouteContext — the router half of the one-spine / three-faces frame runtime
// (routes · nav · widgets, joined by `routeName`). FC-22.
//
// HARD GUARDRAIL: a RouteContextEntry is FLAT. It carries per-route properties and
// nothing that encodes parent/child route nesting — record-nested sub-routes stay
// hand-written in the host router. `mounts` names what renders; it never carries a
// child route table.
// =============================================================================

// What a route leaf renders: a built-in shell verb, a heavyweight widget mount,
// or a redirect. Flat — never a nested child table.
export type RouteMounts = 'list' | 'edit' | 'detail' | 'widget' | 'redirect';

export interface RouteContextEntry {
    // Stable identity; the RouteRegistry + nav join key.
    routeName: string;
    // The route path, flat (e.g. `circuits`, `threads/assistants/:id`).
    path: string;
    // The hand-written layout shell this leaf slots under (null = top-level).
    shell: string | null;
    // The host wraps the component in lazy()/Suspense when true.
    lazy: boolean;
    // The host guard key wrapping this leaf (`root` → RequireRoot); null = none.
    guard: string | null;
    // What renders.
    mounts: RouteMounts;
    // When `mounts === 'widget'`, the registered widget name (a heavyweight editor).
    widget?: string | null;
    // The frame resource key this route lists/edits/details (null for a
    // resource-less standalone page).
    resource?: string | null;
}

// =============================================================================
// Realm — the router half's first-class unit (realm-architecture ticket 01). A
// realm is "a manifest + a guarded route tree"; a RealmDefinition carries the
// identity + routing axes the manifest builder (backend) and the route generator
// (frontend) both read, replacing the bare `'admin'|'tenant'` string. Realm-
// agnostic machinery — no realm names, no tenancy policy, no RBAC live here; a
// host (or the beam realm kit) supplies the concrete instances.
// =============================================================================

// The identity axis of a realm — the load-bearing distinction. `central` is a
// single non-tenanted context; `tenant` is the current workspace; `user` is the
// account/identity across workspaces. On a single-tenant instance tenant+user
// collapse to one identity.
export type RealmScope = 'central' | 'tenant' | 'user';

export interface RealmDefinition {
    // Stable realm identity; the manifest fetch key + resource-realm map key.
    key: string;
    // The SPA mount base for this realm's generated route tree (`/admin`, `/`, `/settings`).
    routeBase: string;
    // The default host guard key wrapping this realm's leaves (`root` → RequireRoot; null = the shell's own auth).
    guard: string | null;
    // Whether this realm is the single non-tenanted central context (true = admin/central). The identity
    // axis rides the realm `key`; `RealmScope` was retired for this boolean (realm-architecture ticket 08),
    // mirroring the PHP `RealmDefinition` DTO.
    central: boolean;
    // Optional realm route/nav stack composition (PHP `stack: array = []`).
    stack?: string[];
}

// One back-compat redirect, emitted in the manifest so the JS router is a pure
// renderer (no separate client alias table). A `:id` in both `from` and `to`
// interpolates client-side; `preserveQuery` carries the query string through. A
// by-name data lookup is resolved server-side at emit and arrives as a static entry.
export interface AliasEntry {
    from: string;
    to: string;
    preserveQuery: boolean;
}

// =============================================================================
// Slot prop contracts
// =============================================================================
export interface ToolbarSlotProps {
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
}

export interface CellSlotProps {
    column: FrameColumn;
    record: Row;
}

export interface ListSlots {
    Toolbar: ComponentType<ToolbarSlotProps>;
    Filters: ComponentType<any>;
    Table: ComponentType<any>;
    Cell: ComponentType<CellSlotProps>;
    RowActions: ComponentType<{ record: Row }>;
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

export interface ErrorSlotProps {
    /** The transport/query error. `unknown` because a transport may reject with anything. */
    error: unknown;
    /** Re-run the list read. */
    retry: () => void;
}

export interface PaginationSlotProps {
    page: number;
    perPage: number;
    total: number;
    onPageChange: (page: number) => void;
    /** Change the page size; absent when the host doesn't offer a size control. */
    onPerPageChange?: (perPage: number) => void;
    /** Page-size choices offered by the size control (defaults to 10/25/50/100). */
    perPageOptions?: number[];
}

export interface ListShellProps {
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
    manifest?: import('./contexts').ContextManifest;
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

export interface FormBodySlotProps {
    schema: SchemaNode;
    formData: Row;
    intentBus: FormIntentBus;
    readOnly: boolean;
    form: FormMode;
    onChange: (data: Row) => void;
    onSubmit: (data: Row) => void;
}

export interface EditSlots {
    FormBody: ComponentType<FormBodySlotProps>;
    Toggle: ComponentType<{ value: FormMode; onChange: (m: FormMode) => void }>;
    SaveBar: ComponentType<SaveBarSlotProps>;
    Container: ComponentType<any>;
}

export interface SaveBarSlotProps {
    saving: boolean;
    readOnly: boolean;
    onSave: () => void;
    onCancel?: () => void;
}

/**
 * The widget route shell (ED-04): a `mounts: 'widget'` route mounts one
 * heavyweight widget full-surface. `widget` is the registered widget name the
 * route entry carries (`RouteContextEntry.widget`).
 */
export interface WidgetShellProps {
    resource: string;
    id: string | null;
    widget: string;
    readOnly?: boolean;
    onSaved?: (record: Row) => void;
}

export interface EditShellProps {
    resource: string;
    id: string | null;
    readOnly?: boolean;
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
