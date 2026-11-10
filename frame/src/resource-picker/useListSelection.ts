import { useCallback, useEffect, useRef, useState } from 'react';
import type { ResourceKey, RowOf } from '../resources';
import type { ListShellState, ListShellStateOf } from '../useListShell';
import type { Row } from '../types';
import {
    EMPTY_SELECTION,
    followFilters,
    isPicked as selectionPicks,
    pageState,
    selectAllMatching as allMatching,
    selectionCount,
    setPagePicked,
    togglePick,
    type ResourceSelectMode,
    type ResourceSelection,
} from './selection';

/** What `useListSelection` takes besides the list. */
export interface ListSelectionOptions {
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

/** @internal `ListSelection` over untyped rows: frame's own view, which the record picker reads. Not exported from any entry. */
export type ListSelectionOf = Omit<ListSelection, 'isPicked' | 'toggle'> & {
    isPicked(row: Row): boolean;
    toggle(row: Row): void;
};

/** A list's selection: the picker's model over `useListShell`'s result (ruling 02 §6). */
export interface ListSelection<K extends ResourceKey = ResourceKey> {
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
export function useListSelection<K extends ResourceKey = ResourceKey>(
    list: ListShellState<K>,
    options: ListSelectionOptions = {},
): ListSelection<K> {
    return useListSelectionOf(list, options) as ListSelection<K>;
}

/**
 * @internal `useListSelection` over any string key, which the record picker calls with its runtime key (ruling 03:
 * typed at the boundary). Not exported from any entry.
 */
export function useListSelectionOf<K extends string>(
    list: ListShellStateOf<K>,
    options: ListSelectionOptions = {},
): ListSelectionOf {
    const { value: controlled, onChange, select = 'multi', idField = 'id' } = options;
    const [own, setOwn] = useState<ResourceSelection>(EMPTY_SELECTION);
    const value = controlled ?? own;
    const change = useCallback(
        (next: ResourceSelection) => {
            if (controlled === undefined) setOwn(next);
            onChange?.(next);
        },
        [controlled, onChange],
    );

    const rows = list.rows as Row[];
    const idOf = (row: Row) => String(row[idField] ?? row.id);
    const filterValues = list.filters.filterValues;
    const sort = list.filters.sort;
    const address = { collection: list.collection.selected ?? null, filterVariant: list.filters.filterVariant };
    const filterKey = `${filterKeyOf(filterValues)}|${address.collection ?? ''}|${address.filterVariant ?? ''}`;

    // Which ids have been SEEN matching each filter, so a set subtracts only exclusions known to still match.
    const seen = useRef(new Map<string, Set<string>>());
    if (rows.length > 0 && !list.placeholder) {
        const bucket = seen.current.get(filterKey) ?? new Set<string>();
        rows.forEach((row) => bucket.add(idOf(row)));
        seen.current.set(filterKey, bucket);
    }
    const liveExcluded =
        value.mode === 'set' ? value.exclude.filter((id) => seen.current.get(filterKey)?.has(id)).length : 0;
    // While the rows on screen are the previous request's, their total is too: no count until the current result.
    const counted = selectionCount(value, list.total, liveExcluded);
    const count = list.placeholder ? null : counted.count;
    const exact = count !== null && counted.exact;

    // A set FOLLOWS the facets, keeping its exclusions.
    useEffect(() => {
        const next = followFilters(value, filterValues, sort, address);
        if (next !== value) change(next);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [filterKey, sort]);

    const pageIds = rows.map(idOf);
    return {
        value,
        isPicked: (row) => selectionPicks(value, idOf(row)),
        toggle: (row) => change(togglePick(value, idOf(row), select)),
        page: pageState(value, pageIds),
        setPage: (picked) => {
            if (select !== 'single') change(setPagePicked(value, pageIds, picked));
        },
        canSelectAllMatching: select !== 'single' && value.mode !== 'set' && list.total !== null && list.total > rows.length,
        selectAllMatching: () => {
            if (select !== 'single') change(allMatching(filterValues, sort, address));
        },
        clear: () => change(EMPTY_SELECTION),
        count,
        exact,
    };
}

/** A filter's identity for the seen map: its non-empty values, order-free. */
export function filterKeyOf(filter: Record<string, string>): string {
    return JSON.stringify(Object.entries(filter).filter(([, v]) => v !== '').sort());
}
