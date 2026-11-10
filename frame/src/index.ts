// =============================================================================
// @schemastud/frame — the batteries-UX schema-driven admin editor rung.
//
// The root holds what a host mounts and imports (ruling 02 §8): the kit and the provider, the shells and their hooks,
// the data hooks, transport authoring, the route registries, the wire types, and the few helpers a host still imports.
// The rest lives on a subpath: `/editor` (the heavyweight-editor chrome), `/cards` (the dashboard card set),
// `/picker` (the resource picker and its selection model), `/wire` (the manifest vocabulary and its resolvers),
// `/shadcn` (the shadcn slot sets), `/testing` (the memory transport) and the Node-only `/vocabulary`.
// =============================================================================

// Mount.
export { FrameProvider, useFrameInjection, registerFrameWidgets } from './context';
export {
    createFrameKit,
    createFrameRegistry,
    type FrameKit,
    type FrameKitOptions,
    type FrameRegistryOptions,
} from './kit';

// Shells and their behaviour.
export { ListShell } from './ListShell';
export { EditShell } from './EditShell';
export { useResourceAction, type ResourceActionCall } from './useResourceAction';
export {
    useListShell,
    type ListShellOptions,
    type ListShellState,
} from './useListShell';
export {
    useEditShell,
    type EditShellOptions,
    type EditShellState,
} from './useEditShell';
export { FrameLayout, type FrameLayoutProps } from './FrameLayout';
export { SchemaView, type SchemaViewProps } from './SchemaView';
export { resolveColumns } from './resolveColumns';
export {
    DefaultRowActions,
    DefaultNotFound,
    DefaultPagination,
    DefaultFormBody,
} from './slots/defaults';

// Routes.
export {
    createMountDispatcher,
    type MountDispatcher,
    type MountDispatcherOptions,
} from './mountDispatcher';
export {
    createRouteRegistry,
    createGuardRegistry,
    createShellRegistry,
    assertRouteContext,
    buildRealmRoutes,
    type RouteRegistry,
    type GuardRegistry,
    type ShellRegistry,
    type RouteComponent,
    type GuardComponent,
    type ShellComponent,
    type RealmRouteObject,
    type RealmRouteRegistries,
    type AssertRouteContextOptions,
} from './routes';

// Data.
export {
    resourceQueryKey,
    useResourceList,
    useResourceRecord,
    useFormSchema,
    useSaveResource,
    useRemoveResource,
} from './data';

// Transport authoring.
export {
    createResourceTransport,
    type FrameCrudTransport,
    type ResourceFilterHttp,
    type ResourceTransportOptions,
} from './resourceTransport';
export { parseResourcePage } from './resourcePage';
export { createHttpTransport, type HttpTransportOptions } from './httpTransport';
export { FrameActionError } from './actions';
export { isNotFound } from './errors';

// Still imported by a host, so still here.
export { createFormResolver } from './FormResolver';
export {
    registerCardWidgets,
    type RegisterCardWidgetsOptions,
    type IconResolver,
    type CardLinkRenderer,
} from './cards';
export { registerResourceRefWidget } from './ResourceRefWidget';
export {
    createFrameHooks,
    type FrameHooks,
    type SubmittedHandler,
    type SubmittedContext,
} from './hooks';
export { useFrameSidePanelStore, type FrameSidePanelEntry } from './frameSidePanel';
export { resolveRowActions, type RowAction } from './rowActions';
export { KNOWN_CONTEXTS } from './contexts';
export type { FrameContext, ContextManifest } from './contexts';

// Wire types.
export type {
    Row,
    Paginated,
    CursorPaginated,
    ResourcePage,
    FormMode,
    SchemaPurpose,
    FrameAction,
    FrameCan,
    FrameTransport,
    FramePrimitives,
    FrameInjection,
    ManifestLookup,
    FormResolver,
    FrameColumn,
    ResolveColumns,
    AdminResourceDefinition,
    FrameManifest,
    ResourceCollectionAddress,
    RouteContextEntry,
    RouteMounts,
    ListShellProps,
    OpenedOf,
    ListSlots,
    ToolbarSlotProps,
    RowActionsSlotProps,
    CardsSlotProps,
    CellSlotProps,
    ErrorSlotProps,
    PaginationSlotProps,
    EditShellProps,
    EditSlots,
    FormBodySlotProps,
    SaveBarSlotProps,
    ResourceActionDefinition,
    ActionResult,
    FrameNotice,
} from './types';
export type {
    FrameResourceMap,
    FrameResourceEntry,
    ResourceKey,
    RowOf,
    EditOf,
    CreateResultOf,
    ActionKeyOf,
    ActionInputOf,
    FieldOf,
} from './resources';

// The seam and facets names a frame host wires against, so a consumer has one import for them.
export {
    createWidgetRegistry,
    createFormIntentBus,
    type WidgetRegistry,
    type SchemaFetcher,
    type SchemaNode,
    type FormIntentBus,
} from '@schemastud/seam';
export { useBrowserUrlState, type UseUrlState, type ListFiltersState } from '@schemastud/facets';
