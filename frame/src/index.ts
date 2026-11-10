// =============================================================================
// @schemastud/frame — the batteries-UX schema-driven admin editor rung.
// =============================================================================

export { FrameProvider, useFrameInjection, useOptionalFrameInjection, registerFrameWidgets } from './context';
export {
    createFrameKit,
    createFrameRegistry,
    type FrameKit,
    type FrameKitOptions,
    type FrameRegistryOptions,
} from './kit';
export { ListShell, listItemRendersCards } from './ListShell';
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
export { WidgetShell, WidgetSurface, type HeavyweightWidgetProps } from './WidgetShell';
export {
    createMountDispatcher,
    type MountDispatcher,
    type MountDispatcherOptions,
} from './mountDispatcher';
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
export {
    type TextCellOptions,
    type BadgeCellOptions,
    type BadgesCellOptions,
    type NumberCellOptions,
    type DateCellOptions,
} from './columnKinds';
export { isNotFound } from './errors';
export { getPath } from './getPath';
export { createFormResolver, kindOfSchema } from './FormResolver';
export {
    resolveWidgetFor,
    FRAME_CONTEXT_KEYWORD,
    type ResolvedForContext,
} from './resolveWidgetFor';
export { resolveSkinFor, type ResolvedSkin } from './resolveSkinFor';
export { SchemaView, type SchemaViewProps } from './SchemaView';
export {
    registerCardWidgets,
    resolveDashboardCard,
    CARD_WIDGETS,
    StatRow,
    FigureCard,
    RecentList,
    RecordLine,
    formatRecordTime,
    NavTile,
    WelcomePanel,
    DashboardCard,
    dashboardRowRenders,
    TrendCard,
    trendSeries,
    trendSegments,
    forecastBoundary,
    describeTrend,
    type TrendPoint,
    type TrendSegment,
    type RegisterCardWidgetsOptions,
    type SummaryFigure,
    type SummaryPayload,
    type OverviewPayload,
    type DashboardRow,
    type WelcomePayload,
    type WelcomeAction,
    type NavTilePayload,
    type IconResolver,
    type CardLinkRenderer,
    type CardWidgetOptions,
    type CardWidgetProps,
} from './cards';
export { EditableCell, type EditableCellProps } from './EditableCell';
export { KNOWN_CONTEXTS, INHERITS } from './contexts';
export type { FrameContext, NodeParticipation, ContextManifest } from './contexts';
export {
    ResourceRefWidget,
    STUD_RESOURCE_REF_KEYWORD,
    ResourcePickerWidget,
    registerResourceRefWidget,
    readResourceRefConfig,
    isResourceRefNode,
    type ResourceRefConfig,
} from './ResourceRefWidget';
// ResourcePicker (owner-review-20261102 RP): stage 1 kinds, stage 2 records, one selection model.
export { ResourcePicker, type ResourcePickerProps } from './resource-picker/ResourcePicker';
export {
    ResourceKindPicker,
    kindsInScope,
    type ResourceKindPickerProps,
    type ResourceKindOption,
    type ResourceKindSection,
    type ResourceKindIcon,
    type ResourceKindScopeInput,
} from './resource-picker/KindPicker';
export { ResourceRecordPicker, type ResourceRecordPickerProps } from './resource-picker/RecordPicker';
export {
    KIND_PLACEMENTS,
    RECORD_PLACEMENTS,
    KIND_VARIANT_FOR,
    resolveKindPlacement,
    resolveRecordPlacement,
    type KindPlacement,
    type RecordPlacement,
    type ResolvedKindPlacement,
    type ResolvedRecordPlacement,
    type ResourceKindScope,
    type ResourceKindVariant,
    type ResourcePickerDensity,
} from './resource-picker/placement';
export {
    EMPTY_SELECTION,
    followFilters,
    isEmptySelection,
    isPicked,
    pageState,
    selectAllMatching,
    selectionCount,
    selectionFromValue,
    selectionToSearch,
    selectionToValue,
    setPagePicked,
    togglePick,
    type IdsSelection,
    type ResourceSelectMode,
    type ResourceSelection,
    type SetSelection,
} from './resource-picker/selection';
export {
    createFrameHooks,
    type FrameHooks,
    type SubmittedHandler,
    type SubmittedContext,
} from './hooks';
export { useFrameSidePanelStore, type FrameSidePanelEntry } from './frameSidePanel';
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
export {
    resourceQueryKey,
    useResourceList,
    useResourceRecord,
    useFormSchema,
    useSaveResource,
    useRemoveResource,
} from './data';
export { resolveRowActions, KNOWN_ROW_ACTIONS, type RowAction } from './rowActions';
export { resolveActions, actionUrl, navigateTarget, FrameActionError } from './actions';
export {
    ActionButton,
    RecordActionButtons,
    ResourceActionBar,
    useInlineNotice,
    type ActionHandlers,
} from './ResourceActions';
export {
    DefaultToolbar,
    DefaultRowActions,
    createNoun,
    DefaultCards,
    DefaultCell,
    DefaultEmpty,
    DefaultErrorState,
    DefaultNotFound,
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
    RealmDefinition,
    RealmScope,
    ListShellProps,
    ListSlots,
    ToolbarSlotProps,
    RowActionsSlotProps,
    CardsSlotProps,
    CellSlotProps,
    ErrorSlotProps,
    PaginationSlotProps,
    EditShellProps,
    WidgetShellProps,
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
    type ListFiltersState,
} from '@schemastud/facets';

export {
    createResourceTransport,
    type FrameCrudTransport,
    type ResourceFilterHttp,
    type ResourceTransportOptions,
    type FilterSchemaResponse,
} from './resourceTransport';

export { parseResourcePage } from './resourcePage';
export { createHttpTransport, type HttpTransportOptions } from './httpTransport';
export { useBrowserUrlState } from '@schemastud/facets';
