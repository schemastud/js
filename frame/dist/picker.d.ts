import { R as ResourceSelectMode, a as ResourceSelection } from './ResourceRefWidget-DicocDWX.js';
export { E as EMPTY_SELECTION, I as IdsSelection, b as ResourcePickerWidget, c as ResourceRefConfig, d as ResourceRefWidget, e as SetSelection, f as followFilters, i as isEmptySelection, g as isPicked, h as isResourceRefNode, p as pageState, r as readResourceRefConfig, s as selectAllMatching, j as selectionCount, k as selectionFromValue, l as selectionToSearch, m as selectionToValue, n as setPagePicked, t as togglePick } from './ResourceRefWidget-DicocDWX.js';
import * as react from 'react';
import { ComponentType, ReactNode } from 'react';
import { b as ContextManifest, F as FrameColumn, k as Row, R as ResourceKey, a as RowOf } from './types-C1zrU238.js';
import { L as ListShellState } from './useListShell--RCZXH3M.js';
import '@schemastud/seam';
import '@schemastud/facets';
import '@rjsf/utils';
import '@schemastud/ui';

type ResourcePickerDensity = 'compact' | 'expanded';
/** Stage-1 kind scopes — each reads a fact the kind declares (see `ResourceKindOption.facts`). */
type ResourceKindScope = 'all' | 'framed' | 'writable' | 'filterable';
type ResourceKindVariant = 'palette' | 'rail' | 'catalog';
type KindPlacement = 'nav' | 'field' | 'filters' | 'seeder' | 'catalog';
type RecordPlacement = 'field' | 'attach' | 'bulk' | 'dynamic';
interface ResolvedKindPlacement {
    scope: ResourceKindScope;
    density: ResourcePickerDensity;
    select: Exclude<ResourceSelectMode, 'set'>;
    /** The body the density selects, unless a `variant` flag forces one. */
    variant: ResourceKindVariant;
    /** A compact rail lays out as a strip in a topbar or a form row, a column in a side panel. */
    orientation: 'horizontal' | 'vertical';
}
interface ResolvedRecordPlacement {
    density: ResourcePickerDensity;
    select: ResourceSelectMode;
}
declare const KIND_PLACEMENTS: Record<KindPlacement, Omit<ResolvedKindPlacement, 'variant'>>;
declare const RECORD_PLACEMENTS: Record<RecordPlacement, ResolvedRecordPlacement>;
/** The ruled density → variant map. `catalog` is reachable only through an explicit flag. */
declare const KIND_VARIANT_FOR: Record<ResourcePickerDensity, ResourceKindVariant>;
declare function resolveKindPlacement(placement?: KindPlacement, overrides?: Partial<Pick<ResolvedKindPlacement, 'scope' | 'density' | 'select' | 'orientation' | 'variant'>>): ResolvedKindPlacement;
declare function resolveRecordPlacement(placement?: RecordPlacement, overrides?: Partial<ResolvedRecordPlacement>): ResolvedRecordPlacement;

type IconComponent = ComponentType<{
    className?: string;
}>;
/** A lucide icon name from the built-in set, or a component. */
type ResourceKindIcon = string | IconComponent;
interface ResourceKindSection {
    key: string;
    label: string;
    icon?: ResourceKindIcon;
}
/** One declared resource kind. `facts` are what the scopes read; absent facts never pass a scope. */
interface ResourceKindOption {
    key: string;
    label: string;
    /** The section key it is filed under; null/unknown files it under "Other". */
    section?: string | null;
    /** The fallback sub-heading inside "Other" (a backing package: Market, Accounts…). */
    group?: string;
    /** A second line in expanded bodies — the backing DTO, a short description. */
    detail?: string;
    /** Short flags (`read-only`, `unframed`) shown in expanded bodies. */
    badges?: string[];
    icon?: ResourceKindIcon;
    facts?: {
        framed?: boolean;
        writable?: boolean;
        filterable?: boolean;
    };
}
type ResourceKindScopeInput = ResourceKindScope | ((kind: ResourceKindOption) => boolean);
declare function kindsInScope(kinds: ResourceKindOption[], scope: ResourceKindScopeInput): ResourceKindOption[];
interface ResourceKindPickerProps {
    kinds: ResourceKindOption[];
    sections?: ResourceKindSection[];
    /** Where the picker is mounted; resolves scope × density × select. */
    placement?: KindPlacement;
    scope?: ResourceKindScopeInput;
    density?: ResourcePickerDensity;
    select?: 'single' | 'multi';
    /** Force a body; `catalog` is reachable only this way. */
    variant?: ResourceKindVariant;
    orientation?: 'horizontal' | 'vertical';
    /** Picked kind keys. */
    value: string[];
    onChange: (keys: string[]) => void;
    /** Accessible name of the whole control. */
    label?: string;
    id?: string;
    disabled?: boolean;
}
/** Stage 1: pick resource kinds. */
declare function ResourceKindPicker(props: ResourceKindPickerProps): react.JSX.Element;

interface ResourceRecordPickerProps {
    /** The resource key whose records are picked. */
    resource: string;
    placement?: RecordPlacement;
    density?: ResourcePickerDensity;
    select?: ResourceSelectMode;
    value: ResourceSelection;
    onChange: (next: ResourceSelection) => void;
    /** The row field a pick is keyed by (`x-stud-resource-ref.value`). */
    valueField?: string;
    /** The row field a pick is named by (`x-stud-resource-ref.label`). */
    labelField?: string;
    /** The `filter[<name>]` the typeahead searches through. */
    searchFacet?: string;
    /** The typeahead's page size. */
    perPage?: number;
    /** The typeahead's sort, e.g. `-updatedAt`. */
    defaultSort?: string;
    /** Fixed query params every request carries (`x-stud-resource-ref.scope`). */
    scope?: Record<string, string>;
    /** The kind's context manifest; defaults to the injection's `manifestFor(resource)`. */
    manifest?: ContextManifest;
    /** Host column overrides by field, as on ListShell. */
    columns?: FrameColumn[];
    /** `[singular, plural]`; defaults from the manifest's `singularLabel` and the key. */
    noun?: [string, string];
    /** The typeahead's second line for a row. */
    describe?: (row: Row) => ReactNode;
    /**
     * May a `multi` picker be promoted to a set ("Select all N matching")? Default true. A form field
     * whose value is an id ARRAY passes false: a set is an object, and the field's schema (and the PHP
     * reference contract) would refuse it. A `set` picker is always a set.
     */
    allowSet?: boolean;
    /** Expanded only: renders a confirm bar whose button hands back the selection. */
    onConfirm?: (selection: ResourceSelection) => void;
    confirmLabel?: string;
    id?: string;
    disabled?: boolean;
    'aria-labelledby'?: string;
    /** Story/test hooks: open the typeahead, or the browse sheet, on mount. */
    defaultOpen?: boolean;
    defaultBrowseOpen?: boolean;
}
/** Stage 2: pick records of one resource kind. */
declare function ResourceRecordPicker(props: ResourceRecordPickerProps): react.JSX.Element;

type ResourcePickerProps = ({
    stage?: 'kinds';
} & ResourceKindPickerProps) | ({
    stage?: 'records';
} & ResourceRecordPickerProps);
declare function ResourcePicker(props: ResourcePickerProps): react.JSX.Element;

/** What `useListSelection` takes besides the list. */
interface ListSelectionOptions {
    /** Controlled: the selection. Absent, the hook holds its own, starting empty. */
    value?: ResourceSelection;
    /** Told every new selection (controlled or not). */
    onChange?: (next: ResourceSelection) => void;
    /**
     * `single` keeps at most one id and offers no "all matching"; `multi` (the default) and `set` keep many ids until
     * "all matching" makes the selection a set. Whatever the mode, a toggle in a set is an exclusion or its undo.
     */
    select?: ResourceSelectMode;
    /** The row field that identifies a record. Default `id`. */
    idField?: string;
}
/** A list's selection: the picker's model over `useListShell`'s result (ruling 02 §6). */
interface ListSelection<K extends ResourceKey = ResourceKey> {
    /** The selection: the picker's wire shape, so a bulk action can send it. */
    value: ResourceSelection;
    isPicked(row: RowOf<K>): boolean;
    /** In a set, a toggle is an exclusion or its undo; in `single`, a second press on the picked row clears it. */
    toggle(row: RowOf<K>): void;
    /** How much of the page on screen the selection covers. */
    page: 'all' | 'some' | 'none';
    /** Tick or untick every row of the page on screen. In `single` it does nothing: a page is never one pick. */
    setPage(picked: boolean): void;
    /** Whether "all matching" is on offer: more rows match than the page shows, and the selection is not already a set. */
    canSelectAllMatching: boolean;
    /**
     * The whole result as a set over the list's filters, sort and address; it follows later filter changes. In
     * `single` it does nothing: a set is never one pick.
     */
    selectAllMatching(): void;
    clear(): void;
    /**
     * How many records the selection names. Null while a set's total is unknown, and while the list shows the
     * previous request's rows (`placeholder`): the real count returns with the current result.
     */
    count: number | null;
    /** False while `count` is null, and while a set holds exclusions not yet seen matching its filter: say "up to". */
    exact: boolean;
}
/**
 * A list's selection over `useListShell`'s result (ruling 02 §6, slice 12): whether a row is picked, toggling a
 * row, the page's all, some or none state and ticking the whole page, promoting to "all matching" as a set that
 * follows the filters, clearing, and the count with its exactness. It is controlled (`value`, `onChange`) or holds
 * its own state. `ListShell` does not select; a custom table calls this beside `useListShell`, and the record picker
 * is its first consumer.
 *
 * It reads only the list's state: rows, filters, the selected collection, `total` and `placeholder`. A row counts as
 * seen matching only once it is the list's own answer (`!placeholder`), never the previous request's rows held on
 * screen, so a set never subtracts an exclusion it has not seen match its current filter.
 */
declare function useListSelection<K extends ResourceKey = ResourceKey>(list: ListShellState<K>, options?: ListSelectionOptions): ListSelection<K>;

export { KIND_PLACEMENTS, KIND_VARIANT_FOR, type KindPlacement, type ListSelection, type ListSelectionOptions, RECORD_PLACEMENTS, type RecordPlacement, type ResolvedKindPlacement, type ResolvedRecordPlacement, type ResourceKindIcon, type ResourceKindOption, ResourceKindPicker, type ResourceKindPickerProps, type ResourceKindScope, type ResourceKindScopeInput, type ResourceKindSection, type ResourceKindVariant, ResourcePicker, type ResourcePickerDensity, type ResourcePickerProps, ResourceRecordPicker, type ResourceRecordPickerProps, ResourceSelectMode, ResourceSelection, kindsInScope, resolveKindPlacement, resolveRecordPlacement, useListSelection };
