import * as react from 'react';
import { ReactNode, ComponentType, ReactElement } from 'react';
import { WidgetRegistry, SchemaFetcher, SchemaNode, FormIntentBus } from '@schemastud/seam';
export { FormIntentBus, SchemaFetcher, SchemaNode, WidgetRegistry, createFormIntentBus, createWidgetRegistry } from '@schemastud/seam';
import { w as FrameInjection, h as FrameTransport, l as FrameManifest, C as CardLinkRenderer, I as IconResolver, x as FramePrimitives, L as ListSlots, y as EditSlots, z as FrameCan, A as FormResolver, B as FrameHooks, R as ResourceKey, G as ListShellProps, H as EditShellProps, J as ActionKeyOf, g as ResourceActionDefinition, K as ActionInputOf, Q as ActionResult, b as ContextManifest, U as SchemaPurpose, m as FormMode, a as RowOf, V as CreateResultOf, X as EditOf, k as Row, e as FrameNotice, Y as ResolveColumns, Z as FormBodySlotProps, P as PaginationSlotProps, _ as RowActionsSlotProps, $ as RouteContextEntry, a0 as ListShellPropsOf, F as FrameColumn, M as ManifestLookup, a1 as ResourcePage } from './types-C1zrU238.js';
export { a2 as AdminResourceDefinition, a3 as CardsSlotProps, n as CellSlotProps, a4 as CursorPaginated, E as ErrorSlotProps, c as FieldOf, a5 as FrameAction, f as FrameContext, a6 as FrameLayout, a7 as FrameLayoutProps, a8 as FrameResourceEntry, a9 as FrameResourceMap, aa as KNOWN_CONTEXTS, O as OpenedOf, ab as Paginated, d as ResourceCollectionAddress, ac as RouteMounts, S as SaveBarSlotProps, ad as SubmittedContext, ae as SubmittedHandler, T as ToolbarSlotProps, af as createFrameHooks } from './types-C1zrU238.js';
import { UseQueryResult, QueryClient, UseMutationResult, UseQueryOptions } from '@tanstack/react-query';
import { ThemeProps } from '@rjsf/core';
import { UseUrlState } from '@schemastud/facets';
export { ListFiltersState, UseUrlState, useBrowserUrlState } from '@schemastud/facets';
export { a as ListShellOptions, L as ListShellState, u as useListShell } from './useListShell--RCZXH3M.js';
export { F as FrameActionError } from './session-DUAF3yZG.js';
export { R as RegisterCardWidgetsOptions, r as registerCardWidgets } from './index-Wm9lM13w.js';
export { o as registerResourceRefWidget } from './ResourceRefWidget-DicocDWX.js';
import * as zustand from 'zustand';
export { R as RowAction, r as resolveRowActions } from './rowActions-CMdQOYha.js';
import '@rjsf/utils';
import '@schemastud/ui';

/**
 * Install frame's built-in widgets (the ResourcePicker field widget and the five column kinds) into a registry exactly once.
 * Idempotent per registry. A host that resolves forms through a registry no FrameProvider is handed
 * calls this itself; FrameProvider calls it for its own registry AND seam's `defaultRegistry`.
 */
declare function registerFrameWidgets(registry: WidgetRegistry): void;
/**
 * One provider at the app root carrying the whole FrameInjection bundle. It also
 * wires the sub-contexts frame's shells lean on: facets' provider (transport +
 * primitives + URL-state + host permissions) and seam's WidgetRegistry
 * context (which SchemaForm resolves widgets through). A host sets this up once.
 */
declare function FrameProvider({ value, children }: {
    value: FrameInjection;
    children: ReactNode;
}): react.JSX.Element;
declare function useFrameInjection(): FrameInjection;

interface FrameRegistryOptions {
    /** The host's own registrations; run once, last, on the seeded registry, so a name registered again wins. */
    widgets?: (registry: WidgetRegistry) => void;
    /** The card set's link renderer (a router link). Absent, a card draws a plain anchor. */
    renderLink?: CardLinkRenderer;
    /** The card set's icon resolver. Absent, cards draw no icons. */
    iconFor?: IconResolver;
}
/**
 * A kit's widget registry, built in ruling 01's order: seam's factory (every seam built-in), frame's own
 * built-ins, the card set with the host's link and icon options, then the host's `widgets`. The one
 * construction — `createFrameKit` and the `frame-vocabulary` command both call it.
 */
declare function createFrameRegistry(options?: FrameRegistryOptions): WidgetRegistry;
interface FrameKitOptions extends FrameRegistryOptions {
    /** Where laravel-frame's socket is mounted. Default `/frame`. */
    prefix?: string;
    /** The manifest's address. Default `{prefix}/manifest`; beam mounts one per realm. */
    manifestUrl?: string;
    /** The whole transport (axios, named routes, memory). Default: `createHttpTransport({ prefix, manifestUrl })`. */
    transport?: FrameTransport;
    /** Merged per member over frame's default `@schemastud/ui` bundle: set only what differs. */
    primitives?: Partial<FramePrimitives>;
    /** Merged per slot over the shadcn list slots. */
    listSlots?: Partial<ListSlots>;
    /** Merged per slot over the shadcn edit slots. */
    editSlots?: Partial<EditSlots>;
    /** Default: reads (`viewAny`, `view`) are true; a write is the manifest's `contexts[resource].can[action]`, false while unknown. */
    can?: FrameCan;
    /** `'browser'` (the History API, the default), `'memory'` (one store per kit), or the host router's hook. */
    urlState?: 'browser' | 'memory' | UseUrlState;
    /** Default: the nearest client above the `Provider`, else one the kit owns. */
    queryClient?: QueryClient;
    /** Default: a same-origin JSON fetch that refuses a `$ref` on another origin. */
    schemaFetcher?: SchemaFetcher;
    /** The RJSF theme the kit's forms draw with. Unset, seam's default (`shadcnTheme`). Must be a stable object. */
    theme?: ThemeProps;
    notify?: FrameInjection['notify'];
    formResolver?: FormResolver;
    hooks?: FrameHooks;
}
interface FrameKit<Nav = unknown> {
    /** Mount once at the realm's root. Nested inside itself it renders its children and nothing else. */
    Provider: ComponentType<{
        children?: ReactNode;
    }>;
    /** The transport the kit reads through — the object handed in, never a copy (it is the cache scope). */
    transport: FrameTransport;
    registry: WidgetRegistry;
    /** The socket's manifest, one cache entry per kit. Works inside the `Provider` or above it. */
    useManifest(): UseQueryResult<FrameManifest<Nav>, Error>;
}
/**
 * A host mounts frame with one call. Create it ONCE per socket, at module scope (a host with run-time sockets
 * keeps a module-level map from the address to its kit), then render `<kit.Provider>` at the realm's root:
 *
 * ```tsx
 * const frame = createFrameKit();
 * <frame.Provider><ListShell resource="users" /></frame.Provider>
 * ```
 */
declare function createFrameKit<Nav = unknown>(options?: FrameKitOptions): FrameKit<Nav>;

/**
 * The list surface, generalized from the app substrate. Renders any resource from
 * its schema + host-supplied columns with no per-resource UI code: the facets bar
 * is fully schema-driven (rides FilterSchemaController where a filter schema
 * exists), pagination is transport-driven, columns resolve through the columns seam.
 *
 * It is `useListShell`'s default rendering and reads nothing else: a custom list takes the same behaviour from
 * the hook and draws its own markup.
 */
declare function ListShell<K extends ResourceKey = ResourceKey>(props: ListShellProps<K>): react.JSX.Element;

/**
 * The edit surface (create when id === null; detail = <EditShell readOnly/> — no
 * distinct DetailShell). Renders a form from `transport.getFormSchema` (the server's
 * request projection by default, explicit response projection for read detail), tracks edits,
 * and submits via `transport.save`. The host's
 * persist strategy sits BELOW the transport; the shell is blind to which strategy
 * runs. Every slot has a frame default the host may override.
 *
 * It is `useEditShell`'s default rendering and reads nothing else: a custom form takes the same behaviour from
 * the hook and draws its own markup.
 */
declare function EditShell<K extends ResourceKey = ResourceKey>(typed: EditShellProps<K>): react.JSX.Element;

/** What `useResourceAction` returns: the declared action, and a call typed by its registered input. */
interface ResourceActionCall<K extends ResourceKey = ResourceKey, A extends ActionKeyOf<K> = ActionKeyOf<K>> {
    /**
     * The declared action of either scope that this actor may press (`manifest.can.actions`), provided the transport
     * can `invoke`. `undefined` otherwise. A transport without `getActionSchema` still counts: the host's dialog is
     * the form.
     */
    definition: ResourceActionDefinition | undefined;
    available: boolean;
    /**
     * Typed by the registration: a confirm-only action's input is `null`. Never rejects: it resolves the result, or
     * `undefined` on a refusal, which `error` holds. A record action called without an `id` is refused there and
     * never reaches the transport.
     */
    invoke(target: {
        id?: string | null;
        data: ActionInputOf<K, A>;
    }): Promise<ActionResult | undefined>;
    pending: boolean;
    /** The refusal: a `FrameActionError` carries the server's message and a 422's field errors. */
    error: Error | null;
    result: ActionResult | undefined;
    reset(): void;
}
/**
 * A declared action as a typed call (ruling 03 slice 5), over `transport.invoke`: a host dialog that sends a payload
 * other than the action's registered input does not compile. On success it refetches the resource's reads in this
 * transport's cache scope, as frame's own action buttons and a save do. It notifies, navigates and opens no form:
 * those are the dialog's. It reads the manifest as the shells do (`manifestFor` from the injection) unless one is
 * handed in.
 */
declare function useResourceAction<K extends ResourceKey = ResourceKey, A extends ActionKeyOf<K> = ActionKeyOf<K>>(resource: K, action: A, options?: {
    manifest?: ContextManifest;
}): ResourceActionCall<K, A>;

/** What `useEditShell` takes: `EditShell`'s behaviour props. */
/** What `useEditShell` takes, typed by the resource key (ruling 03). */
interface EditShellOptions<K extends ResourceKey = ResourceKey> extends EditShellOptionsOf<K> {
}
/** What `useEditShell` returns, typed by the resource key (ruling 03). */
interface EditShellState<K extends ResourceKey = ResourceKey> extends EditShellStateOf<K> {
}
/** @internal `EditShellOptions` over any string key: frame's own untyped view. Not a root export. */
interface EditShellOptionsOf<K extends string> {
    resource: K;
    /** `null` creates. */
    id: string | null;
    readOnly?: boolean;
    /** Default `'write'`; create always reads the write projection. */
    schemaPurpose?: SchemaPurpose;
    /** Default `'enriched'`. */
    form?: FormMode;
    /** Else the injection's lookup (a kit's manifest). */
    manifest?: ContextManifest;
    onSaved?: (record: RowOf<K> | CreateResultOf<K>) => void;
    /** Where a record action whose result is `navigate` goes. */
    onNavigate?: (record: RowOf<K>) => void;
    /** Per slot: this page's, then the injection's `editSlots`, then frame's default. `Container` is `EditShell`'s. */
    slots?: Partial<Omit<EditSlots, 'Container'>>;
}
/** A form's behaviour: the reads and their state, the draft, the save and its refusal. `EditShell` renders it. */
/** @internal `EditShellState` over any string key: frame's own untyped view. Not a root export. */
interface EditShellStateOf<K extends string> {
    resource: K;
    id: string | null;
    manifest: ContextManifest | undefined;
    /**
     * One discriminant over the reads. `not-found` is a 404 record read (the record is gone; no retry). `error` is a
     * failed read before the schema and record are present; once they are present the form is `ready`, and a failed
     * refetch is reported in `readFailure` beside it rather than taking the form away.
     */
    status: 'loading' | 'not-found' | 'error' | 'ready';
    /** The retryable read failure: the cause of `error`, or a failed refetch beside a `ready` form. */
    readFailure: {
        message: string;
        retry(): void;
    } | undefined;
    /** As served: the form mode acts in the form's resolver, not on the schema. */
    schema: SchemaNode;
    record: RowOf<K> | EditOf<K> | undefined;
    /** The form's working data. */
    draft: Row;
    /** Marks the draft dirty, so a refetched record does not overwrite it. */
    setDraft(data: Row): void;
    form: FormMode;
    setForm(mode: FormMode): void;
    /** The `readOnly` option, or the actor may not create/update, or a read failed. */
    readOnly: boolean;
    /** `New <singular>` when creating. */
    heading: string;
    singularLabel: string;
    intentBus: FormIntentBus;
    save: {
        /** The validated path: what a form body's `onSubmit` calls. */
        submit(data: Row): void;
        /** Flush widget commits, then the registered body's submit: the save bar's `onSave`. */
        request(): void;
        registerSubmit(handler: (() => void) | null): void;
        canSubmit: boolean;
        saving: boolean;
        /** The server's refusal. */
        error: Error | null;
    };
    /** The inline notice region (absent a host `notify`), and the sink every action here reports to. */
    notice: {
        element: ReactNode;
        onNotice: (notice: FrameNotice) => void;
    };
    actions: {
        /** The record actions this actor may press, through this transport. */
        record: ResourceActionDefinition[];
        /** Bound to this record, `onNavigate` and `notice`; `undefined` when creating or when none is pressable. */
        RecordActions: ComponentType<{
            compact?: boolean;
        }> | undefined;
    };
    slots: Omit<EditSlots, 'Container'>;
}
/**
 * A form's behaviour as a hook (ruling 02 §6): the schema and record reads with their loading, not-found and
 * retryable failure states, the draft, readonly and create gating, the save with its refusal, the record actions
 * bound, and the resolved slots. `EditShell` is its default rendering. It reads `manifestFor` and `can` from the
 * injection and never a kit's `useManifest()`, so it works under any provider.
 *
 * A change of resource, id or purpose inside one mount starts over: the draft, the dirty flag, the registered
 * submit and the save reset, and a save still in flight for the previous record settles without touching the new
 * one (no draft write, no `onSaved`, no `onSubmitted` hook).
 */
declare function useEditShell<K extends ResourceKey = ResourceKey>(options: EditShellOptions<K>): EditShellState<K>;

interface SchemaViewProps {
    schema: SchemaNode;
    record: Record<string, unknown>;
    manifest: ContextManifest;
    context: 'detail' | 'list-item';
    /** Falls back to the seam WidgetRegistryContext when omitted. */
    registry?: WidgetRegistry;
}
declare function SchemaView({ schema, record, manifest, context, registry: registryProp }: SchemaViewProps): ReactNode;

/**
 * The columns seam (DECISION A). **Two paths, and they behave oppositely — the sentence
 * that used to open this docblock ("host-supplied FrameColumn[] IS the columns — there is
 * nothing to default from") described only the first and was read as describing both.**
 * That reading is why every surface in the estate still hand-writes a full column list it
 * no longer has to.
 *
 * **No manifest ⇒ pure passthrough.** `hostColumns` is returned untouched, so there really
 * is nothing to default from and the host owns the whole set + its order. This is the
 * pre-manifest behavior, kept byte-identical so existing surfaces migrate for free.
 *
 * **A manifest ⇒ the MANIFEST is the columns.** The column SET and its ORDER come entirely
 * from `list-column` participation — every participating node, sorted by `sort` — and each
 * field's `header` defaults to the manifest's `label`. `hostColumns` is no longer the set:
 * it is a **per-field override map**, consulted only for fields the manifest already
 * carries, supplying `header` / `sortField` / `cell` (host-closure-wins-by-field). Passing
 * ZERO host columns is therefore legal and complete — it yields the full manifest-derived,
 * sort-ordered set. A host column naming a field with NO `list-column` participation is a
 * wiring error (throws in dev, passes through in prod); it cannot add a column, because
 * there is no participation entry to add one from.
 *
 * **A manifest also decides how a cell RENDERS.** `list-column` participation carries a
 * `widget` name, a column kind, and a column kind is a widget (ruling 01 §4): the name resolves
 * through `resolveWidgetFor` in the `list-column` context against `registry`, where frame registers
 * its kinds (`text` / `badge` / `badges` / `number` / `date`) scoped to `list-column`, and the
 * resolved component mounts through seam's `widgetProps`. A name nothing binds draws the unbound
 * marker; a stock RJSF name, or no name, falls to the default cell. Only the column's own entry
 * resolves: the node's form binding (`x-widget`) never reaches a list cell. A host `cell` still
 * wins by field. `cellSource` records which of the two produced the renderer, because one
 * downstream consumer — the `row-cell` editable-in-place wiring in `ListShell` — keys off
 * "did a HOST supply a cell", and a synthesized one must not be mistaken for that.
 *
 * A field may be a DOTTED pointer (`commerce.plan`) when a producer above frame folds a named
 * sub-projection onto the row. Nothing here needs to change for it: `byNode` is keyed by the full
 * pointer, so participation lookup, ordering and the host-column check all match on the dotted
 * string as-is. Depth only matters where the VALUE is read — see `getPath`.
 */
declare const resolveColumns: ResolveColumns;

/**
 * Frame's own row-actions column, rendered from the resource's `#[RowActions]` declaration.
 *
 * Three flagship surfaces had copy-pasted this component verbatim — same `useRemoveResource`,
 * same `window.confirm`, same trash icon — differing only in the noun, which the declaration
 * was already carrying two fields away (`singularLabel`).
 *
 * ⚠️ Two gates, and they are not the same question. `actions` is what the RESOURCE declared
 * (a presentation fact, resolved from the manifest); `can('delete', resource)` is what THIS
 * ACTOR may do. Neither substitutes for the other, and folding them would be the estate's
 * recurring defect — a presentation default silently revoking, or silently re-opening, a
 * capability someone else declared.
 *
 * Styling is inline + primitives only, never class names: a host's Tailwind does not scan
 * `node_modules`, so a `className` here renders correct markup with no styles behind an
 * HTTP 200. The inline rules also out-specify whatever the host's Button primitive brings,
 * which is what keeps this a quiet ghost icon rather than a solid primary button per row.
 */
declare function DefaultRowActions({ record, resource, actions, singularLabel, }: RowActionsSlotProps): react.JSX.Element | null;
/**
 * A record read answered 404 — a DISTINCT terminal state from a failed read (api-surface-coherence /
 * C17). "Not found" is final: retrying a 404 just 404s again, so unlike `DefaultErrorState` it offers
 * no retry. The host detail sheet imports this so a 404 there renders the SAME not-found state.
 */
declare function DefaultNotFound({ message }: {
    message?: string;
}): react.JSX.Element;
declare function DefaultPagination(props: PaginationSlotProps): react.JSX.Element;
/**
 * Default form body — seam's SchemaForm. Both form modes render through the same SchemaForm:
 * `enriched` draws each declared widget, `bare` (`plainData`) draws inferred controls. The
 * enrich/refine affordance rides a FormIntentBus on formContext (not props).
 */
declare function DefaultFormBody(props: FormBodySlotProps): react.JSX.Element;

type RouteComponent = ComponentType<Record<string, never>>;
type GuardComponent = ComponentType<{
    children: React.ReactNode;
}>;
interface RouteRegistry {
    registerRoute(routeName: string, component: RouteComponent): void;
    hasRoute(routeName: string): boolean;
    resolveRoute(routeName: string): RouteComponent | undefined;
    routeNames(): string[];
}
interface GuardRegistry {
    registerGuard(key: string, component: GuardComponent): void;
    hasGuard(key: string): boolean;
    resolveGuard(key: string): GuardComponent | undefined;
}
/**
 * A shell layout component — a hand-written layout that owns its `<Outlet/>` + chrome
 * (tabs, headers). Generated leaves carrying that shell key nest INSIDE it (realm-
 * architecture ticket 03). It takes no props; it renders the router `<Outlet/>` itself.
 */
type ShellComponent = ComponentType<Record<string, never>>;
/**
 * The shell registry — the third name→component binding beside routes + guards: it maps
 * a `RouteContextEntry.shell` key to the layout component the generator nests that leaf
 * under. `null`/`'app'` is the top-level (no-shell) case and is never looked up here.
 */
interface ShellRegistry {
    registerShell(key: string, component: ShellComponent): void;
    hasShell(key: string): boolean;
    resolveShell(key: string): ShellComponent | undefined;
}
declare function createRouteRegistry(): RouteRegistry;
declare function createGuardRegistry(): GuardRegistry;
declare function createShellRegistry(): ShellRegistry;
/**
 * Boot invariant (spec §7): every RouteContextEntry must bind to a `routeName`
 * present in the RouteRegistry, and no `routeName` may be declared twice across the
 * manifest. Throws on a duplicate or an unbound name so a missing binding fails
 * loudly at boot, not silently at navigation — the same discipline the widget
 * registry enforces.
 *
 * `mounts: 'redirect'` and standalone pages are still bound components in the
 * registry (a redirect leaf is a component that navigates), so every entry is
 * checked uniformly.
 */
interface AssertRouteContextOptions {
    /**
     * What an unbound `routeName` means. `'throw'` (the default, and today's behaviour) keeps the boot
     * invariant; `'report'` hands it to `onUnbound` instead, which is what a host running a `mounts`
     * fallback wants — there, an unbound name is not a defect, it is the ordinary case.
     *
     * ⚠️ **Only this arm is configurable.** The duplicate-`routeName` and non-string-`path` throws below
     * stay unconditional at every setting, because a typo must stay visible: a duplicated route identity
     * and a nested path are author errors no dispatcher can rescue, and relaxing them to make the
     * fallback usable would trade a loud boot failure for a silently missing page.
     */
    unbound?: 'throw' | 'report';
    /** Called per unbound entry when `unbound: 'report'`. Never called under `'throw'`. */
    onUnbound?: (entry: RouteContextEntry) => void;
}
declare function assertRouteContext(entries: RouteContextEntry[], registry: RouteRegistry, options?: AssertRouteContextOptions): void;
/**
 * One generated router leaf — the shape react-router's `RouteObject` accepts (a `path`
 * + an `element`, and — for a shell layout — `children`), produced without a react-router
 * dependency in the foundation. A shell parent carries `children` + a layout `element`
 * (no leaf component); a flat leaf carries `element` + no children.
 */
interface RealmRouteObject {
    path: string;
    element: ReactElement;
    children?: RealmRouteObject[];
}
interface RealmRouteRegistries {
    /** Binds each leaf's `routeName` → the component it mounts. */
    routes: RouteRegistry;
    /** Binds each leaf's `guard` key → the guard component wrapping it. */
    guards: GuardRegistry;
    /**
     * Binds each leaf's `shell` key → the layout it nests under. Optional: absent (or a
     * leaf whose `shell` is null/`'app'`/unregistered) means the leaf stays top-level — so
     * a flat realm (the operator console) passes no shells and behaves exactly as before.
     */
    shells?: ShellRegistry;
    /**
     * Hand-written child routes to append INSIDE a shell's layout, keyed by shell key — the
     * bespoke + record-nested routes a section keeps hand-authored (`silos/:id/*`,
     * `scopes/:id/golden`, the section overview) which live under the same layout as the
     * generated leaves but aren't manifest resources.
     */
    shellChildren?: Record<string, RealmRouteObject[]>;
    /**
     * Called when a leaf's `routeName` has no bound component. `assertRouteContext` is
     * the loud boot invariant; this is the soft per-leaf fallback so one unbound name
     * skips its leaf rather than crashing the whole realm (the host can dev-warn).
     */
    onUnbound?: (entry: RouteContextEntry) => void;
    /**
     * Last resort for a leaf no `registerRoute()` bound: render it from its DECLARED `mounts` verb.
     * `createMountDispatcher` is the supplied one; any `(entry) => RouteComponent | undefined` works.
     *
     * ⚠️ **Consulted only after `resolveRoute()` misses, and that order is the whole contract.** Every
     * existing `registerRoute()` call keeps winning, so `registerRoute` becomes an OVERRIDE rather than
     * the only path — a host that binds nothing new behaves exactly as it did. A fallback that returns
     * `undefined` (a decline) is also byte-identical to today: the leaf is skipped and `onUnbound` fires,
     * which is what happens with no fallback at all.
     */
    fallback?: (entry: RouteContextEntry) => RouteComponent | undefined;
    /**
     * Called for a leaf whose NAMED guard no `registerGuard()` bound. Such a leaf fails CLOSED: it renders a refusal
     * (`data-page-state="forbidden"`), never its page. Without this hook the missing key is reported with
     * `console.error`. A guarded page must never render unguarded because a host forgot to bind the guard.
     */
    onUnguarded?: (entry: RouteContextEntry) => void;
}
/**
 * Expand a realm's flat `RouteContext` into router leaves: resolve each `routeName` to its
 * component and, when the leaf carries a `guard`, wrap the element in the guard component.
 *
 * Shell-aware (realm-architecture ticket 03): a leaf whose `shell` resolves in the shell
 * registry is nested under that shell's layout — the generator groups such leaves by shell
 * key, wraps each group in `{ path: shellKey, element: <Layout/>, children: [...] }` (the
 * layout owns the `<Outlet/>` + chrome), and appends any hand-written `shellChildren` for
 * that shell. Leaves with no registered shell stay top-level. Realm-agnostic — no realm
 * names, no tenancy, no RBAC; the host supplies the entries + registry bindings and slots
 * the result under the realm's routeBase. Shell groups emit in first-seen order.
 */
declare function buildRealmRoutes(entries: RouteContextEntry[], registries: RealmRouteRegistries): RealmRouteObject[];

/**
 * The `mounts` fallback dispatcher — the thing that lets a manifest entry render **without a host
 * having hand-bound a component for it**.
 *
 * `RouteContextEntry.mounts` has always been a declared verb (`'list' | 'edit' | 'detail' | 'widget' |
 * 'redirect'` — {@link RouteMounts} in `types.ts`), and until now only `'widget'` had a runtime
 * consumer. Every other leaf reached its component through `RouteRegistry.registerRoute(name, C)` at the
 * host, which means the declaration said what a route renders and something else decided it.
 *
 * ## A fallback, never a replacement
 *
 * `buildRealmRoutes` consults this only **after** `resolveRoute(name)` misses:
 * `resolveRoute(name) ?? fallback?.(entry)`. Every existing `registerRoute()` call keeps winning, so
 * `registerRoute` becomes an **override** rather than the only path. At the one host that uses this API
 * today that is 50 bindings, all of which behave exactly as before.
 *
 * ## Declining is a first-class outcome
 *
 * Returning `undefined` means *"I cannot render this"*, and the caller then behaves byte-identically to
 * today — the leaf is skipped and `onUnbound` fires. That matters because this dispatcher is deliberately
 * **not** able to render everything:
 *
 * | `mounts` | dispatched? |
 * | --- | --- |
 * | `'widget'` | yes — {@link WidgetShell}, which has been its consumer all along |
 * | `'edit'` / `'detail'` | yes, **when `resolveId` is supplied** — see below |
 * | `'list'` | yes, **when a `ContextManifest` is reachable for the resource** (or `columnsFor` supplies columns) |
 * | `'redirect'` | **never**, and this is structural — see below |
 *
 * ## ⚠️ `'redirect'` is uncarriable, not unimplemented
 *
 * `RouteMounts` includes `'redirect'` and **nothing can carry a redirect target**. The PHP declaration
 * (`Schemastud\Frame\Registry\RouteContextEntry`) has eight constructor parameters — `routeName`, `path`,
 * `shell`, `lazy`, `guard`, `mounts`, `widget`, `resource` — and the TypeScript interface mirrors them
 * exactly. There is no `redirect` field on either side, so an entry can say *that* it redirects and never
 * *where*. Implementing it here would mean inventing a destination.
 *
 * That gap is also the origin of a documented wrong premise: `RouteContextEntry`'s own docblock describes
 * a `{ redirect: path }` object form and points the reader at *"see $widget/$redirect"* — a constructor
 * parameter that has never existed. A careful session read that sentence and shipped three wrong
 * structural claims off it. **Adding the field is a declaration change and belongs on the PHP side
 * first**; until then the honest behaviour is to decline and say why, which is what `onDecline` reports.
 *
 * ## Why the host still has to supply the lookups
 *
 * Frame is deliberately **react-router-free** — `buildRealmRoutes` emits a plain `{ path, element }` and
 * the host owns the router call. So this dispatcher cannot call `useParams()` to find the record id, and
 * it cannot fetch the resource's manifest for itself. Both arrive as injected resolvers, and each one's
 * absence disables exactly the cases that need it rather than producing a broken shell. That keeps the
 * dependency visible instead of smuggling a router (or a transport) into the foundation.
 *
 * ## ⚠️ `columnsFor` used to be REQUIRED for a list, and that was wrong
 *
 * `'list'` originally declined unless `columnsFor` returned a non-empty array, on the belief that a list's
 * columns are something only a host can know. They are not: `resolveColumns` already returns the **full**
 * manifest-derived, `sort`-ordered set from `list-column` participation when handed a manifest and ZERO
 * host columns — host columns are a per-field override map (`header` / `sortField` / `cell`), never the
 * set. So the requirement demanded from the host precisely the thing the declaration already carried, and
 * a `list` leaf that had everything it needed declined anyway. `columnsFor` stays, as the optional
 * override seam it always was.
 *
 * Both lookups are read at **render** time, not dispatch time, because at a real host each is backed by a
 * query hook: at dispatch the manifest is typically still in flight, and reading it there would freeze
 * `undefined` into the component for the life of the route.
 */
interface MountDispatcherOptions {
    /** Resolve list navigation at render time; hosts may use their router hooks here. */
    onOpenFor?: (entry: RouteContextEntry) => ListShellPropsOf<string>['onOpen'];
    /**
     * Reads the record id for an `edit`/`detail` leaf from wherever the host's router keeps it — a hook
     * called during render, so `() => useParams().id ?? null` is the expected wiring. Absent, `edit` and
     * `detail` decline: an edit shell with no id would silently render a CREATE form on an edit route.
     */
    resolveId?: (entry: RouteContextEntry) => string | null;
    /**
     * OPTIONAL per-field column overrides for a `list` leaf — `header` / `sortField` / `cell` for fields
     * the manifest already carries. It is **not** the column set (see the docblock above) and its absence
     * no longer disables `list`. Called during the dispatched component's render.
     */
    columnsFor?: (resource: string) => FrameColumn[] | undefined;
    /**
     * The resource's context manifest. This is what makes a `list` leaf renderable: its `list-column`
     * participation IS the column set and order. A hook is the expected wiring
     * (`(resource) => useManifest(realm).data?.contexts[resource]`), so it is called during the dispatched
     * component's render, never at dispatch time. The SAME `ManifestLookup` the injection's
     * `manifestFor` carries (realm-dashboards ticket 03): a host wires one function for both.
     * Optional: absent, a `list` leaf reads the injection's own lookup, which a kit supplies.
     */
    manifestFor?: ManifestLookup;
    /**
     * The resource's DECLARED form mode — `AdminResourceDefinition.form`, which the manifest
     * always carries (`enriched` unless the resource chose `bare`).
     *
     * ⚠️ Its absence used to be invisible. This dispatcher constructed `EditShell` with no
     * `form` prop at all, so every dispatcher-mounted `edit`/`detail` route took the shell's
     * own default no matter what the resource declared — the declaration nominated and nothing
     * authorized. Both defaults are now `enriched`, so a missing lookup draws declared widgets,
     * but a resource that chose `bare` still needs this lookup to be honoured. A hook is the expected wiring
     * (`(resource) => useManifest(realm).data?.resources[resource]?.form`), so it is called
     * during the dispatched component's render, never at dispatch time.
     */
    formFor?: (resource: string) => FormMode | undefined;
    /**
     * Called with the reason whenever a leaf is declined. Not an error channel — a decline is a normal,
     * expected outcome — but an unexplained one is the estate's recurring *instrument that reports
     * success by not running*, so the reason is always offered rather than swallowed.
     */
    onDecline?: (entry: RouteContextEntry, reason: string) => void;
}
/** What `buildRealmRoutes` accepts as its fallback: a component for this entry, or `undefined` to decline. */
type MountDispatcher = (entry: RouteContextEntry) => RouteComponent | undefined;
/**
 * Build a dispatcher over the declared `mounts` verb. Pure and host-agnostic: it names no resource, no
 * route and no realm — it reads the entry it is handed.
 */
declare function createMountDispatcher(options?: MountDispatcherOptions): MountDispatcher;

/**
 * Extra `useQuery` knobs a caller may thread onto a Frame read (e.g. `refetchInterval`,
 * `staleTime`, `enabled`). `queryKey`/`queryFn` stay owned by Frame — the cache namespace is
 * the package's, not the host's — so they're excluded. Additive and backward-compatible: every
 * call site that omits `options` behaves exactly as before.
 */
type ResourceQueryOptions<T> = Omit<UseQueryOptions<T, Error, T>, 'queryKey' | 'queryFn'>;
/** Build a resource query key; existing resource/record prefixes remain usable. */
declare function resourceQueryKey(transport: FrameTransport, resource: string, ...parts: readonly unknown[]): readonly ["frame", string, ...unknown[], string];
/** The declared schema; purpose selects request/write or response/read projection. */
declare function useFormSchema(resource: string, form: FormMode, purpose?: SchemaPurpose): UseQueryResult<SchemaNode, Error>;
/** A page of the key's rows. */
declare function useResourceList<K extends ResourceKey = ResourceKey>(resource: K, params: Record<string, string>, options?: ResourceQueryOptions<ResourcePage<RowOf<K>>>): UseQueryResult<ResourcePage<RowOf<K>>, Error>;
/** One record of the key: the read row, or the edit projection the socket returns to a signed-in editor. */
declare function useResourceRecord<K extends ResourceKey = ResourceKey>(resource: K, id: string | null, options?: ResourceQueryOptions<RowOf<K> | EditOf<K>>): UseQueryResult<RowOf<K> | EditOf<K>, Error>;
/** Save the key's record (create when `id` is null). The payload stays `unknown` (ruling 03, Q16). */
declare function useSaveResource<K extends ResourceKey = ResourceKey>(resource: K): UseMutationResult<RowOf<K> | CreateResultOf<K>, Error, {
    id: string | null;
    data: unknown;
}>;
/** Delete one of the key's records. */
declare function useRemoveResource<K extends ResourceKey = ResourceKey>(resource: K): UseMutationResult<void, Error, string, unknown>;

type FrameCrudTransport = Pick<FrameTransport, 'list' | 'get' | 'getFormSchema' | 'create' | 'save' | 'remove'>;
interface ResourceFilterHttp {
    /** The same resource root used by CRUD, including the host's realm/prefix. */
    resourceUrl(resource: string): string;
    read<T>(url: string, params?: Record<string, string>): Promise<T>;
    /**
     * Send a JSON request and resolve its parsed body — what a declared ACTION needs (ADR-0005), since
     * an action's URL is the producer's own mount, outside the frame socket. Reject with a
     * {@link FrameActionError} on a non-2xx answer. Optional: without it the composed transport has no
     * `invoke`, and frame draws no action buttons.
     */
    write?<T>(method: string, url: string, body?: unknown): Promise<T>;
}
/** Stable address context for the lifetime of a resource transport. Recreate the transport when it changes. */
interface ResourceTransportOptions {
    collectionByResource?: Readonly<Record<string, string>>;
}
/** Compose resource filter reads and declared saved-view CRUD over the host's client. */
declare function createResourceTransport(crud: FrameCrudTransport, http: ResourceFilterHttp, options?: ResourceTransportOptions): FrameTransport;

/** Validate the two declared HTTP envelopes; never synthesize pagination metadata. */
declare function parseResourcePage<Result>(value: ResourcePage<Result>): ResourcePage<Result>;
declare function parseResourcePage(value: unknown): ResourcePage<Row>;

interface HttpTransportOptions extends ResourceTransportOptions {
    /** Where laravel-frame's socket is mounted. Default `/frame`, its default route prefix. */
    prefix?: string;
    /** The manifest's address. Default `{prefix}/manifest`; a host that mounts one manifest per realm passes the realm's. */
    manifestUrl?: string;
    /** The fetch to send with. Default the global `fetch`; a test passes a fake. */
    fetch?: typeof fetch;
    /** Headers merged over the defaults on every request; a function is read per request. */
    headers?: HeadersInit | (() => HeadersInit);
}
/**
 * Frame's HTTP adapter: a `FrameTransport` over laravel-frame's socket, with the manifest read.
 * Every request is the published session request (`@schemastud/frame/session`): same-origin, JSON headers and the
 * XSRF token; every non-2xx answer,
 * reads included, rejects with a `FrameActionError` carrying the status and the parsed body, so
 * `isNotFound` and a 422's field errors work the same on every read and write.
 *
 * The envelopes are `FrameResourceController`'s: a list page `{data,total,page,perPage}` (or a
 * cursor page), a record `{data}`, a schema as raw JSON Schema, a create or save `{data}`, a delete 204.
 */
declare function createHttpTransport(options?: HttpTransportOptions): FrameTransport;

/**
 * A transport read that answered 404 is a DISTINCT terminal state — "this record is not
 * here" — not the same thing as "the read failed" (5xx/network). The shells and the host
 * detail sheet branch on this so a missing record reads as not-found rather than a generic
 * error or (the older bug) a perpetual spinner.
 *
 * Detected by a numeric `status` of 404 on the thrown error. Both `FrameActionError` (which
 * carries `status`) and the host transport's read errors expose it; anything without a 404
 * `status` stays a generic error, so a plain `new Error(...)` is never mistaken for not-found.
 */
declare function isNotFound(error: unknown): boolean;

/**
 * A registry for **canonical whole-object forms** keyed by schema identity — the peer of the
 * per-field `WidgetRegistry`, resolved at the object root. Register a form by its schema `kind`
 * (the ergonomic key) or a `(schema) => boolean` predicate (the escape hatch for precision/
 * collisions). Resolution order is **root `x-widget` > form-by-kind > form-by-predicate > generic**:
 * an explicit root `x-widget` always wins (heavyweight editors — circuit-graph etc. — are
 * unaffected), then a registered kind, then a predicate, else the generic schema form.
 *
 * Optional on {@see FrameInjection}: absent, every object root renders the generic form (zero
 * migration). `DefaultFormBody` consults it before falling through to `SchemaForm`.
 */
declare function createFormResolver(): FormResolver;

/**
 * A single live side-panel entry — the payload a deep `MasterDetail presentation="sheet"`
 * (via `FramePrimitives.SidePanel`) publishes for the shell-level overlay to render.
 */
interface FrameSidePanelEntry {
    /** Stable per-mount id (the publishing SidePanel owns it for its lifetime). */
    id: string;
    open: boolean;
    title?: ReactNode;
    children: ReactNode;
    /** Route the close back to the publisher's controlled `onOpenChange`. */
    onOpenChange: (open: boolean) => void;
}
interface FrameSidePanelState {
    /** Ordered stack of live side-panels (later = on top; supports cascade sheets). */
    panels: FrameSidePanelEntry[];
    /** Publish/refresh a panel's payload (idempotent by id). */
    publish: (entry: FrameSidePanelEntry) => void;
    /** Remove a panel entirely (on unmount of the publishing SidePanel). */
    remove: (id: string) => void;
}
/**
 * The bridge between a deep-tree `FramePrimitives.SidePanel` invocation and the single
 * host-owned overlay contribution in the app shell. Mirrors the `useLineageDrawer` /
 * `useVersionsDrawer` pattern: the deep component only *publishes* its `{open,title,children}`
 * here; a host-owned overlay — contributed **once** into the mainframe `overlay`
 * slot — is what actually renders it. So the sheet detail routes through the mainframe
 * overlay slot, never nesting a second portal or mainframe.
 *
 * The bridge is manifest-aware frame machinery (the deep-tree → shell-overlay publish/remove
 * seam), so it lives in `@schemastud/frame`; the host keeps only the overlay contribution
 * that reads from this store and renders it into its own portal/sheet.
 */
declare const useFrameSidePanelStore: zustand.UseBoundStore<zustand.StoreApi<FrameSidePanelState>>;

export { ActionInputOf, ActionKeyOf, ActionResult, type AssertRouteContextOptions, CardLinkRenderer, ContextManifest, CreateResultOf, DefaultFormBody, DefaultNotFound, DefaultPagination, DefaultRowActions, EditOf, EditShell, type EditShellOptions, EditShellProps, type EditShellState, EditSlots, FormBodySlotProps, FormMode, FormResolver, FrameCan, FrameColumn, type FrameCrudTransport, FrameHooks, FrameInjection, type FrameKit, type FrameKitOptions, FrameManifest, FrameNotice, FramePrimitives, FrameProvider, type FrameRegistryOptions, type FrameSidePanelEntry, FrameTransport, type GuardComponent, type GuardRegistry, type HttpTransportOptions, IconResolver, ListShell, ListShellProps, ListSlots, ManifestLookup, type MountDispatcher, type MountDispatcherOptions, PaginationSlotProps, type RealmRouteObject, type RealmRouteRegistries, ResolveColumns, type ResourceActionCall, ResourceActionDefinition, type ResourceFilterHttp, ResourceKey, ResourcePage, type ResourceTransportOptions, type RouteComponent, RouteContextEntry, type RouteRegistry, Row, RowActionsSlotProps, RowOf, SchemaPurpose, SchemaView, type SchemaViewProps, type ShellComponent, type ShellRegistry, assertRouteContext, buildRealmRoutes, createFormResolver, createFrameKit, createFrameRegistry, createGuardRegistry, createHttpTransport, createMountDispatcher, createResourceTransport, createRouteRegistry, createShellRegistry, isNotFound, parseResourcePage, registerFrameWidgets, resolveColumns, resourceQueryKey, useEditShell, useFormSchema, useFrameInjection, useFrameSidePanelStore, useRemoveResource, useResourceAction, useResourceList, useResourceRecord, useSaveResource };
