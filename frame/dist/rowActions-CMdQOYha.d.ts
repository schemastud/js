import { b as ContextManifest } from './types-C1zrU238.js';

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

export { KNOWN_ROW_ACTIONS as K, type RowAction as R, resolveRowActions as r };
