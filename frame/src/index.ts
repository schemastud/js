// =============================================================================
// @schemastud/frame — the batteries-UX schema-driven admin editor rung.
// =============================================================================

export { FrameProvider, useFrameInjection } from './context';
export { ListShell } from './ListShell';
export { EditShell } from './EditShell';
export { WidgetShell, WidgetSurface } from './WidgetShell';
export {
    FrameLayout,
    FrameLayoutShell,
    SingleColumn,
    SubNavColumn,
    MasterDetail,
    type FrameLayoutProps,
    type FrameLayoutVariant,
    type FrameLayoutWidth,
    type FrameLayoutSidePanel,
    type SingleColumnProps,
    type SubNavColumnProps,
    type SubNavItem,
    type MasterDetailProps,
    type DetailPresentation,
    type CollapseMode,
} from './FrameLayout';
export { FiveRegionEditShell, type FiveRegionEditShellProps } from './FiveRegionEditShell';
export { Inspector } from './Inspector';
export { PalettePane } from './PalettePane';
export { MissingSlots } from './MissingSlots';
export { SavePill } from './SavePill';
export { StatusBar } from './StatusBar';
export {
    deriveCollapseLevel,
    collapseModes,
    type CollapseLevel,
    type CollapseModes,
} from './responsive';
export {
    EditShellMountProvider,
    useEditShellMount,
    useEditShellMountController,
    type EditShellMountValue,
    type NodeAccess,
    type Conformance,
    type RequiredSlot,
    type FlushFn,
} from './EditShellMount';
export { resolveColumns } from './resolveColumns';
export { createFormResolver, kindOfSchema } from './FormResolver';
export { resolveWidgetFor, type ResolvedForContext } from './resolveWidgetFor';
export { resolveSkinFor, type ResolvedSkin } from './resolveSkinFor';
export { SchemaView, type SchemaViewProps } from './SchemaView';
export { EditableCell, type EditableCellProps } from './EditableCell';
export { KNOWN_CONTEXTS, INHERITS } from './contexts';
export type { FrameContext, NodeParticipation, ContextManifest } from './contexts';
export { stripHostWidgets, STUD_WIDGET_KEYWORD, STUD_RESOURCE_REF_KEYWORD } from './raw-mode';
export {
    ResourceRefWidget,
    registerResourceRefWidget,
    readResourceRefConfig,
    type ResourceRefConfig,
} from './ResourceRefWidget';
export { createFrameHooks, type FrameHooks, type SubmittedHandler, type SubmittedContext } from './hooks';
export {
    createRouteRegistry,
    createGuardRegistry,
    assertRouteContext,
    resolveAliasTarget,
    buildRealmRoutes,
    type RouteRegistry,
    type GuardRegistry,
    type RouteComponent,
    type GuardComponent,
    type RealmRouteObject,
    type RealmRouteRegistries,
} from './routes';
export {
    useResourceList,
    useResourceRecord,
    useFormSchema,
    useSaveResource,
    useRemoveResource,
} from './data';
export {
    DefaultToolbar,
    DefaultCell,
    DefaultEmpty,
    DefaultLoading,
    DefaultPagination,
    DefaultTable,
    DefaultFormBody,
    DefaultToggle,
    DefaultSaveBar,
    DefaultContainer,
} from './slots/defaults';

export type {
    Row,
    Paginated,
    FormMode,
    FrameAction,
    FrameCan,
    FrameTransport,
    FramePrimitives,
    FrameInjection,
    FormResolver,
    FrameColumn,
    ResolveColumns,
    AdminResourceDefinition,
    RouteContextEntry,
    RouteMounts,
    RealmDefinition,
    RealmScope,
    AliasEntry,
    ListShellProps,
    ListSlots,
    ToolbarSlotProps,
    CellSlotProps,
    PaginationSlotProps,
    EditShellProps,
    WidgetShellProps,
    EditSlots,
    FormBodySlotProps,
    SaveBarSlotProps,
} from './types';

// Re-export the seam + facets surface a frame host commonly needs, so a consumer
// wires against one import (the migration path the facets tracer proved).
export {
    createWidgetRegistry,
    createFormIntentBus,
    widgetFormContext,
    SchemaForm,
    type WidgetRegistry,
    type SchemaFetcher,
    type SchemaNode,
    type FormIntentBus,
} from '@schemastud/seam';
export {
    type FacetsTransport,
    type FacetsPrimitives,
    type UseUrlState,
    type FilterSchema,
} from '@schemastud/facets';
