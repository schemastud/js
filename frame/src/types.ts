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
    canCreate: boolean;
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
    Pagination: ComponentType<PaginationSlotProps>;
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
    container?: 'panel' | 'page';
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
