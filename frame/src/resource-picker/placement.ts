// =============================================================================
// Placement presets. A ResourcePicker is mounted somewhere; WHERE names a preset that
// resolves to scope × density × select. Any axis can still be passed raw, and a raw
// axis wins over the preset's.
//
// Two stages share the vocabulary:
//   stage 1 (`kinds`)   — pick a resource KIND from a catalogue of declared resources;
//   stage 2 (`records`) — pick RECORDS of one kind, from its served list.
//
// Owner ruling 2026-11-02 (particle-resource-selector revision 1):
//   stage 1 → expanded is A (palette), compact is C (rail); B (catalog) only by flag;
//   stage 2 → compact is a server typeahead with "Browse all N with filters", expanded is
//             the embedded ListShell; `select` picks the selection model.
// =============================================================================

import type { ResourceSelectMode } from './selection';

export type ResourcePickerDensity = 'compact' | 'expanded';
/** Stage-1 kind scopes — each reads a fact the kind declares (see `ResourceKindOption.facts`). */
export type ResourceKindScope = 'all' | 'framed' | 'writable' | 'filterable';
export type ResourceKindVariant = 'palette' | 'rail' | 'catalog';

export type KindPlacement = 'nav' | 'field' | 'filters' | 'seeder' | 'catalog';
export type RecordPlacement = 'field' | 'attach' | 'bulk' | 'dynamic';

export interface ResolvedKindPlacement {
    scope: ResourceKindScope;
    density: ResourcePickerDensity;
    select: Exclude<ResourceSelectMode, 'set'>;
    /** The body the density selects, unless a `variant` flag forces one. */
    variant: ResourceKindVariant;
    /** A compact rail lays out as a strip in a topbar or a form row, a column in a side panel. */
    orientation: 'horizontal' | 'vertical';
}

export interface ResolvedRecordPlacement {
    density: ResourcePickerDensity;
    select: ResourceSelectMode;
}

export const KIND_PLACEMENTS: Record<KindPlacement, Omit<ResolvedKindPlacement, 'variant'>> = {
    nav: { scope: 'framed', density: 'compact', select: 'single', orientation: 'horizontal' },
    field: { scope: 'all', density: 'compact', select: 'single', orientation: 'horizontal' },
    filters: { scope: 'filterable', density: 'compact', select: 'single', orientation: 'vertical' },
    seeder: { scope: 'writable', density: 'expanded', select: 'multi', orientation: 'vertical' },
    catalog: { scope: 'all', density: 'expanded', select: 'single', orientation: 'vertical' },
};

export const RECORD_PLACEMENTS: Record<RecordPlacement, ResolvedRecordPlacement> = {
    field: { density: 'compact', select: 'single' },
    attach: { density: 'compact', select: 'multi' },
    bulk: { density: 'expanded', select: 'multi' },
    dynamic: { density: 'expanded', select: 'set' },
};

/** The ruled density → variant map. `catalog` is reachable only through an explicit flag. */
export const KIND_VARIANT_FOR: Record<ResourcePickerDensity, ResourceKindVariant> = {
    expanded: 'palette',
    compact: 'rail',
};

export function resolveKindPlacement(
    placement: KindPlacement = 'field',
    overrides: Partial<Pick<ResolvedKindPlacement, 'scope' | 'density' | 'select' | 'orientation' | 'variant'>> = {},
): ResolvedKindPlacement {
    const preset = KIND_PLACEMENTS[placement] ?? KIND_PLACEMENTS.field;
    const density = overrides.density ?? preset.density;
    return {
        scope: overrides.scope ?? preset.scope,
        density,
        select: overrides.select ?? preset.select,
        orientation: overrides.orientation ?? preset.orientation,
        variant: overrides.variant ?? KIND_VARIANT_FOR[density],
    };
}

export function resolveRecordPlacement(
    placement: RecordPlacement = 'field',
    overrides: Partial<ResolvedRecordPlacement> = {},
): ResolvedRecordPlacement {
    const preset = RECORD_PLACEMENTS[placement] ?? RECORD_PLACEMENTS.field;
    return { density: overrides.density ?? preset.density, select: overrides.select ?? preset.select };
}
