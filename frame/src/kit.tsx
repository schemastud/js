import { QueryClient, QueryClientContext, QueryClientProvider, useQuery, type UseQueryResult } from '@tanstack/react-query';
import type { ThemeProps } from '@rjsf/core';
import { transportScope, useBrowserUrlState, type UseUrlState } from '@schemastud/facets';
import { RjsfThemeContext, createWidgetRegistry, type SchemaFetcher, type SchemaNode, type WidgetRegistry } from '@schemastud/seam';
import { createContext, useContext, useMemo, type ComponentType, type ReactNode } from 'react';
import { FrameActionError } from './actions';
import { registerCardWidgets, type CardLinkRenderer, type IconResolver } from './cards';
import { FrameProvider, registerFrameWidgets } from './context';
import { createHttpTransport } from './httpTransport';
import { createMemoryUrlState } from './memoryUrlState';
import { defaultPrimitives } from './primitives';
import { shadcnEditSlots } from './shadcn/edit-slots';
import { shadcnListSlots } from './shadcn/list-slots';
import type { FrameHooks } from './hooks';
import type {
    EditSlots,
    FormResolver,
    FrameCan,
    FrameInjection,
    FrameManifest,
    FramePrimitives,
    FrameTransport,
    ListSlots,
} from './types';

export interface FrameRegistryOptions {
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
export function createFrameRegistry(options: FrameRegistryOptions = {}): WidgetRegistry {
    const registry = createWidgetRegistry();
    registerFrameWidgets(registry);
    registerCardWidgets(registry, { renderLink: options.renderLink, iconFor: options.iconFor });
    options.widgets?.(registry);
    return registry;
}

export interface FrameKitOptions extends FrameRegistryOptions {
    /** Where laravel-frame's socket is mounted. Default `/stud/frame`, laravel-frame's default api root. */
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

export interface FrameKit<Nav = unknown> {
    /** Mount once at the realm's root. Nested inside itself it renders its children and nothing else. */
    Provider: ComponentType<{ children?: ReactNode }>;
    /** The transport the kit reads through — the object handed in, never a copy (it is the cache scope). */
    transport: FrameTransport;
    registry: WidgetRegistry;
    /** The socket's manifest, one cache entry per kit. Works inside the `Provider` or above it. */
    useManifest(): UseQueryResult<FrameManifest<Nav>, Error>;
}

const EMPTY_MANIFEST: FrameManifest = { resources: [], contexts: {} };
const READS = new Set(['viewAny', 'view']);

/** Which kit's `Provider` is already mounted above, so the same kit nested inside itself passes through. */
const MountedKit = createContext<FrameKit<unknown> | null>(null);

function sameOriginSchemaFetcher(): SchemaFetcher {
    return async (ref: string): Promise<SchemaNode> => {
        const origin = typeof location === 'undefined' ? undefined : location.origin;
        const url = new URL(ref, origin);
        if (origin !== undefined && url.origin !== origin) {
            throw new FrameActionError(0, null, `Refused to fetch the schema reference ${ref}: it is on another origin.`);
        }
        const res = await fetch(url, { credentials: 'same-origin', headers: { Accept: 'application/json' } });
        const body = await res.json().catch(() => null);
        if (!res.ok) throw new FrameActionError(res.status, body, `GET ${url.pathname} failed (${res.status}).`);
        return body as SchemaNode;
    };
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
export function createFrameKit<Nav = unknown>(options: FrameKitOptions = {}): FrameKit<Nav> {
    const prefix = (options.prefix ?? '/stud/frame').replace(/\/+$/, '');
    const manifestUrl = options.manifestUrl ?? `${prefix}/manifest`;
    const transport = options.transport ?? createHttpTransport({ prefix, manifestUrl });
    // The endpoint is part of the cache key only when the kit knows it: a handed-in transport is its own scope.
    const endpoint = options.transport ? null : manifestUrl;
    const registry = createFrameRegistry(options);
    const primitives: FramePrimitives = { ...defaultPrimitives, ...options.primitives };
    const listSlots: Partial<ListSlots> = { ...shadcnListSlots, ...options.listSlots };
    const editSlots: Partial<EditSlots> = { ...shadcnEditSlots, ...options.editSlots };
    const useUrlState: UseUrlState =
        options.urlState === 'memory'
            ? createMemoryUrlState()
            : typeof options.urlState === 'function'
              ? options.urlState
              : useBrowserUrlState;
    const schemaFetcher = options.schemaFetcher ?? sameOriginSchemaFetcher();
    const queryKey = ['frame', 'manifest', endpoint, transportScope(transport)] as const;

    let ownClient: QueryClient | undefined;
    /** The client a kit reads through: passed, else nearest, else its own (one per kit). */
    const clientFor = (nearest: QueryClient | undefined): QueryClient =>
        options.queryClient ?? nearest ?? (ownClient ??= new QueryClient());

    function useManifest(): UseQueryResult<FrameManifest<Nav>, Error> {
        const client = clientFor(useContext(QueryClientContext));
        return useQuery(
            {
                queryKey,
                queryFn: async (): Promise<FrameManifest<Nav>> =>
                    ((await transport.getManifest?.()) ?? EMPTY_MANIFEST) as FrameManifest<Nav>,
                staleTime: 60_000,
            },
            client,
        );
    }

    function Injected({ children }: { children?: ReactNode }) {
        const manifest = useManifest().data;
        const injection = useMemo<FrameInjection>(() => {
            const can: FrameCan =
                options.can ??
                ((action, resource) =>
                    READS.has(action) || manifest?.contexts[resource]?.can?.[action as 'create' | 'update' | 'delete'] === true);
            return {
                transport,
                primitives,
                useUrlState,
                registry,
                schemaFetcher,
                can,
                manifestFor: (resource) => manifest?.contexts[resource],
                listSlots,
                editSlots,
                ...(options.notify ? { notify: options.notify } : {}),
                ...(options.formResolver ? { formResolver: options.formResolver } : {}),
                ...(options.hooks ? { hooks: options.hooks } : {}),
            };
        }, [manifest]);
        const body = <FrameProvider value={injection}>{children}</FrameProvider>;
        return options.theme ? <RjsfThemeContext.Provider value={options.theme}>{body}</RjsfThemeContext.Provider> : body;
    }

    function Provider({ children }: { children?: ReactNode }) {
        const mounted = useContext(MountedKit);
        const nearest = useContext(QueryClientContext);
        if (mounted === kit) return <>{children}</>;
        return (
            <QueryClientProvider client={clientFor(nearest)}>
                <MountedKit.Provider value={kit as FrameKit<unknown>}>
                    <Injected>{children}</Injected>
                </MountedKit.Provider>
            </QueryClientProvider>
        );
    }

    const kit: FrameKit<Nav> = { Provider, transport, registry, useManifest };
    return kit;
}
