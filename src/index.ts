// =============================================================================
// @schemastud/frame — the batteries-UX schema-driven admin editor rung.
// =============================================================================

export { FrameProvider, useFrameInjection } from './context';
export { ListShell } from './ListShell';
export { EditShell } from './EditShell';
export { resolveColumns } from './resolveColumns';
export { resolveWidgetFor, type ResolvedForContext } from './resolveWidgetFor';
export { SchemaView, type SchemaViewProps } from './SchemaView';
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
    FrameColumn,
    ResolveColumns,
    AdminResourceDefinition,
    ListShellProps,
    ListSlots,
    ToolbarSlotProps,
    CellSlotProps,
    PaginationSlotProps,
    EditShellProps,
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
