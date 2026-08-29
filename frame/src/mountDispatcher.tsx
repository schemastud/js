import { createElement } from 'react';
import { EditShell } from './EditShell';
import { ListShell } from './ListShell';
import type { ContextManifest } from './contexts';
import type { RouteComponent } from './routes';
import type { FrameColumn, RouteContextEntry } from './types';
import { WidgetShell } from './WidgetShell';

const isDev = (): boolean => Boolean((import.meta as any).env?.DEV);

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
export interface MountDispatcherOptions {
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
     * component's render, never at dispatch time.
     */
    manifestFor?: (resource: string) => ContextManifest | undefined;

    /**
     * Called with the reason whenever a leaf is declined. Not an error channel — a decline is a normal,
     * expected outcome — but an unexplained one is the estate's recurring *instrument that reports
     * success by not running*, so the reason is always offered rather than swallowed.
     */
    onDecline?: (entry: RouteContextEntry, reason: string) => void;
}

/** What `buildRealmRoutes` accepts as its fallback: a component for this entry, or `undefined` to decline. */
export type MountDispatcher = (entry: RouteContextEntry) => RouteComponent | undefined;

/**
 * Build a dispatcher over the declared `mounts` verb. Pure and host-agnostic: it names no resource, no
 * route and no realm — it reads the entry it is handed.
 */
export function createMountDispatcher(options: MountDispatcherOptions = {}): MountDispatcher {
    const decline = (entry: RouteContextEntry, reason: string): undefined => {
        options.onDecline?.(entry, reason);

        return undefined;
    };

    return (entry) => {
        // Every dispatchable mount is a shell over a RESOURCE. A resource-less standalone page is a
        // legitimate entry (the DTO's own `resource` is nullable and documents exactly that), and it is
        // simply not something a resource shell can render.
        if (entry.mounts !== 'redirect' && !entry.resource) {
            return decline(entry, `mounts: '${entry.mounts}' needs a resource, and this entry declares none`);
        }

        const resource = entry.resource as string;
        // Read at RENDER time, not dispatch time: `resolveId` is expected to be a hook
        // (`() => useParams().id ?? null`), so it must run inside the returned component.
        const idOf = () => (options.resolveId ? options.resolveId(entry) : null);

        switch (entry.mounts) {
            case 'widget': {
                if (!entry.widget) {
                    return decline(entry, "mounts: 'widget' declares no widget name");
                }

                const widget = entry.widget;

                return () => createElement(WidgetShell, { resource, id: idOf(), widget });
            }

            case 'edit':
            case 'detail': {
                if (!options.resolveId) {
                    return decline(entry, `mounts: '${entry.mounts}' needs resolveId — without it an edit route renders a create form`);
                }

                const readOnly = entry.mounts === 'detail';

                return () =>
                    createElement(EditShell, {
                        resource,
                        id: idOf(),
                        readOnly,
                        // Full-page, not a drawer. See EditShell's PageContainer for why this used to be
                        // a silent lie.
                        container: 'page' as const,
                    });
            }

            case 'list': {
                // A dispatch-time decision about HOST WIRING, not about data: if neither lookup was
                // supplied there is no path to a column set at any point in the future, so decline once
                // and say so. Whether a given resource has a manifest is a runtime fact and is decided
                // at render, below.
                if (!options.manifestFor && !options.columnsFor) {
                    return decline(
                        entry,
                        "mounts: 'list' needs manifestFor (whose list-column participation IS the column set) or columnsFor",
                    );
                }

                return () => {
                    const manifest = options.manifestFor?.(resource);
                    // Zero host columns is the normal case: with a manifest, resolveColumns returns the
                    // whole participating set. Host columns are per-field overrides on top of it.
                    const columns = options.columnsFor?.(resource) ?? [];

                    if (!manifest && columns.length === 0) {
                        // Not an error — the host's manifest query is usually just still in flight, and
                        // this component re-renders when it lands. But a resource that permanently has
                        // neither would otherwise render a headerless table forever, so say it in dev.
                        if (isDev()) {
                            console.warn(
                                `[frame] mounts: 'list' for "${resource}" has no context manifest and no host columns yet — rendering nothing.`,
                            );
                        }

                        return null;
                    }

                    return createElement(ListShell, { resource, columns, manifest });
                };
            }

            case 'redirect':
                return decline(entry, "mounts: 'redirect' carries no destination — no DTO field exists for one, on either side of the seam");

            default:
                // `mounts` is typed as a closed union in TypeScript and as an UNCONSTRAINED `string` in
                // the PHP declaration, so a value outside the union is reachable at runtime even though it
                // is unreachable in the type system. Declining names it rather than crashing the realm.
                return decline(entry, `mounts: '${String(entry.mounts)}' is not a verb this dispatcher renders`);
        }
    };
}
