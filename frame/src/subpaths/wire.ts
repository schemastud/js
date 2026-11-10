// =============================================================================
// @schemastud/frame/wire — the manifest vocabulary and its resolvers (ruling 02 §8).
//
// The keywords a declaration carries on the wire, the contexts' inheritance, the column-cell option shapes, the
// widget and action resolvers. Shells read these themselves; a host reaches for them only to inspect or extend a
// manifest. `@schemastud/frame/vocabulary` (Node-only, ticket 33) is a separate, build-time entry.
// =============================================================================

export { resolveWidgetFor, FRAME_CONTEXT_KEYWORD, type ResolvedForContext } from '../resolveWidgetFor';
export { INHERITS } from '../contexts';
export type { NodeParticipation } from '../contexts';
export { STUD_RESOURCE_REF_KEYWORD } from '../ResourceRefWidget';
export { KNOWN_ROW_ACTIONS } from '../rowActions';
export { resolveActions } from '../actions';
export type {
    TextCellOptions,
    BadgeCellOptions,
    BadgesCellOptions,
    NumberCellOptions,
    DateCellOptions,
} from '../columnKinds';
export type { RealmDefinition } from '../types';
