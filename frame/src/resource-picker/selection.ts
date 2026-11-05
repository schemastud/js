// =============================================================================
// The ResourcePicker selection model — pure, framework-free, and the only place the
// wire shape is spelled. A selection crosses the wire as exactly one of:
//
//   { mode: 'ids', ids }                        — a static pick, kept by id
//   { mode: 'set', filter, sort, exclude }      — "every record matching this filter",
//                                                 minus the ones the actor un-ticked
//
// `filter` is the facets dialect verbatim (`filter[<name>]` values keyed by name) and
// `sort` the comma-joined `sort` param, so a set is a saved filter plus exceptions.
// Picks survive paging, filtering and sorting because they are held here by id, never
// derived from the rows on screen.
// =============================================================================

export type ResourceSelectMode = 'single' | 'multi' | 'set';

export interface IdsSelection {
    mode: 'ids';
    ids: string[];
}

export interface SetSelection {
    mode: 'set';
    filter: Record<string, string>;
    sort: string | null;
    exclude: string[];
}

export type ResourceSelection = IdsSelection | SetSelection;

export const EMPTY_SELECTION: IdsSelection = Object.freeze({ mode: 'ids', ids: [] }) as IdsSelection;

/** A set over the given facets with no exceptions — what "Select all N matching" produces. */
export function selectAllMatching(filter: Record<string, string>, sort: string | null): SetSelection {
    return { mode: 'set', filter: { ...filter }, sort, exclude: [] };
}

/** Is this record named by the selection? A set names everything it does not exclude. */
export function isPicked(selection: ResourceSelection, id: string): boolean {
    return selection.mode === 'set' ? !selection.exclude.includes(id) : selection.ids.includes(id);
}

/**
 * Toggle one record. In a set, a toggle is an exclusion (or its undo). `single` keeps at most
 * one id and a second press on the picked one clears it.
 */
export function togglePick(selection: ResourceSelection, id: string, select: ResourceSelectMode): ResourceSelection {
    if (selection.mode === 'set') {
        return {
            ...selection,
            exclude: selection.exclude.includes(id)
                ? selection.exclude.filter((x) => x !== id)
                : [...selection.exclude, id],
        };
    }
    if (select === 'single') return { mode: 'ids', ids: selection.ids[0] === id ? [] : [id] };
    return {
        mode: 'ids',
        ids: selection.ids.includes(id) ? selection.ids.filter((x) => x !== id) : [...selection.ids, id],
    };
}

/** How much of one page the selection covers — drives the header tri-state checkbox. */
export function pageState(selection: ResourceSelection, pageIds: string[]): 'all' | 'some' | 'none' {
    if (pageIds.length === 0) return 'none';
    const on = pageIds.filter((id) => isPicked(selection, id)).length;
    return on === 0 ? 'none' : on === pageIds.length ? 'all' : 'some';
}

/**
 * Tick or untick every row of one page. Ids mode adds/removes them (keeping picks from other
 * pages); set mode un-excludes/excludes them, so the set itself is never lost.
 */
export function setPagePicked(selection: ResourceSelection, pageIds: string[], picked: boolean): ResourceSelection {
    const page = new Set(pageIds);
    if (selection.mode === 'set') {
        const rest = selection.exclude.filter((id) => !page.has(id));
        return { ...selection, exclude: picked ? rest : [...rest, ...pageIds] };
    }
    const rest = selection.ids.filter((id) => !page.has(id));
    return { mode: 'ids', ids: picked ? [...rest, ...pageIds] : rest };
}

/**
 * A set FOLLOWS the facets: it is the filter (plus exceptions), so editing the facets edits it.
 * Exclusions are kept across the change — one that no longer matches is harmless, and dropping
 * it would silently re-include the record if the filter is changed back.
 */
export function followFilters(
    selection: ResourceSelection,
    filter: Record<string, string>,
    sort: string | null,
): ResourceSelection {
    if (selection.mode !== 'set') return selection;
    if (sameFilter(selection.filter, filter) && selection.sort === sort) return selection;
    return { ...selection, filter: { ...filter }, sort };
}

export function sameFilter(a: Record<string, string>, b: Record<string, string>): boolean {
    const ka = Object.keys(a).filter((k) => a[k] !== '');
    const kb = Object.keys(b).filter((k) => b[k] !== '');
    return ka.length === kb.length && ka.every((k) => a[k] === b[k]);
}

export function isEmptySelection(selection: ResourceSelection): boolean {
    return selection.mode === 'ids' && selection.ids.length === 0;
}

/**
 * How many records a selection names right now. Ids count themselves. A set needs the server's
 * `total` for its filter and subtracts only the exclusions KNOWN to still match (`liveExcluded`):
 * an exclusion stranded by a filter change cannot be subtracted until a page shows it matching.
 * `exact` is false while some exclusions are unverified, so the readout can say "up to".
 */
export function selectionCount(
    selection: ResourceSelection,
    total: number | null,
    liveExcluded = 0,
): { count: number | null; exact: boolean } {
    if (selection.mode === 'ids') return { count: selection.ids.length, exact: true };
    if (total === null) return { count: null, exact: false };
    return {
        count: Math.max(0, total - liveExcluded),
        exact: liveExcluded >= selection.exclude.length,
    };
}

/** The URL query a browse surface is seeded with so it re-opens on a set's own facets. */
export function selectionToSearch(selection: ResourceSelection): string {
    if (selection.mode !== 'set') return '';
    const params = new URLSearchParams();
    for (const [name, value] of Object.entries(selection.filter)) {
        if (value !== '') params.set(`filter[${name}]`, value);
    }
    if (selection.sort) params.set('sort', selection.sort);
    return params.toString();
}

/**
 * Normalize an RJSF form value into a selection. A single field holds one id (string), a multi
 * field an id array, a set field the selection object itself.
 */
export function selectionFromValue(value: unknown): ResourceSelection {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
        const bag = value as { mode?: unknown; filter?: Record<string, string>; sort?: string | null; exclude?: unknown[]; ids?: unknown[] };
        if (bag.mode === 'set') {
            return {
                mode: 'set',
                filter: { ...(bag.filter ?? {}) },
                sort: bag.sort ?? null,
                exclude: Array.isArray(bag.exclude) ? bag.exclude.map(String) : [],
            };
        }
        if (bag.mode === 'ids') return { mode: 'ids', ids: Array.isArray(bag.ids) ? bag.ids.map(String) : [] };
    }
    if (Array.isArray(value)) return { mode: 'ids', ids: value.map(String) };
    if (value === null || value === undefined || value === '') return EMPTY_SELECTION;
    return { mode: 'ids', ids: [String(value)] };
}

/** The inverse of {@link selectionFromValue} for a field of the given select mode. */
export function selectionToValue(selection: ResourceSelection, select: ResourceSelectMode): unknown {
    if (select === 'set') return selection;
    if (selection.mode === 'set') return selection; // a multi field promoted to "all matching"
    if (select === 'single') return selection.ids[0];
    return selection.ids;
}
