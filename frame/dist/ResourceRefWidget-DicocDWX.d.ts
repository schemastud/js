import * as react from 'react';
import { WidgetRegistry, SchemaNode } from '@schemastud/seam';

type ResourceSelectMode = 'single' | 'multi' | 'set';
interface IdsSelection {
    mode: 'ids';
    ids: string[];
}
interface SetSelection {
    mode: 'set';
    filter: Record<string, string>;
    sort: string | null;
    exclude: string[];
    /**
     * The rest of the query ADDRESS, present only when the browse surface used it: the Collection a
     * multi-Collection resource was read from, and the filter vocabulary (`filterVariant`) the facets
     * were chosen in. Without them two different server queries could serialize to the same set.
     */
    collection?: string;
    filterVariant?: string;
}
/** Where a set's query is addressed, beyond its facets. */
interface SetAddress {
    collection?: string | null;
    filterVariant?: string | null;
}
type ResourceSelection = IdsSelection | SetSelection;
declare const EMPTY_SELECTION: IdsSelection;
/** A set over the given facets with no exceptions — what "Select all N matching" produces. */
declare function selectAllMatching(filter: Record<string, string>, sort: string | null, address?: SetAddress): SetSelection;
/** Is this record named by the selection? A set names everything it does not exclude. */
declare function isPicked(selection: ResourceSelection, id: string): boolean;
/**
 * Toggle one record. In a set, a toggle is an exclusion (or its undo). `single` keeps at most
 * one id and a second press on the picked one clears it.
 */
declare function togglePick(selection: ResourceSelection, id: string, select: ResourceSelectMode): ResourceSelection;
/** How much of one page the selection covers — drives the header tri-state checkbox. */
declare function pageState(selection: ResourceSelection, pageIds: string[]): 'all' | 'some' | 'none';
/**
 * Tick or untick every row of one page. Ids mode adds/removes them (keeping picks from other
 * pages); set mode un-excludes/excludes them, so the set itself is never lost.
 */
declare function setPagePicked(selection: ResourceSelection, pageIds: string[], picked: boolean): ResourceSelection;
/**
 * A set FOLLOWS the facets: it is the filter (plus exceptions), so editing the facets edits it.
 * Exclusions are kept across the change — one that no longer matches is harmless, and dropping
 * it would silently re-include the record if the filter is changed back.
 */
declare function followFilters(selection: ResourceSelection, filter: Record<string, string>, sort: string | null, address?: SetAddress): ResourceSelection;
declare function isEmptySelection(selection: ResourceSelection): boolean;
/**
 * How many records a selection names right now. Ids count themselves. A set needs the server's
 * `total` for its filter and subtracts only the exclusions KNOWN to still match (`liveExcluded`):
 * an exclusion stranded by a filter change cannot be subtracted until a page shows it matching.
 * `exact` is false while some exclusions are unverified, so the readout can say "up to".
 */
declare function selectionCount(selection: ResourceSelection, total: number | null, liveExcluded?: number): {
    count: number | null;
    exact: boolean;
};
/** The URL query a browse surface is seeded with so it re-opens on a set's own facets. */
declare function selectionToSearch(selection: ResourceSelection): string;
/**
 * Normalize an RJSF form value into a selection. A single field holds one id (string), a multi
 * field an id array, a set field the selection object itself.
 */
declare function selectionFromValue(value: unknown): ResourceSelection;
/** The inverse of {@link selectionFromValue} for a field of the given select mode. */
declare function selectionToValue(selection: ResourceSelection, select: ResourceSelectMode): unknown;

/** The keyword a reference field carries its picker config on (`x-stud-resource-ref`); the form mode never touches it. */
declare const STUD_RESOURCE_REF_KEYWORD = "x-stud-resource-ref";
/** The config bag frame reads off the schema node (mirror of the PHP-emitted shape). */
interface ResourceRefConfig {
    resource: string;
    value: string;
    label: string;
    multiple?: boolean;
    scope?: Record<string, string | number | boolean>;
    /** The selection model; defaults from `multiple`. */
    select?: ResourceSelectMode;
    /** The `filter[<name>]` the typeahead searches; defaults to `keywords`. */
    searchFacet?: string;
}
/** Read the picker config off a schema node; undefined when the keyword is absent. */
declare function readResourceRefConfig(schema: SchemaNode | undefined): ResourceRefConfig | undefined;
interface ResourceRefWidgetProps {
    id?: string;
    value?: unknown;
    disabled?: boolean;
    readonly?: boolean;
    onChange: (value: unknown) => void;
    schema?: SchemaNode;
    formContext?: unknown;
    registry?: {
        formContext?: unknown;
    };
}
/**
 * An RJSF widget: a resource-reference field renders the ResourcePicker's compact body — a
 * server typeahead (`filter[<searchFacet>]`, `per_page=8`) with "Browse all N with filters"
 * opening the embedded list shell in a sheet. It emits through RJSF `onChange`.
 *
 * Outside a FrameProvider (seam's `defaultRegistry` resolving on a hand-rolled form walker with
 * no transport in reach) it degrades to a read-only readout of the stored value instead of
 * throwing, because there is nothing to search.
 */
declare function ResourceRefWidget(props: ResourceRefWidgetProps): react.JSX.Element | null;
/** The ResourcePicker's form-field face — the same component under its new name. */
declare const ResourcePickerWidget: typeof ResourceRefWidget;
/**
 * Does this node resolve to the picker? Any node carrying `x-stud-resource-ref`, EXCEPT one that
 * also names an explicit `x-widget`: that is the host's declared choice (a silo tree, a tag
 * input), and frame installs late — into a host's fresh registry and into seam's singleton at
 * provider mount — so without this a built-in would silently shadow the declaration.
 */
declare function isResourceRefNode(schema: SchemaNode): boolean;
/**
 * Register the resource-ref widget under a predicate matching any node carrying the
 * `x-stud-resource-ref` keyword. Idempotent registration is the caller's concern
 * (FrameProvider guards a once-per-registry install); the seam consults later
 * registrations first, so a re-register would merely shadow itself harmlessly.
 */
declare function registerResourceRefWidget(registry: WidgetRegistry): void;

export { EMPTY_SELECTION as E, type IdsSelection as I, type ResourceSelectMode as R, STUD_RESOURCE_REF_KEYWORD as S, type ResourceSelection as a, ResourcePickerWidget as b, type ResourceRefConfig as c, ResourceRefWidget as d, type SetSelection as e, followFilters as f, isPicked as g, isResourceRefNode as h, isEmptySelection as i, selectionCount as j, selectionFromValue as k, selectionToSearch as l, selectionToValue as m, setPagePicked as n, registerResourceRefWidget as o, pageState as p, readResourceRefConfig as r, selectAllMatching as s, togglePick as t };
