// =============================================================================
// @schemastud/frame/picker — the resource picker, its placement tables, the selection model and the resource-ref
// widget (ruling 02 §8).
//
// The root keeps `registerResourceRefWidget`, which a kit's registry already calls; this entry is for a host that
// mounts a picker or works with a selection itself.
// =============================================================================

export {
    ResourceRefWidget,
    ResourcePickerWidget,
    readResourceRefConfig,
    isResourceRefNode,
    type ResourceRefConfig,
} from '../ResourceRefWidget';
export { ResourcePicker, type ResourcePickerProps } from '../resource-picker/ResourcePicker';
export {
    ResourceKindPicker,
    kindsInScope,
    type ResourceKindPickerProps,
    type ResourceKindOption,
    type ResourceKindSection,
    type ResourceKindIcon,
    type ResourceKindScopeInput,
} from '../resource-picker/KindPicker';
export { ResourceRecordPicker, type ResourceRecordPickerProps } from '../resource-picker/RecordPicker';
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
} from '../resource-picker/placement';
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
} from '../resource-picker/selection';
// The selection hook over `useListShell`'s result (ruling 02 §6, slice 12; ticket 41). The record picker renders it.
export {
    useListSelection,
    type ListSelection,
    type ListSelectionOptions,
} from '../resource-picker/useListSelection';
