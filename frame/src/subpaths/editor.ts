// =============================================================================
// @schemastud/frame/editor — the heavyweight-editor chrome (ruling 02 §8).
//
// The five-region edit shell, the edit-shell mount and its conformance, the inspector, palette and status chrome,
// the widget shell a heavyweight editor mounts through, and the collapse helpers. A host that only lists and edits
// records through ListShell and EditShell never imports this entry.
// =============================================================================

export { WidgetShell, WidgetSurface, type HeavyweightWidgetProps } from '../WidgetShell';
export type { WidgetShellProps } from '../types';
export { FiveRegionEditShell, type FiveRegionEditShellProps } from '../FiveRegionEditShell';
export { Inspector } from '../Inspector';
export { PalettePane } from '../PalettePane';
export { MissingSlots } from '../MissingSlots';
export { SavePill } from '../SavePill';
export { StatusBar } from '../StatusBar';
export {
    deriveCollapseLevel,
    collapseModes,
    type CollapseLevel,
    type CollapseModes,
} from '../responsive';
export {
    EditShellMountProvider,
    useEditShellMount,
    useEditShellMountController,
    type EditShellMountValue,
    type NodeAccess,
    type Conformance,
    type RequiredSlot,
    type FlushFn,
} from '../EditShellMount';
