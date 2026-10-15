import * as react from 'react';
import { ReactNode, ComponentType, ReactElement } from 'react';
import { F as FrameInjection, C as ContextManifest, L as ListShellProps, E as EditShellProps, W as WidgetShellProps, R as Row, a as RouteContextEntry, b as FrameColumn, M as ManifestLookup, c as FormMode, d as ResolveColumns, N as NodeParticipation, e as FormResolver, f as FrameContext, g as CardWidgetProps, S as SummaryPayload, h as NavTilePayload, i as WelcomePayload, j as CardWidgetOptions, D as DashboardRow, I as IconResolver, k as CardLinkRenderer, l as FrameTransport, m as ResourcePage, n as ResourceActionDefinition, o as FrameNotice, p as CardsSlotProps, q as CellSlotProps, r as ErrorSlotProps, s as FormBodySlotProps, P as PaginationSlotProps, t as RowActionsSlotProps, u as SaveBarSlotProps, T as ToolbarSlotProps } from './types-DBk4K56z.js';
export { A as ActionResult, v as AdminResourceDefinition, w as CollapseMode, x as CursorPaginated, y as DetailPresentation, z as EditSlots, B as FrameAction, G as FrameCan, H as FrameHooks, J as FrameLayout, K as FrameLayoutProps, O as FrameLayoutShell, Q as FrameLayoutSidePanel, U as FrameLayoutVariant, V as FrameLayoutWidth, X as FramePrimitives, Y as INHERITS, Z as KNOWN_CONTEXTS, _ as ListSlots, $ as MasterDetail, a0 as MasterDetailProps, a1 as OverviewPayload, a2 as Paginated, a3 as RealmDefinition, a4 as RealmScope, a5 as RouteMounts, a6 as SingleColumn, a7 as SingleColumnProps, a8 as SubNavColumn, a9 as SubNavColumnProps, aa as SubNavItem, ab as SubmittedContext, ac as SubmittedHandler, ad as SummaryFigure, ae as WelcomeAction, af as createFrameHooks } from './types-DBk4K56z.js';
import { SchemaNode, WidgetRegistry, ResolvedWidget, SkinComponent, SkinRegistry } from '@schemastud/seam';
export { FormIntentBus, SchemaFetcher, SchemaForm, SchemaNode, WidgetRegistry, createFormIntentBus, createWidgetRegistry, widgetFormContext } from '@schemastud/seam';
import * as zustand from 'zustand';
import * as _tanstack_react_query from '@tanstack/react-query';
import { UseQueryOptions } from '@tanstack/react-query';
import { FilterSchema, ResourceMutationPermissions } from '@schemastud/facets';
export { FacetsPrimitives, FacetsTransport, FilterSchema, UseUrlState, useBrowserUrlState } from '@schemastud/facets';
import '@schemastud/ui';

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
/** Read the injection bundle; throws if a frame shell renders outside a provider. */
declare function useFrameInjection(): FrameInjection;

/**
 * Does this resource's list render as CARDS (realm-dashboards ticket 03)? True when the root
 * `list-item` entry participates AND resolves a COMPONENT through the registry — a declared
 * widget name the registry knows, or a host-registered `list-item` context default.
 *
 * ⚠️ Participation alone is deliberately NOT the gate, and the reason is measured, not
 * cautious: `splicewire/tower`'s `ThreadData` and `CompositionData` both declare a class-level
 * `#[WidgetIn('list-item')]` with no widget name AND `#[Column]` columns, and both mount as
 * `mounts: 'list'` leaves through the manifest router today. Under a participation gate each
 * would flip from its working table to a grid of `JSON.stringify(record)` — `SchemaView`'s
 * unbound scalar default is the only thing an unbound root can render (`SchemaView.tsx`'s
 * `scalar()`), and a dashboard must never show it for a real record. "Participates but nothing
 * can draw it" therefore keeps the table, byte-identically; the moment a renderer resolves,
 * cards win. The gate asks the same question the card will: can frame draw this row?
 *
 * It lives in its own module rather than in `ListShell` because `recent-list` asks it too —
 * of the TARGET resource, to decide whether to render an item through its own `list-item`
 * binding — and a card importing the shell would close an import cycle.
 */
declare function listItemRendersCards(manifest: ContextManifest, schema: SchemaNode, registry: WidgetRegistry): boolean;

/**
 * The list surface, generalized from the app substrate. Renders any resource from
 * its schema + host-supplied columns with no per-resource UI code: the facets bar
 * is fully schema-driven (rides FilterSchemaController where a filter schema
 * exists), pagination is transport-driven, columns resolve through the columns seam.
 */
declare function ListShell({ resource, columns, onOpen, slots, manifest, onCellCommit, paginationPlacement, }: ListShellProps): react.JSX.Element;

/**
 * The edit surface (create when id === null; detail = <EditShell readOnly/> — no
 * distinct DetailShell). Renders a form from `transport.getFormSchema` (the server's
 * forRequest() output), tracks edits, and submits via `transport.save`. The host's
 * persist strategy sits BELOW the transport; the shell is blind to which strategy
 * runs. Every slot has a frame default the host may override.
 */
declare function EditShell(props: EditShellProps): react.JSX.Element;

type FlushFn = () => void | Promise<void>;
/** The node-attrs channel impl a widget plugs in (real impl lands in ED-07). */
interface NodeAccess {
    getNode(nodeId: string): unknown | null;
    setNodeAttrs(nodeId: string, attrs: Record<string, unknown>): void;
}
/** A required-child deficit: a parent short of `min` children of a category (ED-13). */
interface RequiredSlot {
    parentId: string;
    category: string;
    min: number;
    filled: number;
}
/** The document conformance the editor publishes for the status bar (ED-14). */
interface Conformance {
    /** PM descendant node count. */
    nodes: number;
    /** Sum of every required-child minimum across the doc. */
    requiredTotal: number;
    /** How many required slots are satisfied. */
    requiredFilled: number;
    /** Whether a loaded doc satisfies the PM schema. */
    grammarValid: boolean;
    /** Ids of structurally-incomplete nodes (absent-category on the parent id,
     * present-but-empty on the child id — both listed). */
    incompleteNodeIds: readonly string[];
    /** Per-parent required-category deficits (ED-13 B7) — drives the Missing cards. */
    requiredSlots?: readonly RequiredSlot[];
}
interface EditShellMountValue {
    selectedNodeId: string | null;
    selectNode(nodeId: string | null): void;
    /** Imperative scroll-into-view; delegates to the widget's registered handler. */
    revealNode(nodeId: string): void;
    registerRevealHandler(handler: (nodeId: string) => void): () => void;
    dirty: boolean;
    markDirty(dirty: boolean): void;
    /** A commit is in flight — drives the "Saving…" pill state (ED-10). */
    saving: boolean;
    markSaving(saving: boolean): void;
    registerFlush(flush: FlushFn): () => void;
    flush(): Promise<void>;
    candidates: readonly unknown[];
    publishCandidates(candidates: readonly unknown[]): void;
    registerInsertHandler(handler: (candidate: unknown) => void): () => void;
    insert(candidate: unknown): void;
    registerNodeAccess(access: NodeAccess): () => void;
    getNode(nodeId: string): unknown | null;
    setNodeAttrs(nodeId: string, attrs: Record<string, unknown>): void;
    conformance: Conformance | null;
    publishConformance(conformance: Conformance | null): void;
}
/**
 * Create the mount controller. State (selection / dirty / candidates) is React
 * state so panes re-render; the registration slots (flush set, reveal / insert /
 * node-access handlers) are refs a widget plugs into and unplugs on unmount.
 */
declare function useEditShellMountController(): EditShellMountValue;
declare function EditShellMountProvider({ value, children, }: {
    value: EditShellMountValue;
    children: ReactNode;
}): react.JSX.Element;
/** Read the mount handshake; throws outside a `mounts:'widget'` route. */
declare function useEditShellMount(): EditShellMountValue;

/**
 * The pure, props-driven surface: resolve the named heavyweight widget from the
 * registry and mount it full-surface over the record. The `edit` context never
 * suppresses a heavyweight widget (only `row-cell` does), so it mounts whole.
 */
declare function WidgetSurface({ schema, record, widget, registry: registryProp, readOnly, onChange, onSubmit, mount: mountProp, }: {
    schema: SchemaNode;
    record?: Row;
    widget: string;
    registry?: WidgetRegistry;
    readOnly?: boolean;
    onChange?: (data: Row) => void;
    onSubmit?: (data: Row) => void;
    /** The EditShellMount handshake; a standalone surface makes its own. */
    mount?: EditShellMountValue;
}): react.JSX.Element;
/**
 * The route shell (peer of EditShell): fetches the resource's form schema +
 * record and mounts its heavyweight widget full-surface. `splicewire` mode so the
 * widget receives the host-enriched schema. Non-widget routes (EditShell /
 * ListShell) are untouched, and heavyweight-in-cell suppression still lives in
 * `resolveWidgetFor` unchanged.
 */
declare function WidgetShell({ resource, id, widget, readOnly, onSaved }: WidgetShellProps): react.JSX.Element;

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
    onOpenFor?: (entry: RouteContextEntry) => ListShellProps['onOpen'];
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
     */
    manifestFor?: ManifestLookup;
    /**
     * The resource's DECLARED form mode — `AdminResourceDefinition.form`, which every
     * `ParticleResource`/`AdminResource` in the estate already states (`form: 'bare'`).
     *
     * ⚠️ Its absence used to be invisible. This dispatcher constructed `EditShell` with no
     * `form` prop at all, so every dispatcher-mounted `edit`/`detail` route took the shell's
     * own `'bare'` default no matter what the resource declared — the declaration nominated
     * and nothing authorized. It reads as harmless today only because the one resource in the
     * estate declaring `#[Widget]` names a `combobox` registered nowhere, so `'enriched'`
     * currently renders the same pixels as `'bare'`; the moment a host registers that widget
     * the two diverge and the route ignores the declaration. A hook is the expected wiring
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

type CollapseLevel = 0 | 1 | 2;
interface CollapseModes {
    palette: 'pane' | 'rail' | 'drawer';
    inspector: 'pane' | 'drawer';
    canvasFullBleed: boolean;
}
declare function deriveCollapseLevel(width: number): CollapseLevel;
declare function collapseModes(level: CollapseLevel): CollapseModes;

interface FiveRegionEditShellProps {
    /** The resolved form schema the editor widget mounts over. */
    schema: SchemaNode;
    /** The record the editor edits. */
    record?: Row;
    /** The registered heavyweight editor-widget name mounted in the canvas. */
    widget: string;
    /** Widget registry (falls back to the seam context). */
    registry?: WidgetRegistry;
    readOnly?: boolean;
    /** Extra top-bar content, rendered beside the save pill / mode toggle. */
    topBar?: ReactNode;
    /** Palette region content — defaults to the hoisted PalettePane (ED-09). */
    palette?: ReactNode;
    /** Status region content — a stub until ED-14. */
    status?: ReactNode;
    /**
     * Persistence is autosave-by-default; the manual Save action shows only when
     * a host turns autosave OFF (ED-10).
     */
    autosave?: boolean;
    onSave?: () => void;
    /** Show the `Rich | Source` toggle. Defaults on; the editor always opens Rich. */
    sourceToggle?: boolean;
    /** Force a responsive collapse level (0/1/2); otherwise derived from width (ED-11). */
    collapseLevel?: CollapseLevel;
}
declare function FiveRegionEditShell({ schema, record, widget, registry, readOnly, topBar, palette, status, autosave, onSave, sourceToggle, collapseLevel, }: FiveRegionEditShellProps): react.JSX.Element;

declare function Inspector(): react.JSX.Element;

declare function PalettePane(): react.JSX.Element;

declare function MissingSlots(): react.JSX.Element | null;

declare function SavePill(): react.JSX.Element;

declare function StatusBar(): react.JSX.Element;

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
 * `widget` name — it always has, and until now nothing on the client read it, so a
 * declaration could say `#[Column('badge')]` and the host still had to hand-write the
 * closure. That name is now resolved through {@link resolveDeclaredCell} into a `cell`
 * renderer drawn from frame's derived column-kind vocabulary (`text` / `badge` / `badges`
 * / `number` / `date`). Precedence is unchanged where it already existed: a host `cell`
 * still wins by field, and a kind frame does not know resolves to nothing and falls to the
 * default cell. `cellSource` records which of the two produced the renderer, because one
 * downstream consumer — the `row-cell` editable-in-place wiring in `ListShell` — keys off
 * "did a HOST supply a cell", and a synthesized one must not be mistaken for that.
 *
 * A field may be a DOTTED pointer (`commerce.plan`) when a producer above frame folds a named
 * sub-projection onto the row. Nothing here needs to change for it: `byNode` is keyed by the full
 * pointer, so participation lookup, ordering and the host-column check all match on the dotted
 * string as-is. Depth only matters where the VALUE is read — see `getPath`.
 */
declare const resolveColumns: ResolveColumns;

/** The derived vocabulary. A name outside this set falls through to the default cell. */
declare const COLUMN_KINDS: readonly ["text", "badge", "badges", "number", "date"];
type ColumnKind = (typeof COLUMN_KINDS)[number];
interface TextCellOptions {
    /** Monospace family (`var(--font-mono)`), for keys/ids/endpoints. */
    mono?: boolean;
    /** `medium` is the "primary column" weight; default inherits. */
    weight?: 'normal' | 'medium';
    /** `muted` reads as secondary (`var(--muted-foreground)`). */
    tone?: 'default' | 'muted';
    size?: 'xs' | 'sm' | 'base';
    /** Right-ish numeric alignment for value-ish strings that are not numbers. */
    tabular?: boolean;
    /** Clamp to N lines. */
    clamp?: number;
    /** Allow breaking inside a long unbroken token (URLs). */
    breakAll?: boolean;
    /** What an empty value renders as. Default `'—'`. */
    placeholder?: string;
    /** An `italic` placeholder reads as "absent by nature" rather than "missing". */
    placeholderStyle?: 'plain' | 'italic';
}
interface BadgeCellOptions {
    /** The primitive's variant token. Default `'outline'`. */
    variant?: string;
    /** Per-VALUE variant override, e.g. `{ demo: 'outline' }`. */
    variants?: Record<string, string>;
    /** Per-VALUE label override, e.g. `{ '1': 'Declared' }` or `{ true: 'exclude' }`. */
    labels?: Record<string, string>;
    /** Monospace badge text (event names, keys). */
    mono?: boolean;
    /**
     * What an empty value renders as. ABSENT means render nothing at all, which is what
     * eight of the measured closures did (`row.kind ? <Badge/> : null`) — so it is the
     * default rather than a dash.
     */
    placeholder?: string;
}
interface BadgesCellOptions extends BadgeCellOptions {
    /** How many badges before the overflow marker. Default 3. */
    limit?: number;
    /** For an array of OBJECTS: which key holds the label. */
    labelKey?: string;
    /** A second key tried when `labelKey` is absent on the item. */
    labelFallbackKey?: string;
    /** Render `+N more` past the limit. Default true. */
    overflow?: boolean;
}
interface NumberCellOptions {
    tone?: 'default' | 'muted';
    /** Render zero as the placeholder, so an empty row reads calm. */
    zeroAsDash?: boolean;
    /** Default `'—'`. */
    placeholder?: string;
}
interface DateCellOptions {
    tone?: 'default' | 'muted';
    /** Include the time-of-day. */
    time?: boolean;
    /** Default `'—'`. */
    placeholder?: string;
}
/**
 * Resolve a declared `list-column` participation into a cell renderer, or `undefined` when
 * the participation names no kind (or one this build does not know).
 *
 * Deliberately returns a closure that renders a COMPONENT rather than raw markup: the
 * renderers read `primitives` off the injection, and a hook can only run inside a
 * component's render. This is also what keeps `resolveColumns` a pure function with an
 * unchanged signature.
 */
declare function resolveDeclaredCell(field: string, participation: NodeParticipation): ((record: Row) => ReactNode) | undefined;
/** The one component every declared kind renders through. */
declare function DeclaredCell({ kind, options, value, }: {
    kind: ColumnKind;
    options: Record<string, unknown>;
    value: unknown;
}): react.JSX.Element;

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
 * Read a possibly-DOTTED field pointer off a record: `getPath(row, 'commerce.plan')`.
 *
 * ## Why frame needs this
 *
 * A column's `field` used to be a bare property name, because a resource's row was one Data
 * class flat. It is not any more: a producer above frame may fold a named SUB-PROJECTION onto a
 * row (`row.commerce.plan`), and it declares that node in the manifest under the dotted pointer
 * `commerce.plan`. `byNode` is a plain string map, so the dotted pointer needed no schema change
 * on the wire — but every place that indexed a record FLAT by `col.field` would miss it and
 * render blank.
 *
 * Frame learns nothing about who folded the slice or why. It learns only that a field pointer
 * may have depth.
 *
 * ## Deliberately not applied everywhere a `col.field` appears
 *
 * Two neighbouring lookups take a dotted pointer and must NOT be path-resolved:
 *
 *  - `manifest.byNode[field]` is keyed by the FULL dotted pointer — flat indexing is already
 *    correct there, and traversing would look for a `byNode.commerce` node that does not exist.
 *  - a JSON Schema's `properties[field]` nests through a `properties` hop per level, so plain
 *    dot-traversal is the WRONG traversal for it. (It is also unreachable for a dotted field:
 *    the only caller is the inline-editor path, and a producer folding a slice is refused
 *    `row-cell` participation at registration precisely because a slice has no writer.)
 *
 * Missing intermediate ⇒ `undefined`, exactly as a flat miss returns today, so a column whose
 * slice is absent renders empty rather than throwing.
 */
declare function getPath(record: unknown, field: string): unknown;

/**
 * The **kind** of a schema is the terminal segment of its `$id` (e.g. `…/kind/series` → `series`).
 * Host-independent (unlike the full `$id`, which carries origin/version), so it is the stable key a
 * canonical form registers against.
 */
declare function kindOfSchema(schema: SchemaNode): string;
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
 * The schema keyword the resolver stamps the CONTEXT NAME onto before handing the
 * node to the seam registry. A declared `x-widget` name still wins (a name predicate
 * fires first for a bound node); the stamp exists so a registry can carry a
 * context-DEFAULT widget on a predicate (`s['x-frame-context'] === 'summary'`) for
 * nodes that participate without naming a widget. Stamped on the schema only — the
 * resolved-widget shape returned to callers is unchanged.
 */
declare const FRAME_CONTEXT_KEYWORD = "x-frame-context";
interface ResolvedForContext extends ResolvedWidget {
    /** Whether the node participates in this context at all. */
    participates: boolean;
    /** A widget NAME was bound but the registry resolved no component. */
    unbound?: boolean;
}
declare function resolveWidgetFor(node: SchemaNode, ctx: FrameContext, cm: NodeParticipation | undefined, // byNode[ptr][ctx]
parent: NodeParticipation | undefined, // the inherited entry (INHERITS[ctx]: edit for row-cell, summary for overview), when cascading
registry: WidgetRegistry): ResolvedForContext;

interface ResolvedSkin {
    /** The skin component to render (never null — the registry falls back). */
    skin: SkinComponent;
    /** The registry key that resolved it (the override name, or the node-type). */
    key: string;
    /** Whether an authored `x-skin` override won, or the node-type default. */
    source: 'override' | 'node-type';
    /** True when `key` had no registered skin — the block-chrome fallback rendered. */
    fallback: boolean;
}
declare function resolveSkinFor(nodeType: string, schema: SchemaNode | undefined, registry: SkinRegistry): ResolvedSkin;

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
 * The `summary` context default: a resource compressed to its figures, one `StatTile` per
 * figure. The header names the collection and, on a dashboard row, links to it. Zero
 * figures is an honest empty ("No figures."), never a blank card — an empty platform reads
 * honest zeroes, and a provider that answered nothing reads as exactly that.
 */
declare function StatRow({ value, options, row }: CardWidgetProps<SummaryPayload>): react.JSX.Element;

/**
 * The `overview` context default: a resource expanded to a card with a body — the overview's
 * `headline` large, every `figure` as a sub-tile beneath it, `period` as the subtitle, `note`
 * as a caption, and a "View all" link when the row carries an href (tower's billing snapshot,
 * generalized). A payload with no `headline` (a summary answered for an overview row, as the
 * `overview ← summary` cascade allows) leads with its first figure instead, so the card never
 * opens on an empty number. A resource that declared only a summary never lands here from a
 * dashboard: `dashboard-card` falls through to `stat-row` first, inside the SAME
 * {@link OverviewFrame} chrome this card is built from.
 */
declare function FigureCard({ value, options, row }: CardWidgetProps<SummaryPayload>): react.JSX.Element;

/**
 * A "recent N" overview for free: `overview.items` (the top-N records the summary provider
 * answered) rendered through the TARGET resource's own `list-item` binding — the activity
 * feed costs no second list renderer. The target is `row.resource` on a dashboard, else the
 * payload's own `key`; its manifest comes from the injection's `manifestFor`.
 *
 * "How does the target draw one of its rows?" has three answers, read off its root `list-item`
 * entry, and they are the same three the list shell's cards gate and `dashboard-card` give:
 *
 *  1. BOUND — the entry resolves a component (a declared name the registry knows, or a host
 *     `list-item` default). {@link listItemRendersCards} is that question, asked once; the
 *     item goes through `SchemaView`, the resource's own rendering.
 *  2. DECLARED, UNRESOLVED — the entry names a widget nothing can draw: the honest
 *     `UnboundWidget` marker in place of the list. Never a plausible default dressing a typo.
 *  3. NO NAME — no manifest reachable, no entry, no participation, or participation with no
 *     name: frame's `record-line` default, one line per item. Resolved by NAME through the
 *     registry so a host that registers a later `record-line` replaces it the ordinary way.
 *
 * Case 3 is the measured defect. An unbound root through `SchemaView` falls to its scalar
 * default (`JSON.stringify(record)`), and the display-name fallback that stood here before
 * knew only `name/title/label` — `CentralActivityData` keeps its text in `description`, so
 * the Activity card at tower and the flagship printed `5,4,3,2,1`.
 */
declare function RecentList({ value, options, row }: CardWidgetProps<SummaryPayload>): react.JSX.Element;

/**
 * `record-line` — frame's ONE-LINE rendering of a record whose resource binds no `list-item`
 * widget of its own. `recent-list` draws each item with it when the TARGET's root `list-item`
 * declares NO name. Measured at tower and the flagship: the Activity overview card printed
 * `5,4,3,2,1`, because `splicewire/tower`'s `CentralActivityData` carries `description` /
 * `event` / `created_at` and no `name` / `title` / `label` — an unbound root through
 * `SchemaView` falls to its scalar default, and a display-name fallback that knows only three
 * field names falls through to the id.
 *
 * Three slots, each optional, read by field-name convention off the record the server sent:
 *   text  — the first present of `title | label | name | description | summary`
 *   badge — `event`, else `status`
 *   time  — the first present of `created_at | occurred_at | updated_at`: short relative
 *           within a week (`2h ago`, `yesterday`), the locale date beyond it, and the RAW string
 *           when unparseable — never `Invalid Date`, never a dash for a populated-and-wrong value
 * The id is the text only when no text field exists: the last resort, not the default.
 *
 * A NAMED widget only. It is deliberately NOT registered as the `list-item` context default:
 * that predicate would make every participates-but-unbound root resolve a component, and
 * `listItemRendersCards` would flip tower's threads/compositions tables into card grids.
 * `recent-list` picks it by name, and only where no name was declared — a declared name the
 * registry does not know stays the honest unbound marker there, as it does everywhere else.
 */
declare function RecordLine({ value }: CardWidgetProps<Row>): react.JSX.Element;
/**
 * Short relative within a week, the locale date beyond it, the raw string when unparseable.
 * `now` is a parameter so a test pins it; the widget passes the wall clock.
 */
declare function formatRecordTime(raw: string, now?: number): string;

/**
 * A jump-to tile — the realm's nav manifest drawn as a door. `{ label, icon, href,
 * description? }`, nothing else: the tile is realm-blind and reads only what the nav
 * contribution stamped. With no icon resolver (or an unknown name) it draws the label's
 * initial in the glyph well rather than nothing, so a row of tiles keeps its rhythm.
 *
 * The whole tile IS the link, so it goes through the host's injected `renderLink` like every
 * other anchor a card draws — a nav tile that full-page-reloads is the worst offender of the
 * five, since navigation is the only thing it does.
 */
declare function NavTile({ value, options }: CardWidgetProps<NavTilePayload>): react.JSX.Element | null;

/**
 * The dashboard's first-run / nothing-yet panel — what a `{realm}-dashboard` row of context
 * `'welcome'` draws. The server sends that row only when the dashboard has no card and no tile
 * for the viewer, so this panel stands in for frame's generic "No records." on the one surface
 * where an empty list is a person's first screen.
 *
 * Every word and every destination is the payload's: `heading`, `body`, `actions` (host-routed
 * links, the first drawn as the primary button) and an optional `hint`. The panel invents no
 * affordance — an action the host does not route never reaches it. Links go through the host's
 * injected `renderLink` like every other anchor a card draws.
 */
declare function WelcomePanel({ value, options }: {
    value: WelcomePayload;
    options?: CardWidgetOptions;
}): react.JSX.Element;

interface DashboardCardResolution extends ResolvedForContext {
    /**
     * WHICH declaration produced this widget — `'overview'` / `'summary'` for a named binding
     * (an overview that merely inherited the summary's name reports `'summary'`, because that
     * is the widget that will draw), `'default'` for the row context's registry default.
     */
    tier: 'overview' | 'summary' | 'default';
    /** The widget name the declaration asked for, when it asked for one. */
    declared?: string;
}
/**
 * The fallback chain for a dashboard row against its target's manifest:
 * `overview` (when the row asks for it and the target participates) → `summary` (when the
 * target participates) → the context DEFAULT for the row's own context (the registry's
 * predicate on the stamped `x-frame-context`, for an unbound node).
 *
 * The cascade parent is derived HERE from the manifest (`byNode['']?.[INHERITS[ctx]]`) —
 * `SchemaView` passes `undefined` for every context, so an `overview` resolved through it
 * never cascades; a card is the one surface where `overview ← summary` has to.
 *
 * ⚠️ A tier whose declared name resolves to NO component STOPS the chain (`unbound`), it does
 * not fall through. The declaration named something; taking the next tier or the default would
 * dress a typo as a working card and there would be nothing on the screen to say so. That is
 * the same answer `registerCardWidgets` and `listItemRendersCards` give for an unknown name,
 * and all three now agree.
 */
declare function resolveDashboardCard(row: DashboardRow, manifest: ContextManifest, registry: WidgetRegistry): DashboardCardResolution;
/**
 * Will this row draw ANYTHING? The question `DefaultCards` asks before it lays out a cell, so
 * a row that drops takes its cell with it instead of leaving an empty grid track where a card
 * ought to be. A row that is not a dashboard row is not this function's business (an ordinary
 * resource's cards path renders through `SchemaView` and always draws something); a `'nav'` row
 * needs no lookup at all; an unbound tier DOES draw — its honest marker.
 */
declare function dashboardRowRenders(record: Row, manifestFor: ManifestLookup | undefined, registry: WidgetRegistry): boolean;
/**
 * The `list-item` widget a `{realm}-dashboard` row binds. It dispatches on the row's
 * `context` to the TARGET resource's root entry (see {@link resolveDashboardCard}) and mounts
 * the resolved card with the row's `summary` payload; a `'nav'` row draws a {@link NavTile}
 * without any lookup.
 *
 * An `overview` row that fell back to the target's SUMMARY binding is mounted inside the
 * {@link OverviewFrame} — heading, headline, period, note — with the summary widget as the
 * body. The row asked for an overview and the server sent an overview payload; rendering the
 * summary widget bare would drop `headline`/`period`/`note` on the floor with no trace.
 *
 * A row whose target manifest this host cannot reach (a contributed card naming a resource
 * the host does not mount, or a manifest still in flight) renders NOTHING — it drops, it
 * never throws, so a package cannot 500 a host's dashboard (nav-contribution PLAN: contributed
 * nodes drop). No log either: in-flight is the common case and would make the warning noise.
 */
declare function DashboardCard({ value, options }: CardWidgetProps<DashboardRow>): react.JSX.Element | null;

/** The six default card widgets, by the `x-widget` name a declaration binds. */
declare const CARD_WIDGETS: Record<'stat-row' | 'figure-card' | 'recent-list' | 'record-line' | 'nav-tile' | 'dashboard-card', ComponentType<any>>;
interface RegisterCardWidgetsOptions {
    /** The host's icon-name → glyph resolver; reaches every card as `options.iconFor`. */
    iconFor?: IconResolver;
    /**
     * The host's navigation primitive; reaches every card as `options.renderLink` and is what
     * every anchor a card draws goes through. Absent, a card draws a plain `<a href>` — correct
     * markup, but a full page load under a router host.
     */
    renderLink?: CardLinkRenderer;
}
/**
 * Register the default card widgets into a seam registry — the ONE call a host provider
 * makes (realm-dashboards ticket 03).
 *
 * Two kinds of entry, and their order is the contract:
 *
 *  1. Context DEFAULTS — `stat-row` fires for any node the resolver stamped as context
 *     `summary`, `figure-card` for `overview`. They match only an UNBOUND node
 *     (`!s['x-widget']`), so a declared name always wins: one registered by the host before
 *     this call is not shadowed, and one the registry does not know stays honestly unbound
 *     (`ResolvedForContext.unbound`) rather than silently taking the default.
 *  2. NAMED widgets — the six names a declaration (`#[WidgetIn('summary', 'stat-row')]`)
 *     binds. Registered AFTER the defaults so they sit ahead of them in the registry (later
 *     registrations are consulted first).
 *
 * `record-line` is a NAMED entry only — never a `list-item` context default. That predicate
 * would make every participates-but-unbound root resolve a component, and `listItemRendersCards`
 * would flip tower's threads/compositions tables into card grids. `recent-list` picks it by
 * name, and only where the target declared no name.
 *
 * A host replaces any of them by registering a later predicate on the same name or the same
 * `x-frame-context` — the seam registry's ordinary override path, no hook here.
 */
declare function registerCardWidgets(registry: WidgetRegistry, options?: RegisterCardWidgetsOptions): void;

interface EditableCellProps {
    /** The field's JSON Schema node (the single-field subschema the widget edits). */
    node: SchemaNode;
    /** The field's `row-cell` participation entry (byNode[field]['row-cell']). */
    rowCell: NodeParticipation | undefined;
    /** The field's `edit` participation entry — the cascade parent. */
    edit: NodeParticipation | undefined;
    /** The current field value. */
    value: unknown;
    /** Host commit hook — wire to a per-field save / transport.save. */
    onCommit: (value: unknown) => void;
    /** Falls back to the seam WidgetRegistryContext when omitted. */
    registry?: WidgetRegistry;
}
declare function EditableCell({ node, rowCell, edit, value, onCommit, registry: registryProp, }: EditableCellProps): ReactNode;

/**
 * The frame's host-widget keyword — emitted by `#[Widget(...)]` on an edit DTO
 * (laravel-frame's `Keywords::Widget`). A property carrying it resolves to a
 * host-registered widget through seam's WidgetRegistry — via {@see bridgeHostWidgets},
 * which every consumer of the served schema needs to run first; seam's registry
 * predicates read the BARE `x-widget`, never this namespaced one directly.
 */
declare const STUD_WIDGET_KEYWORD = "x-stud-widget";
/** The `#[Widget(options: ...)]` sidecar (laravel-frame's `Keywords::WidgetOptions`). */
declare const STUD_WIDGET_OPTIONS_KEYWORD = "x-stud-widget-options";
/**
 * The frame's resource-reference keyword — emitted by `#[ResourceRef(...)]` on an
 * edit DTO (laravel-frame's `Keywords::ResourceRef`). A property carrying it resolves
 * to frame's built-in ResourceRefWidget, which fetches the referenced resource's index
 * to build picker options. It is a genuine data control (not a rich host affordance),
 * so it is intentionally NOT stripped by `raw` mode.
 */
declare const STUD_RESOURCE_REF_KEYWORD = "x-stud-resource-ref";
/**
 * Strip host-widget overrides from a schema so the `raw` form mode falls back to the
 * inferred controls — the frame's mode contract: `splicewire` resolves host widgets
 * (the rich affordances, e.g. enrich), `raw` edits the plain underlying data. The
 * enrich widget therefore vanishes in `raw` mode, leaving the inferred text control.
 *
 * Returns a new tree (never mutates the cached query result) and recurses through
 * every schema-bearing position RJSF renders from.
 */
declare function stripHostWidgets(schema: SchemaNode): SchemaNode;
/**
 * Bridge `#[Widget(...)]`'s namespaced `x-stud-widget`/`x-stud-widget-options` onto
 * seam's bare `x-widget`/`x-widget-options`, recursively — the missing half of the
 * `enriched` mode contract. Found live: seam's WidgetRegistry predicates (and
 * `button-group`/`star-rating`, its own generic widgets) check the BARE keyword only;
 * nothing anywhere translated frame's namespaced one, so a `#[Widget(...)]`-declared
 * widget never actually resolved in EITHER form mode — `enriched` mode passed the
 * served schema through completely untouched. `#[ResourceRef]` was unaffected (its
 * widget is registered against `x-stud-resource-ref` directly), which is why that one
 * "just worked" and this one silently didn't. Mirrors the per-context translation
 * `resolveWidgetFor.ts` already does for the `#[WidgetIn]` cascade — this covers the
 * plain, non-context `#[Widget]` path `DefaultFormBody`/`SchemaForm` renders through.
 *
 * Returns a new tree (never mutates the cached query result), same shape as
 * `stripHostWidgets`.
 */
declare function bridgeHostWidgets(schema: SchemaNode): SchemaNode;

/** The config bag frame reads off the schema node (mirror of the PHP-emitted shape). */
interface ResourceRefConfig {
    resource: string;
    value: string;
    label: string;
    multiple?: boolean;
    scope?: Record<string, string | number | boolean>;
}
/** Read the picker config off a schema node; undefined when the keyword is absent. */
declare function readResourceRefConfig(schema: SchemaNode | undefined): ResourceRefConfig | undefined;
interface ResourceRefWidgetProps {
    id?: string;
    value?: unknown;
    disabled?: boolean;
    readonly?: boolean;
    onChange: (value: unknown) => void;
    schema?: SchemaNode;
    formContext?: unknown;
    registry?: {
        formContext?: unknown;
    };
}
/**
 * An RJSF widget: on mount it lists the referenced resource (scope → query params),
 * maps rows to `{ value, label }`, and renders a controlled select. `multiple:true`
 * renders a multi-select whose value is a string[]; else a single select. It emits
 * through RJSF `onChange`. Loading/empty are minimal, accessible states. If the
 * injected transport is somehow absent it degrades to an empty control rather than
 * hard-crashing (this is a package-internal widget; a host's shadcn wrapper is out of
 * scope here).
 */
declare function ResourceRefWidget(props: ResourceRefWidgetProps): react.JSX.Element | null;
/**
 * Register the resource-ref widget under a predicate matching any node carrying the
 * `x-stud-resource-ref` keyword. Idempotent registration is the caller's concern
 * (FrameProvider guards a once-per-registry install); the seam consults later
 * registrations first, so a re-register would merely shadow itself harmlessly.
 */
declare function registerResourceRefWidget(registry: WidgetRegistry): void;

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

/**
 * Extra `useQuery` knobs a caller may thread onto a Frame read (e.g. `refetchInterval`,
 * `staleTime`, `enabled`). `queryKey`/`queryFn` stay owned by Frame — the cache namespace is
 * the package's, not the host's — so they're excluded. Additive and backward-compatible: every
 * call site that omits `options` behaves exactly as before.
 */
type ResourceQueryOptions<T> = Omit<UseQueryOptions<T, Error, T>, 'queryKey' | 'queryFn'>;
/** Build a resource query key; existing resource/record prefixes remain usable. */
declare function resourceQueryKey(transport: FrameTransport, resource: string, ...parts: readonly unknown[]): readonly ["frame", string, ...unknown[], string];
/** List rows for a resource through the injected transport, keyed by request params. */
declare function useResourceList(resource: string, params: Record<string, string>, options?: ResourceQueryOptions<ResourcePage<Row>>): _tanstack_react_query.UseQueryResult<ResourcePage<Row>, Error>;
/**
 * A single record; disabled when creating (id === null). `options` threads extra `useQuery`
 * knobs — notably `refetchInterval` for a live/polling read model (an operator provisioning
 * poll rides Frame's own `resourceQueryKey(transport, resource, 'record', id)` queryKey this way, so there's one
 * cache namespace end-to-end rather than a parallel bespoke fetch). The `enabled: id !== null`
 * default still holds unless `options` overrides it.
 */
declare function useResourceRecord(resource: string, id: string | null, options?: ResourceQueryOptions<Row>): _tanstack_react_query.UseQueryResult<Row, Error>;
/** The form JSON-schema (JsonSchemaGenerator->forRequest() on the server). */
declare function useFormSchema(resource: string, form: FormMode): _tanstack_react_query.UseQueryResult<SchemaNode, Error>;
/** Save (create when id === null, else update); invalidates the resource's queries. */
declare function useSaveResource(resource: string): _tanstack_react_query.UseMutationResult<Row, Error, {
    id: string | null;
    data: unknown;
}, unknown>;
/** Delete a record; invalidates the resource's queries. */
declare function useRemoveResource(resource: string): _tanstack_react_query.UseMutationResult<void, Error, string, unknown>;

/**
 * The verbs frame itself knows how to render in a row-actions column. Deliberately ONE:
 * `delete` is the whole of the copy-pasted repetition the declaration was added to retire
 * (three flagship surfaces, one `useRemoveResource` + `window.confirm` + trash icon each).
 *
 * `edit` is NOT here and its absence is a decision, not an omission: every frame list already
 * opens a record on row click (`onOpen`), so an edit button in the same row is a second
 * affordance for the same act — exactly the "renders it twice" failure a row-action invites.
 * A resource may still declare `edit`; frame ignores what it cannot render, so a host that
 * wants one supplies its own `RowActions` slot and reads the same declared list.
 */
declare const KNOWN_ROW_ACTIONS: readonly ["delete"];
type RowAction = (typeof KNOWN_ROW_ACTIONS)[number];
/**
 * The row actions this resource DECLARED — `#[RowActions([...])]` on the record class, which
 * projects onto the wire as the root pointer's `list-column` participation bound to the
 * `row-actions` widget.
 *
 * ⚠️ The root ("") entry is the only `list-column` participation that is NOT a column;
 * `resolveColumns` skips it for exactly that reason, and this reads the same slot from the
 * other side. Anything the manifest does not declare returns `[]`, and an empty list is what
 * keeps frame from growing a delete column on every list in the estate — the fallback is
 * gated on the DECLARATION, never on the mere presence of a slot.
 *
 * Verbs frame cannot render are filtered out here rather than at the render site, so a
 * resource declaring `['edit','duplicate','delete']` (beam-ux does) yields `['delete']` and
 * the shell's "did anything get declared" test stays a single truthy check.
 */
declare function resolveRowActions(manifest: ContextManifest | undefined): RowAction[];

/**
 * A non-2xx answer to an action's request, carrying what the shell shows: the server's `message` and, on
 * a 422, the per-field `errors`. A host transport's `write` throws this so the action UI can tell a
 * validation refusal (show it on the form) from any other refusal (show the message).
 */
declare class FrameActionError extends Error {
    readonly status: number;
    readonly errors: Record<string, string[]>;
    readonly body: unknown;
    constructor(status: number, body: unknown, fallback?: string);
}
/**
 * The actions of one scope this ACTOR may press, in declared order (ADR-0005).
 *
 * Two gates, both from the manifest: the resource must DECLARE the action, and the per-actor
 * `can.actions[key]` must be `true`. Absent or `false` hides it — deny-while-unknown, the same posture a
 * host's `can` takes for the CRUD verbs — because a button that 403s teaches the reader the screen is
 * broken. The action's own URL is still the enforcement.
 *
 * A transport that cannot `invoke`, or cannot fetch the form of an action that has one, hides the
 * action too: a button that cannot send is worse than none.
 */
declare function resolveActions(manifest: ContextManifest | undefined, scope: ResourceActionDefinition['scope'], transport?: Pick<FrameTransport, 'invoke' | 'getActionSchema'>): ResourceActionDefinition[];
/** The action's URL for this record — `{id}` filled (encoded) for a record action; a resource action's URL as-is. */
declare function actionUrl(action: ResourceActionDefinition, id?: string | null): string;
/** The id a `navigate` result opens: the response's `data.id`, else the acted-on record's. */
declare function navigateTarget(result: {
    data?: unknown;
} | undefined, record?: Row): string | null;

interface ActionHandlers {
    /** Where a `navigate` result goes. Absent, a navigate action refreshes like a toast one. */
    onNavigate?: (record: Row) => void;
    /** The shell's fallback notice sink, used when the injection binds no `notify`. */
    onNotice?: (notice: FrameNotice) => void;
}
/** The resource-scope actions — the buttons beside the list's "New". Renders nothing when none are pressable. */
declare function ResourceActionBar({ resource, manifest, ...handlers }: {
    resource: string;
    manifest: ContextManifest | undefined;
} & ActionHandlers): react.JSX.Element | null;
/** The record-scope actions for one record — on a list row and on the detail page. */
declare function RecordActionButtons({ resource, manifest, record, compact, ...handlers }: {
    resource: string;
    manifest: ContextManifest | undefined;
    record: Row;
    /** Row rendering: quieter buttons that do not open the row behind them. */
    compact?: boolean;
} & ActionHandlers): react.JSX.Element | null;
/**
 * One action: the button, then either the form (declared input) or a confirmation (confirm-only), then
 * the request and its declared result.
 */
declare function ActionButton({ resource, action, record, compact, onNavigate, onNotice, }: {
    resource: string;
    action: ResourceActionDefinition;
    record?: Row;
    compact?: boolean;
} & ActionHandlers): react.JSX.Element;
/**
 * The inline notice region a shell renders when the host binds no `notify` — so an action's result is
 * never silent. Returns the sink to hand the action buttons and the element to place.
 */
declare function useInlineNotice(): {
    onNotice: ((notice: FrameNotice) => void) | undefined;
    element: ReactNode;
};

declare function DefaultToolbar({ resource, onNew, canCreate, framesCreate, singularLabel, }: ToolbarSlotProps): react.JSX.Element | null;
/**
 * The noun a "New …" affordance says. The resolved singular when the manifest carried one,
 * else the raw resource key — which is the pre-manifest behaviour, kept so a fixture or an
 * older server renders exactly as before rather than losing its label.
 *
 * Lower-cased because it sits mid-sentence after "New"; the declaration spells it as a display
 * label ("Scaffold packs" → "Scaffold pack") and "New Scaffold pack" reads as a typo.
 */
declare function createNoun(resource: string, singularLabel?: string): string;
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
declare function DefaultCell({ column, record }: CellSlotProps): react.JSX.Element;
declare function DefaultEmpty(): react.JSX.Element;
/**
 * The list read FAILED (api-surface-coherence 107) — say so, and offer the retry.
 *
 * Deliberately shows the message the transport carried rather than a fixed string: the
 * defect this slot exists for was a 500 whose body named the exact missing table, hidden
 * behind "No records." for a day.
 */
declare function DefaultErrorState({ error, retry }: ErrorSlotProps): react.JSX.Element;
/**
 * A record read answered 404 — a DISTINCT terminal state from a failed read (api-surface-coherence /
 * C17). "Not found" is final: retrying a 404 just 404s again, so unlike `DefaultErrorState` it offers
 * no retry. The host detail sheet imports this so a 404 there renders the SAME not-found state.
 */
declare function DefaultNotFound({ message }: {
    message?: string;
}): react.JSX.Element;
declare function DefaultLoading(): react.JSX.Element;
declare function DefaultPagination(props: PaginationSlotProps): react.JSX.Element;
/**
 * Frame's generalized DataTable default — a resource-blind table rendered from the
 * resolved columns + the Cell/RowActions slots. Table atoms stay plain HTML so the
 * default works with no host chrome; a host swaps the whole Table slot to use its
 * own design-system table.
 */
declare function DefaultTable(props: {
    columns: FrameColumn[];
    rows: Row[];
    onOpen?: (record: Row) => void;
    Cell: ComponentType<CellSlotProps>;
    RowActions?: ComponentType<{
        record: Row;
    }>;
}): react.JSX.Element;
/**
 * Frame's cards-path default (realm-dashboards ticket 03): an auto-fill grid of the resolved
 * per-row `Card`. Inline styles like every other default here — a host's Tailwind does not
 * scan `node_modules` — and the gap rides the `--density-gap` token so `[data-density]` at
 * the deployment root re-treats the grid with zero JS, exactly as the table's row rhythm does.
 * The cell, not the card, carries `onOpen`: a card body is the resource's own `list-item`
 * rendering and knows nothing about being clickable.
 *
 * ⚠️ A row that will draw NOTHING takes its cell with it. A dashboard row naming a resource
 * this host does not mount drops (`dashboard-card`'s no-throw contract) — and a cell kept for
 * it is an empty grid track the viewer reads as a card that failed to load, which is exactly
 * the impression the drop exists to avoid. The question is asked once, here, by the same
 * resolver the card will use.
 */
declare function DefaultCards({ rows, onOpen, Card }: CardsSlotProps): react.JSX.Element;
/**
 * Default form body — seam's SchemaForm. Both `raw` and `splicewire` modes render
 * through the same SchemaForm; the mode only changes which widgets resolve (a host
 * registers `splicewire-enrich` in seam's WidgetRegistry). The enrich/refine
 * affordance rides a FormIntentBus on formContext (not props).
 */
declare function DefaultFormBody(props: FormBodySlotProps): react.JSX.Element;
declare function DefaultToggle({ value, onChange, }: {
    value: FormMode;
    onChange: (m: FormMode) => void;
}): react.JSX.Element;
declare function DefaultSaveBar({ saving, canSubmit, readOnly, onSave, onCancel, }: SaveBarSlotProps): react.JSX.Element;
declare function DefaultContainer({ children }: {
    children: ReactNode;
}): react.JSX.Element;

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
interface FilterSchemaResponse {
    data: FilterSchema;
    savedViewsResource?: string | null;
    savedViewsCan?: ResourceMutationPermissions | null;
}
/** Compose resource filter reads and declared saved-view CRUD over the host's client. */
declare function createResourceTransport(crud: FrameCrudTransport, http: ResourceFilterHttp): FrameTransport;

/** Validate the two declared HTTP envelopes; never synthesize pagination metadata. */
declare function parseResourcePage<Result>(value: ResourcePage<Result>): ResourcePage<Result>;
declare function parseResourcePage(value: unknown): ResourcePage<Row>;

export { ActionButton, type ActionHandlers, type AssertRouteContextOptions, type BadgeCellOptions, type BadgesCellOptions, CARD_WIDGETS, COLUMN_KINDS, CardLinkRenderer, CardWidgetOptions, CardWidgetProps, CardsSlotProps, CellSlotProps, type CollapseLevel, type CollapseModes, type ColumnKind, type Conformance, ContextManifest, DashboardCard, DashboardRow, type DateCellOptions, DeclaredCell, DefaultCards, DefaultCell, DefaultContainer, DefaultEmpty, DefaultErrorState, DefaultFormBody, DefaultLoading, DefaultNotFound, DefaultPagination, DefaultRowActions, DefaultSaveBar, DefaultTable, DefaultToggle, DefaultToolbar, EditShell, EditShellMountProvider, type EditShellMountValue, EditShellProps, EditableCell, type EditableCellProps, ErrorSlotProps, FRAME_CONTEXT_KEYWORD, FigureCard, type FilterSchemaResponse, FiveRegionEditShell, type FiveRegionEditShellProps, type FlushFn, FormBodySlotProps, FormMode, FormResolver, FrameActionError, FrameColumn, FrameContext, type FrameCrudTransport, FrameInjection, FrameNotice, FrameProvider, type FrameSidePanelEntry, FrameTransport, type GuardComponent, type GuardRegistry, IconResolver, Inspector, KNOWN_ROW_ACTIONS, ListShell, ListShellProps, ManifestLookup, MissingSlots, type MountDispatcher, type MountDispatcherOptions, NavTile, NavTilePayload, type NodeAccess, NodeParticipation, type NumberCellOptions, PaginationSlotProps, PalettePane, type RealmRouteObject, type RealmRouteRegistries, RecentList, RecordActionButtons, RecordLine, type RegisterCardWidgetsOptions, type RequiredSlot, ResolveColumns, type ResolvedForContext, type ResolvedSkin, ResourceActionBar, ResourceActionDefinition, type ResourceFilterHttp, ResourcePage, type ResourceRefConfig, ResourceRefWidget, type RouteComponent, RouteContextEntry, type RouteRegistry, Row, type RowAction, RowActionsSlotProps, STUD_RESOURCE_REF_KEYWORD, STUD_WIDGET_KEYWORD, STUD_WIDGET_OPTIONS_KEYWORD, SaveBarSlotProps, SavePill, SchemaView, type SchemaViewProps, type ShellComponent, type ShellRegistry, StatRow, StatusBar, SummaryPayload, type TextCellOptions, ToolbarSlotProps, WelcomePanel, WelcomePayload, WidgetShell, WidgetShellProps, WidgetSurface, actionUrl, assertRouteContext, bridgeHostWidgets, buildRealmRoutes, collapseModes, createFormResolver, createGuardRegistry, createMountDispatcher, createNoun, createResourceTransport, createRouteRegistry, createShellRegistry, dashboardRowRenders, deriveCollapseLevel, formatRecordTime, getPath, isNotFound, kindOfSchema, listItemRendersCards, navigateTarget, parseResourcePage, readResourceRefConfig, registerCardWidgets, registerResourceRefWidget, resolveActions, resolveColumns, resolveDashboardCard, resolveDeclaredCell, resolveRowActions, resolveSkinFor, resolveWidgetFor, resourceQueryKey, stripHostWidgets, useEditShellMount, useEditShellMountController, useFormSchema, useFrameInjection, useFrameSidePanelStore, useInlineNotice, useRemoveResource, useResourceList, useResourceRecord, useSaveResource };
