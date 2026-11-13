import { useFrameMessages } from '../messages';
import {
    Fragment,
    createContext,
    useCallback,
    useContext,
    useEffect,
    useId,
    useMemo,
    useRef,
    useState,
    type ComponentProps,
    type ComponentType,
    type ReactNode,
} from 'react';
import { QueryClient, QueryClientContext, QueryClientProvider } from '@tanstack/react-query';
import { useListFilters } from '@schemastud/facets';
import { createMemoryUrlState } from '../memoryUrlState';
import {
    Button,
    Popover,
    PopoverContent,
    PopoverTrigger,
    Sheet,
    SheetContent,
    SheetDescription,
    SheetFooter,
    SheetHeader,
    SheetTitle,
    cn,
    useIsMobile,
} from '@schemastud/ui';
import { Check, ChevronsUpDown, ListFilter, Loader2, Search, X } from 'lucide-react';
import { FrameProvider, useFrameInjection } from '../context';
import { ListShell } from '../ListShell';

// The picker's resource is a runtime key, so it mounts the list untyped, cast once here (ruling 03).
const UntypedListShell = ListShell as unknown as ComponentType<ListShellPropsOf<string>>;
import { ShadcnTable, shadcnListSlots } from '../shadcn/list-slots';
import type { ContextManifest } from '../contexts';
import type { FrameColumn, FrameInjection, ListShellPropsOf, Row } from '../types';
import { useListShellOf } from '../useListShell';
import { resolveRecordPlacement, type RecordPlacement, type ResourcePickerDensity } from './placement';
import { useListSelectionOf } from './useListSelection';
import {
    EMPTY_SELECTION,
    isEmptySelection,
    isPicked,
    pageState,
    selectAllMatching,
    selectionToSearch,
    togglePick,
    type ResourceSelectMode,
    type ResourceSelection,
} from './selection';

// =============================================================================
// Stage 2 — pick RECORDS of one kind. Density picks the body; `select` picks the model.
//
//   compact  — a server typeahead: `filter[<searchFacet>]` with `per_page=8`, always
//              "8 of N", always "Browse all N with filters" (the escape hatch). Phone
//              opens it as a bottom sheet.
//   expanded — the embedded list shell: frame's own `ListShell` over the kind's
//              declared `list-column` manifest, `x-filter` facets, `x-sort` sorts and
//              server paging, inside a picker container (pick column with a tri-state
//              header, selection bar, tray, confirm bar). The compact escape hatch
//              opens the same body in a Sheet that edits a draft.
//
// The embedded shell is NOT a fork of ListShell. It uses the seams ListShell exposes:
//   1. a scoped FrameProvider with in-memory URL state (a nested surface must not
//      share — or read — the host page's URL);
//   2. a Table slot (PickTable) over ShadcnTable's row-state hook;
//   3. a host column override by field for the pick cell and header checkbox;
//   4. `can` answering false for create / update / delete, plus a manifest copy with
//      no actions, no row-cell editing and no cards path.
// =============================================================================

export interface ResourceRecordPickerProps {
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


function nounFor(props: ResourceRecordPickerProps, manifest: ContextManifest | undefined): [string, string] {
    if (props.noun) return props.noun;
    const one = manifest?.singularLabel || props.resource.replace(/[-_]/g, ' ').replace(/s$/, '');
    const many = props.resource.replace(/[-_]/g, ' ');
    return [one.toLowerCase(), many.toLowerCase()];
}

/* ─────────────────────────────── scoped URL state ─────────────────────────────── */

// Each picker gets its own memory URL state (`createMemoryUrlState`): on a host page
// `useUrlState` is the page URL, which would mix the picker's `filter[…]` and `page` into the
// host's own list (and the host's params into the picker's request — facets' `requestParams` is
// every entry). The reference field's scope rides in `fixed`, so a scoped field never browses
// records outside its scope.

/** A picker reads; it never offers New, Edit or Delete — nor declared actions, inline edits or cards. */
function pickerManifest(manifest: ContextManifest | undefined): ContextManifest | undefined {
    if (!manifest) return undefined;
    const byNode: ContextManifest['byNode'] = {};
    for (const [key, byCtx] of Object.entries(manifest.byNode)) {
        const { 'row-cell': _rowCell, 'list-item': _listItem, ...rest } = byCtx;
        byNode[key] = rest;
    }
    return { ...manifest, byNode, actions: [], createAffordance: 'host' };
}

/** A QueryClient for a picker mounted where the host has none (a form outside a data shell). */
function EnsureQueryClient({ children }: { children: ReactNode }) {
    const existing = useContext(QueryClientContext);
    const [own] = useState(() =>
        existing ? null : new QueryClient({ defaultOptions: { queries: { retry: false, refetchOnWindowFocus: false } } }),
    );
    if (existing || !own) return <>{children}</>;
    return <QueryClientProvider client={own}>{children}</QueryClientProvider>;
}

function PickerScope({ children, initialSearch, fixed }: { children: ReactNode; initialSearch: string; fixed?: Record<string, string> }) {
    const outer = useFrameInjection();
    const [useUrlState] = useState(() => createMemoryUrlState(initialSearch, fixed));
    const injection = useMemo<FrameInjection>(
        () => ({
            ...outer,
            useUrlState,
            can: (action, resource, record) =>
                (action === 'viewAny' || action === 'view') && outer.can(action, resource, record),
            listSlots: { ...shadcnListSlots, ...outer.listSlots, Table: PickTable, RowActions: undefined },
        }),
        [outer, useUrlState],
    );
    return (
        <EnsureQueryClient>
            <FrameProvider value={injection}>{children}</FrameProvider>
        </EnsureQueryClient>
    );
}

/* ─────────────────────────────── pick context + table ─────────────────────────────── */

interface PickContextValue {
    select: ResourceSelectMode;
    selection: ResourceSelection;
    valueField: string;
    labelField: string;
    onToggle: (row: Row) => void;
    onPage: (rows: Row[], picked: boolean) => void;
    rows: Row[];
    noun: [string, string];
    disabled?: boolean;
}

const PickContext = createContext<PickContextValue | null>(null);
function usePick(): PickContextValue {
    const ctx = useContext(PickContext);
    if (!ctx) throw new Error('@schemastud/frame: a pick cell rendered outside a ResourcePicker.');
    return ctx;
}

const idOf = (row: Row, valueField: string) => String(row[valueField] ?? row.id);

/**
 * The Table slot: frame's own shadcn table with row-click meaning "toggle" and the selected-row
 * tint wired through its row-state hook. The stacked phone cards keep the explicit pick control,
 * drop frame's "Open" button (it would lie here), and show three fields, not the list's six.
 */
function PickTable(props: ComponentProps<typeof ShadcnTable>) {
    const isMobile = useIsMobile();
    const pick = usePick();
    const columns = isMobile ? props.columns.slice(0, 3) : props.columns;
    return (
        <ShadcnTable
            {...props}
            columns={columns}
            RowActions={undefined}
            onOpen={pick.disabled ? undefined : pick.onToggle}
            rowSelected={(row) => isPicked(pick.selection, idOf(row, pick.valueField))}
        />
    );
}

function PickCell({ row, field }: { row: Row; field: string }) {
    const { t } = useFrameMessages();
    const { select, selection, onToggle, valueField, labelField, disabled } = usePick();
    const id = idOf(row, valueField);
    const on = isPicked(selection, id);
    const name = String(row[labelField] ?? row[field] ?? id);
    return (
        <label
            className="flex min-w-0 cursor-pointer items-center gap-3"
            onClick={(e) => e.stopPropagation()}
        >
            <input
                type={select === 'single' ? 'radio' : 'checkbox'}
                checked={on}
                disabled={disabled}
                onChange={() => onToggle(row)}
                aria-label={t(on ? "schemastud-frame::messages.deselect_name" : "schemastud-frame::messages.select_name", { name })}
                className="size-5 shrink-0 accent-[var(--primary)] sm:size-4"
            />
            <span className={cn('min-w-0 truncate', on ? 'font-medium text-foreground' : 'text-foreground')}>
                {String(row[field] ?? '—')}
            </span>
        </label>
    );
}

/** The tri-state header checkbox: ticks or unticks every row of the page on screen. */
function PageCheckbox() {
    const { t } = useFrameMessages();
    const { selection, rows, valueField, onPage, disabled, noun } = usePick();
    const state = pageState(selection, rows.map((r) => idOf(r, valueField)));
    const ref = useRef<HTMLInputElement>(null);
    useEffect(() => {
        if (ref.current) ref.current.indeterminate = state === 'some';
    }, [state]);
    return (
        <input
            ref={ref}
            type="checkbox"
            checked={state === 'all'}
            disabled={disabled || rows.length === 0}
            onChange={() => onPage(rows, state !== 'all')}
            aria-checked={state === 'some' ? 'mixed' : state === 'all'}
            aria-label={state === 'all' ? t("schemastud-frame::messages.deselect_all_resources_on_this_page", { resources: noun[1] }) : t("schemastud-frame::messages.select_all_resources_on_this_page", { resources: noun[1] })}
            className="size-4 shrink-0 accent-[var(--primary)]"
        />
    );
}

/** The pick column is the label column when the manifest lists it, else the first listed column. */
function pickColumns(
    manifest: ContextManifest | undefined,
    labelField: string,
    select: ResourceSelectMode,
    host: FrameColumn[] | undefined,
    nameHeader: string,
): FrameColumn[] {
    const listed = manifest
        ? Object.entries(manifest.byNode)
              .filter(([key, byCtx]) => key !== '' && byCtx['list-column']?.participates)
              .sort(([, a], [, b]) => (a['list-column']?.sort ?? Infinity) - (b['list-column']?.sort ?? Infinity))
              .map(([key]) => key)
        : [labelField];
    const field = listed.includes(labelField) ? labelField : (listed[0] ?? labelField);
    const others = (host ?? []).filter((c) => c.field !== field);
    const own = (host ?? []).find((c) => c.field === field);
    return [
        {
            ...own,
            field,
            ...(manifest ? {} : { header: own?.header ?? nameHeader }),
            cell: (row: Row) => <PickCell row={row} field={field} />,
            ...(select === 'single' ? {} : { headerControl: () => <PageCheckbox /> }),
        },
        ...others,
    ];
}

/* ─────────────────────────────── browse (embedded ListShell) ─────────────────────────────── */

interface BodyProps {
    props: ResourceRecordPickerProps;
    select: ResourceSelectMode;
    selection: ResourceSelection;
    onChange: (next: ResourceSelection) => void;
    labels: Map<string, string>;
    manifest: ContextManifest | undefined;
    noun: [string, string];
    valueField: string;
    labelField: string;
    /** Told how many records the selection names now (null while unknown) — the confirm copy reads it. */
    onCount?: (count: number | null) => void;
}

// Render scalar shownCount as an element only after translation; choice reserves count for its number.
const EMPHASIZED_COUNT = '\uFFF0\uFFF1';
function emphasizeCount(sentence: string, count: string): ReactNode {
    return sentence.split(EMPHASIZED_COUNT).map((part, index) => <Fragment key={index}>{index > 0 ? <b className="tabular-nums">{count}</b> : null}{part}</Fragment>);
}

function SelectionBar({
    select,
    selection,
    onChange,
    noun,
    total,
    count,
    exact,
    canSelectAllMatching,
    onSelectAllMatching,
    isLoading,
    isError,
    retry,
    describeFilter,
    disabled,
    allowSet,
}: Pick<BodyProps, 'select' | 'selection' | 'onChange' | 'noun'> & {
    allowSet: boolean;
    total: number | null;
    /** The list selection's count and exactness (`useListSelection`). */
    count: number | null;
    exact: boolean;
    canSelectAllMatching: boolean;
    onSelectAllMatching: () => void;
    isLoading: boolean;
    isError: boolean;
    retry: () => void;
    describeFilter: string;
    disabled?: boolean;
}) {
    const messages = useFrameMessages();
    const { t, number: fmt, choice } = messages;
    const [undo, setUndo] = useState<ResourceSelection | null>(null);
    const isSet = selection.mode === 'set';
    const n = count ?? 0;

    if (isError) {
        return (
            <div role="alert" className="flex flex-wrap items-center gap-3 rounded-lg border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm">
                <span className="min-w-0 flex-1">{t("schemastud-frame::messages.couldn_t_load_resources_your_selection_is_kept", { resources: noun[1] })}</span>
                <Button type="button" variant="outline" size="sm" onClick={retry}>{t("schemastud-frame::messages.try_again")}</Button>
            </div>
        );
    }

    const clear = () => {
        setUndo(selection);
        onChange(EMPTY_SELECTION);
    };
    const excluded = isSet ? selection.exclude.length : 0;

    return (
        <div
            role="status"
            aria-live="polite"
            data-picker-bar
            className={cn(
                'flex flex-wrap items-center gap-x-3 gap-y-2 rounded-lg border px-3 py-2 text-sm',
                isSet || n > 0 ? 'border-primary/30 bg-primary/[0.06]' : 'border-border bg-card',
            )}
        >
            <span className="min-w-0 flex-1 basis-full sm:basis-auto">
                {isSet ? (
                    <>
                        <span className="mr-1.5 inline-flex h-5 items-center rounded bg-primary px-1.5 align-[1px] text-xs font-medium text-primary-foreground">
                            {select === 'set' ? t("schemastud-frame::messages.dynamic") : t("schemastud-frame::messages.all_matching")}
                        </span>
                        <b>{excluded > 0
                            ? choice(describeFilter ? "schemastud-frame::messages.picker.every_filtered_except" : "schemastud-frame::messages.picker.every_except", excluded, { resource: noun[0], excluded: fmt(excluded) })
                            : t(describeFilter ? "schemastud-frame::messages.picker.every_filtered" : "schemastud-frame::messages.picker.every", { resource: noun[0] })}</b>
                        {count !== null ? (
                            <span className="text-muted-foreground tabular-nums">{' '}{choice(exact ? "schemastud-frame::messages.picker.today" : "schemastud-frame::messages.picker.today_limit", n, { count: fmt(n) })}
                            </span>
                        ) : null}
                        <span className="block text-xs text-muted-foreground">
                            {t(select === 'set' ? "schemastud-frame::messages.picker.dynamic_description" : "schemastud-frame::messages.picker.matching_description", { filter: describeFilter || t("schemastud-frame::messages.all_resources", { resources: noun[1] }) })}
                        </span>
                    </>
                ) : n > 0 ? (
                    <>
                        {emphasizeCount(choice(total !== null ? "schemastud-frame::messages.picker.selected_matching" : "schemastud-frame::messages.picker.selected", n, { shownCount: EMPHASIZED_COUNT, one: noun[0], many: noun[1], total: total === null ? '' : fmt(total) }), fmt(n))}
                    </>
                ) : undo ? (
                    <span>
                        {t("schemastud-frame::messages.selection_cleared")}{' '}
                        <button
                            type="button"
                            disabled={disabled}
                            className="font-medium text-primary underline-offset-2 hover:underline"
                            onClick={() => {
                                if (disabled) return;
                                onChange(undo);
                                setUndo(null);
                            }}
                        >{t("schemastud-frame::messages.undo")}</button>
                    </span>
                ) : (
                    <span className="text-muted-foreground">
                        {isLoading
                            ? t("schemastud-frame::messages.loading")
                            : total === null
                              ? t(select === 'single' ? "schemastud-frame::messages.picker.matches_unknown_single" : "schemastud-frame::messages.picker.matches_unknown_multi", { many: noun[1] })
                              : choice(select === 'single' ? "schemastud-frame::messages.picker.matches_single" : "schemastud-frame::messages.picker.matches_multi", total, { count: fmt(total), one: noun[0], many: noun[1] })}
                    </span>
                )}
            </span>
            {allowSet && canSelectAllMatching && total !== null ? (
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={disabled}
                    onClick={() => {
                        setUndo(null);
                        onSelectAllMatching();
                    }}
                >{t("schemastud-frame::messages.select_all_value_matching", { value: fmt(total) })}</Button>
            ) : null}
            {select !== 'set' && (isSet || n > 0) ? (
                <Button type="button" variant="ghost" size="sm" disabled={disabled} onClick={clear}>{t("schemastud-frame::messages.clear")}</Button>
            ) : null}
        </div>
    );
}

function Tray({
    selection,
    onChange,
    labels,
    select,
    noun,
    disabled,
}: Pick<BodyProps, 'selection' | 'onChange' | 'labels' | 'select' | 'noun'> & { disabled?: boolean }) {
    const { t, choice, number: fmt } = useFrameMessages();
    const isMobile = useIsMobile();
    const [expanded, setExpanded] = useState(false);
    const ids = selection.mode === 'set' ? selection.exclude : selection.ids;
    if (ids.length === 0 || select === 'single') return null;
    const cap = expanded ? ids.length : isMobile ? 2 : 8;
    const isSet = selection.mode === 'set';
    return (
        <div className="flex min-w-0 flex-wrap items-center gap-1.5 text-xs" aria-label={isSet ? t("schemastud-frame::messages.excluded_resources", { resources: noun[1] }) : t("schemastud-frame::messages.picked_resources", { resources: noun[1] })} role="group">
            <span className="text-muted-foreground">{isSet ? t("schemastud-frame::messages.excluded") : t("schemastud-frame::messages.picked")}</span>
            {ids.slice(0, cap).map((id) => {
                const name = labels.get(id) ?? id;
                return (
                    <span
                        key={id}
                        className={cn(
                            'inline-flex h-6 max-w-56 min-w-0 items-center gap-1 rounded-md border border-border bg-card pr-0.5 pl-2',
                            isSet && 'line-through decoration-foreground/40',
                        )}
                    >
                        <span className="truncate">{name}</span>
                        <button
                            type="button"
                            disabled={disabled}
                            aria-label={isSet ? t("schemastud-frame::messages.include_name_again", { name: name }) : t("schemastud-frame::messages.remove_name", { name: name })}
                            onClick={() => {
                                if (!disabled) onChange(togglePick(selection, id, 'multi'));
                            }}
                            className="grid size-7 place-items-center rounded sm:size-5 text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        >
                            <X className="size-3" />
                        </button>
                    </span>
                );
            })}
            {ids.length > cap ? (
                <button type="button" className="text-muted-foreground underline-offset-2 hover:underline" onClick={() => setExpanded(true)}>{choice("schemastud-frame::messages.picker.more", ids.length - cap, { count: fmt(ids.length - cap) })}</button>
            ) : null}
        </div>
    );
}

/** Must render INSIDE a PickerScope: it reads the picker's own URL state through facets. */
function BrowseBody(body: BodyProps) {
    const { props, select, selection, onChange, labels, manifest, noun, valueField, labelField } = body;
    const { t } = useFrameMessages();
    const nameHeader = t("schemastud-frame::messages.picker.name_header");
    const columns = useMemo(
        () => pickColumns(manifest, labelField, select, props.columns, nameHeader),
        [manifest, labelField, select, props.columns, nameHeader],
    );
    const shellManifest = useMemo(() => pickerManifest(manifest), [manifest]);
    // The list's behaviour, from the same options the ListShell below renders: one request (the selected
    // collection, the filters, the page), so the count and the serialized set describe exactly the rows on screen.
    const list = useListShellOf({ resource: props.resource, manifest: shellManifest, columns });
    const pick = useListSelectionOf(list, { value: selection, onChange, select, idField: valueField });
    const rows = list.rows as Row[];
    rows.forEach((r) => labels.set(idOf(r, valueField), String(r[labelField] ?? idOf(r, valueField))));

    useEffect(() => {
        body.onCount?.(pick.count);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [pick.count]);

    const onToggle = useCallback(
        (row: Row) => {
            if (props.disabled) return;
            const id = idOf(row, valueField);
            labels.set(id, String(row[labelField] ?? id));
            pick.toggle(row);
        },
        [props.disabled, valueField, labelField, labels, pick],
    );
    const onPage = useCallback(
        (_pageRows: Row[], picked: boolean) => {
            if (props.disabled) return;
            pick.setPage(picked);
        },
        [props.disabled, pick],
    );
    const describeFilter = describeFilters(list.filters.filterValues, list.filters.schema);

    const ctx: PickContextValue = {
        select,
        selection,
        valueField,
        labelField,
        onToggle,
        onPage,
        rows,
        noun,
        disabled: props.disabled,
    };
    return (
        <PickContext.Provider value={ctx}>
            <div className="min-w-0 space-y-3" data-resource-picker-browse="">
                <SelectionBar
                    select={select}
                    selection={selection}
                    onChange={onChange}
                    noun={noun}
                    total={list.total}
                    count={pick.count}
                    exact={pick.exact}
                    canSelectAllMatching={pick.canSelectAllMatching}
                    onSelectAllMatching={pick.selectAllMatching}
                    isLoading={list.status === 'loading'}
                    isError={list.status === 'error'}
                    retry={list.retry}
                    describeFilter={describeFilter}
                    disabled={props.disabled}
                    allowSet={select === 'set' || props.allowSet !== false}
                />
                <Tray selection={selection} onChange={onChange} labels={labels} select={select} noun={noun} disabled={props.disabled} />
                <UntypedListShell resource={props.resource} manifest={shellManifest} columns={columns} paginationPlacement="bottom" />
            </div>
        </PickContext.Provider>
    );
}

function describeFilters(values: Record<string, string>, schema: ReturnType<typeof useListFilters>['schema']): string {
    const props = Object.values(schema?.properties ?? {});
    return Object.entries(values)
        .filter(([, v]) => v)
        .map(([name, v]) => {
            const prop = props.find((p) => p['x-filter']?.name === name);
            const title = prop?.title ?? name;
            const options = prop?.['x-filter']?.options;
            const shown = options
                ? v
                      .split(',')
                      .map((x) => options.find((o) => String(o.value) === x)?.label ?? x)
                      .join(', ')
                : `“${v}”`;
            return `${title}: ${shown}`;
        })
        .join(' · ');
}

/** ONE verb on every confirm (bar and sheet): "Use N things", "(all matching)" for a set, "Save dynamic set". */
function confirmText(selection: ResourceSelection, select: ResourceSelectMode, noun: [string, string], count: number | null, messages: ReturnType<typeof useFrameMessages>, label?: string): string {
    if (label) return label;
    if (selection.mode === 'set') {
        if (select === 'set') return messages.t("schemastud-frame::messages.save_dynamic_set");
        return count === null ? messages.t("schemastud-frame::messages.use_all_matching", { resources: noun[1] }) : messages.choice("schemastud-frame::messages.use_count_matching", count, { shown: messages.number(count), one: noun[0], many: noun[1] });
    }
    const n = selection.ids.length;
    return messages.choice("schemastud-frame::messages.use_count", n, { shown: messages.number(n), one: noun[0], many: noun[1] });
}

/* ─────────────────────────────── typeahead (compact) ─────────────────────────────── */

function useDebounced<T>(value: T, ms = 160): T {
    const [v, setV] = useState(value);
    useEffect(() => {
        const t = setTimeout(() => setV(value), ms);
        return () => clearTimeout(t);
    }, [value, ms]);
    return v;
}

/**
 * The server search. Reads through `transport.list` directly — not a react-query hook — so a form
 * field works wherever a FrameProvider is, with or without a QueryClient.
 */
function useTypeahead(resource: string, params: Record<string, string>) {
    const { transport } = useFrameInjection();
    const key = JSON.stringify(params);
    const [state, setState] = useState<{ rows: Row[]; total: number | null; loading: boolean; error: boolean; key: string }>(
        { rows: [], total: null, loading: true, error: false, key: '' },
    );
    const [attempt, setAttempt] = useState(0);
    useEffect(() => {
        let cancelled = false;
        setState((s) => ({ ...s, loading: true, error: false }));
        transport
            .list(resource, params)
            .then((page) => {
                if (cancelled) return;
                const rows = (page?.data ?? []) as Row[];
                setState({ rows, total: page && 'total' in page ? page.total : null, loading: false, error: false, key });
            })
            .catch(() => {
                if (!cancelled) setState((s) => ({ ...s, loading: false, error: true }));
            });
        return () => {
            cancelled = true;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [transport, resource, key, attempt]);
    return { ...state, retry: () => setAttempt((a) => a + 1) };
}

function TypeaheadResults({
    body,
    onBrowse,
    onPicked,
    autoFocus,
}: {
    body: BodyProps;
    onBrowse: () => void;
    onPicked: () => void;
    autoFocus?: boolean;
}) {
    const messages = useFrameMessages();
    const { t, number: fmt, choice } = messages;
    const { props, select, selection, onChange, labels, noun, valueField, labelField } = body;
    const [q, setQ] = useState('');
    const dq = useDebounced(q.trim());
    const searchFacet = props.searchFacet ?? 'keywords';
    const perPage = props.perPage ?? 8;
    const params = useMemo(
        () => ({
            ...(props.scope ?? {}),
            ...(dq ? { [`filter[${searchFacet}]`]: dq } : {}),
            ...(props.defaultSort ? { sort: props.defaultSort } : {}),
            per_page: String(perPage),
        }),
        [dq, searchFacet, perPage, props.scope, props.defaultSort],
    );
    const res = useTypeahead(props.resource, params);
    const [active, setActive] = useState(0);
    const listId = useId();
    useEffect(() => setActive(0), [dq]);
    res.rows.forEach((r) => labels.set(idOf(r, valueField), String(r[labelField] ?? idOf(r, valueField))));

    const choose = (row: Row) => {
        if (props.disabled) return;
        const id = idOf(row, valueField);
        labels.set(id, String(row[labelField] ?? id));
        onChange(togglePick(selection, id, select));
        if (select === 'single') onPicked();
    };
    const total = res.total;
    const optionId = (row: Row) => `${listId}-${idOf(row, valueField).replace(/[^\w-]/g, '_')}`;

    return (
        <div className="flex min-h-0 flex-1 flex-col">
            <div className="flex items-center gap-2 border-b border-border px-3">
                {res.loading ? (
                    <Loader2 aria-hidden className="size-4 shrink-0 animate-spin text-muted-foreground" />
                ) : (
                    <Search aria-hidden className="size-4 shrink-0 text-muted-foreground" />
                )}
                <input
                    type="search"
                    autoFocus={autoFocus}
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === 'ArrowDown') {
                            e.preventDefault();
                            setActive((a) => Math.min(a + 1, res.rows.length - 1));
                        } else if (e.key === 'ArrowUp') {
                            e.preventDefault();
                            setActive((a) => Math.max(a - 1, 0));
                        } else if (e.key === 'Enter' && res.rows[active]) {
                            e.preventDefault();
                            choose(res.rows[active]);
                        }
                    }}
                    role="combobox"
                    aria-label={t("schemastud-frame::messages.picker.search_aria", { resources: noun[1] })}
                    aria-expanded
                    aria-controls={listId}
                    aria-autocomplete="list"
                    aria-activedescendant={res.rows[active] ? optionId(res.rows[active]) : undefined}
                    placeholder={total !== null && !dq ? choice("schemastud-frame::messages.picker.search_count", total, { count: fmt(total), resources: noun[1] }) : t("schemastud-frame::messages.picker.search", { resources: noun[1] })}
                    className="h-10 w-full min-w-0 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                />
            </div>
            <ul
                id={listId}
                role="listbox"
                aria-label={noun[1]}
                aria-multiselectable={select !== 'single'}
                aria-busy={res.loading || undefined}
                className="max-h-72 min-h-0 flex-1 overflow-y-auto overscroll-contain p-1 max-sm:max-h-none"
            >
                {res.error ? (
                    <li role="presentation" className="flex items-center justify-between gap-2 px-2 py-4 text-sm">
                        {t("schemastud-frame::messages.search_failed")}<Button type="button" variant="outline" size="sm" onClick={res.retry}>{t("schemastud-frame::messages.try_again")}</Button>
                    </li>
                ) : res.rows.length === 0 && !res.loading ? (
                    <li role="presentation" className="px-2 py-6 text-center text-sm text-muted-foreground">
                        {dq ? t("schemastud-frame::messages.no_resources_match_dq_try_fewer_words_or_browse_with_filters", { resources: noun[1], dq: dq }) : t("schemastud-frame::messages.no_resources_yet", { resources: noun[1] })}
                    </li>
                ) : (
                    res.rows.map((row, i) => {
                        const id = idOf(row, valueField);
                        const on = isPicked(selection, id);
                        const second = props.describe?.(row);
                        return (
                            <li
                                key={id}
                                id={optionId(row)}
                                role="option"
                                aria-selected={on}
                                onMouseEnter={() => setActive(i)}
                                onClick={() => choose(row)}
                                className={cn(
                                    'flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm',
                                    i === active && 'bg-muted',
                                    on && 'font-medium',
                                )}
                            >
                                <span className="min-w-0 flex-1">
                                    <span className="block truncate">{String(row[labelField] ?? id)}</span>
                                    {second ? <span className="block truncate text-xs text-muted-foreground">{second}</span> : null}
                                </span>
                                <Check aria-hidden className={cn('size-4 shrink-0 text-primary', on ? 'opacity-100' : 'opacity-0')} />
                            </li>
                        );
                    })
                )}
            </ul>
            <div className="flex flex-wrap items-center gap-2 border-t border-border px-3 py-2 text-xs text-muted-foreground">
                <span className="tabular-nums" aria-live="polite">
                    {choice(total === null
                        ? (dq ? "schemastud-frame::messages.picker.results_unknown_matching" : "schemastud-frame::messages.picker.results_unknown_shown")
                        : total > res.rows.length
                          ? (dq ? "schemastud-frame::messages.picker.results_partial_matching" : "schemastud-frame::messages.picker.results_partial_shown")
                          : (dq ? "schemastud-frame::messages.picker.results_matching" : "schemastud-frame::messages.picker.results_shown"),
                        total === null || total > res.rows.length ? res.rows.length : total,
                        { count: fmt(total === null || total > res.rows.length ? res.rows.length : total), total: total === null ? '' : fmt(total) })}
                </span>
                <Button type="button" variant="ghost" size="sm" className="ml-auto gap-1.5" onClick={onBrowse}>
                    <ListFilter aria-hidden className="size-3.5" />
                    {total === null ? t("schemastud-frame::messages.picker.browse") : choice("schemastud-frame::messages.picker.browse_count", total, { count: fmt(total) })}</Button>
            </div>
        </div>
    );
}

/** The compact escape hatch: the browse body in a Sheet, editing a DRAFT the confirm commits. */
function BrowseSheet({ body, open, onOpenChange }: { body: BodyProps; open: boolean; onOpenChange: (open: boolean) => void }) {
    const messages = useFrameMessages();
    const { t } = messages;
    const [draft, setDraft] = useState(body.selection);
    useEffect(() => {
        if (open) setDraft(body.selection);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open]);
    const contentRef = useRef<HTMLDivElement>(null);
    const [count, setCount] = useState<number | null>(null);
    const { noun, select } = body;
    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent
                side="right"
                className="flex w-full flex-col gap-0 p-0 sm:max-w-3xl"
                onOpenAutoFocus={(e: Event) => {
                    // Land on the list's own search, never on the first button.
                    e.preventDefault();
                    const focus = () =>
                        contentRef.current?.querySelector<HTMLInputElement>('[data-resource-picker-browse] input')?.focus();
                    setTimeout(focus, 120);
                }}
            >
                <SheetHeader className="border-b border-border px-4 py-3 sm:px-6">
                    <SheetTitle>{select === 'single' ? t("schemastud-frame::messages.picker.choose_title", { resource: noun[0] }) : t("schemastud-frame::messages.choose_resources", { resources: noun[1] })}</SheetTitle>
                    <SheetDescription>{t("schemastud-frame::messages.filter_and_sort_with_the_resources_list_s_own_columns_and_facets", { resources: noun[1] })}</SheetDescription>
                </SheetHeader>
                <div ref={contentRef} className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-6">
                    <PickerScope initialSearch={selectionToSearch(draft)} fixed={body.props.scope}>
                        <BrowseBody {...body} selection={draft} onChange={setDraft} onCount={setCount} />
                    </PickerScope>
                </div>
                <SheetFooter className="flex-row justify-end gap-2 border-t border-border px-4 py-3 sm:px-6">
                    <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>{t("schemastud-frame::messages.cancel")}</Button>
                    <Button
                        type="button"
                        onClick={() => {
                            body.onChange(draft);
                            onOpenChange(false);
                        }}
                    >
                        {confirmText(draft, select, noun, count, messages)}
                    </Button>
                </SheetFooter>
            </SheetContent>
        </Sheet>
    );
}

/**
 * Labels for picks the picker has not seen yet (an edit form's stored value): fetched by id, for
 * the first few only, and only when the pick key IS the id — a `slug` key has no get-by-key.
 */
function useWarmLabels(resource: string, ids: string[], valueField: string, labelField: string, labels: Map<string, string>) {
    const { transport } = useFrameInjection();
    const [, force] = useState(0);
    const missing = valueField === 'id' ? ids.filter((id) => !labels.has(id)).slice(0, 8) : [];
    const key = missing.join(',');
    useEffect(() => {
        if (missing.length === 0) return;
        let cancelled = false;
        Promise.all(
            missing.map((id) =>
                transport
                    .get(resource, id)
                    .then((row) => {
                        if (row && row[labelField] != null) labels.set(id, String(row[labelField]));
                    })
                    .catch(() => undefined),
            ),
        ).then(() => {
            if (!cancelled) force((n) => n + 1);
        });
        return () => {
            cancelled = true;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [transport, resource, key, labelField]);
}

function CompactPicker(body: BodyProps) {
    const messages = useFrameMessages();
    const { t, number: fmt, choice } = messages;
    const { props, select, selection, onChange, labels, noun } = body;
    const isMobile = useIsMobile();
    const [open, setOpen] = useState(Boolean(props.defaultOpen));
    const [browse, setBrowse] = useState(Boolean(props.defaultBrowseOpen));
    useWarmLabels(props.resource, selection.mode === 'ids' ? selection.ids : [], body.valueField, body.labelField, labels);

    const n = selection.mode === 'ids' ? selection.ids.length : null;
    const summary =
        selection.mode === 'set'
            ? selection.exclude.length ? choice("schemastud-frame::messages.picker.set_summary_except", selection.exclude.length, { resource: noun[0], excluded: fmt(selection.exclude.length) }) : t("schemastud-frame::messages.picker.set_summary", { resource: noun[0] })
            : n === 0
              ? null
              : n === 1
                ? (labels.get(selection.ids[0]) ?? selection.ids[0])
                : choice("schemastud-frame::messages.picker.summary_count", n!, { count: fmt(n!), one: noun[0], many: noun[1] });
    const placeholder =
        select === 'set' ? t("schemastud-frame::messages.define_a_set_of_resources", { resources: noun[1] }) : select === 'single' ? t("schemastud-frame::messages.picker.choose_placeholder", { resource: noun[0] }) : t("schemastud-frame::messages.add_resources", { resources: noun[1] });
    const openBrowse = () => {
        setOpen(false);
        setBrowse(true);
    };
    // Named by the field's label AND its own value, so a reader hears "Thread, Choose a thread…" /
    // "Thread, Refund request #0003" — labelling by the field alone would hide what is picked.
    const valueId = useId();
    const trigger = (
        <Button
            id={props.id}
            type="button"
            variant="outline"
            disabled={props.disabled}
            aria-labelledby={props['aria-labelledby'] ? `${props['aria-labelledby']} ${valueId}` : undefined}
            aria-haspopup="dialog"
            className="w-full min-w-0 justify-between font-normal sm:w-80"
            onClick={select === 'set' ? () => setBrowse(true) : isMobile ? () => setOpen(true) : undefined}
        >
            <span id={valueId} className={cn('min-w-0 truncate', !summary && 'text-muted-foreground')}>
                {summary ?? placeholder}
            </span>
            <ChevronsUpDown aria-hidden className="size-4 shrink-0 text-muted-foreground" />
        </Button>
    );

    return (
        <div className="min-w-0 space-y-2" data-resource-picker="records" data-density="compact">
            {select === 'set' ? (
                trigger
            ) : isMobile ? (
                // Phone: a popover under the trigger fits ~3 results and pushes "Browse all" off-screen.
                <>
                    {trigger}
                    <Sheet open={open} onOpenChange={setOpen}>
                        <SheetContent side="bottom" className="flex h-[85dvh] flex-col gap-0 rounded-t-xl p-0">
                            <SheetHeader className="border-b border-border px-4 py-3">
                                <SheetTitle>{select === 'single' ? t("schemastud-frame::messages.picker.choose_title", { resource: noun[0] }) : t("schemastud-frame::messages.picker.add_title", { resources: noun[1] })}</SheetTitle>
                                <SheetDescription className="sr-only">{t("schemastud-frame::messages.search_resources_or_browse_all_with_filters", { resources: noun[1] })}</SheetDescription>
                            </SheetHeader>
                            <TypeaheadResults body={body} onPicked={() => setOpen(false)} onBrowse={openBrowse} />
                        </SheetContent>
                    </Sheet>
                </>
            ) : (
                <Popover open={open} onOpenChange={setOpen}>
                    <PopoverTrigger asChild>{trigger}</PopoverTrigger>
                    <PopoverContent className="w-[min(26rem,calc(100vw-2rem))] p-0">
                        <TypeaheadResults body={body} onPicked={() => setOpen(false)} onBrowse={openBrowse} autoFocus />
                    </PopoverContent>
                </Popover>
            )}
            {select !== 'single' && selection.mode === 'ids' && selection.ids.length > 0 ? (
                <Tray selection={selection} onChange={onChange} labels={labels} select={select} noun={noun} disabled={props.disabled} />
            ) : null}
            <BrowseSheet body={body} open={browse} onOpenChange={setBrowse} />
        </div>
    );
}

function ExpandedPicker(body: BodyProps) {
    const messages = useFrameMessages();
    const { t } = messages;
    const { props, select, selection, noun } = body;
    const initial = useMemo(
        () => selectionToSearch(selection),
        // Seeded once: afterwards the picker's own facets are the source of truth.
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [],
    );
    const empty = isEmptySelection(selection);
    const [count, setCount] = useState<number | null>(null);
    return (
        <div className="min-w-0 space-y-3" data-resource-picker="records" data-density="expanded" id={props.id}>
            <PickerScope initialSearch={initial} fixed={props.scope}>
                <BrowseBody {...body} onCount={setCount} />
            </PickerScope>
            {props.onConfirm ? (
                <div className="sticky bottom-0 z-10 flex flex-wrap items-center justify-end gap-2 border-t border-border bg-background/95 py-3 backdrop-blur supports-[backdrop-filter]:bg-background/80">
                    <span className="mr-auto hidden text-xs text-muted-foreground sm:inline">{t("schemastud-frame::messages.picks_are_kept_across_pages_filters_and_sorts")}</span>
                    <Button type="button" disabled={empty || props.disabled} onClick={() => props.onConfirm?.(selection)}>
                        {confirmText(selection, select, noun, count, messages, props.confirmLabel)}
                    </Button>
                </div>
            ) : null}
        </div>
    );
}

/** Stage 2: pick records of one resource kind. */
export function ResourceRecordPicker(props: ResourceRecordPickerProps) {
    const injection = useFrameInjection();
    const resolved = resolveRecordPlacement(props.placement, {
        ...(props.density ? { density: props.density } : {}),
        ...(props.select ? { select: props.select } : {}),
    });
    const manifest = props.manifest ?? injection.manifestFor?.(props.resource);
    const noun = nounFor(props, manifest);
    const [labels] = useState(() => new Map<string, string>());
    // A `set` picker starts as a set: "every record", until the facets narrow it.
    const selection: ResourceSelection =
        resolved.select === 'set' && props.value.mode === 'ids' ? selectAllMatching({}, null) : props.value;
    const body: BodyProps = {
        props,
        select: resolved.select,
        selection,
        onChange: props.onChange,
        labels,
        manifest,
        noun,
        valueField: props.valueField ?? 'id',
        labelField: props.labelField ?? 'name',
    };
    return resolved.density === 'expanded' ? <ExpandedPicker {...body} /> : <CompactPicker {...body} />;
}

