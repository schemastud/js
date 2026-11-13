import { useFacetsMessages } from './messages';
import { ArrowDownAZ, ArrowUpAZ, ListFilter, Plus, Search, X } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FacetsResourceProvider, useFacetsInjection } from './context';
import { useFilterOptions } from './data';
import { MultiSelectFilter } from './MultiSelectFilter';
import { parseSort, serializeSort } from './sort';
import type { FilterDescriptor, FilterSchema } from './types';

function humanize(key: string): string {
    return key
        // Drop a trailing relation-id suffix on a longer key (`assistantId` → `assistant`,
        // `circuit_id` → `circuit`) so labels read as the relation, not the column. Only a
        // camelCase `Id` or a `_id`/`-id` separator counts — a word merely ending in "id"
        // (e.g. `valid`) and a bare `id` are left alone.
        .replace(/(?:(.)Id|[_-]id)$/, '$1')
        .replace(/([a-z])([A-Z])/g, '$1 $2')
        .replace(/[_:]/g, ' ')
        .replace(/^\w/, (c) => c.toUpperCase());
}

interface Facet {
    key: string;
    label: string;
    descriptor: FilterDescriptor;
}

/**
 * Warms the value→label cache for an active option-backed facet on mount, so its chip
 * reads as a name straight after a refresh/deep-link — before the user ever opens the
 * popover. Renders nothing.
 */
function LabelWarmer({
    optionsRef,
    onLabelsResolved,
}: {
    optionsRef: string;
    onLabelsResolved: (labels: Record<string, string>) => void;
}) {
    const options = useFilterOptions(optionsRef, '');
    const optionsData = options.data;
    useEffect(() => {
        if ((optionsData?.length ?? 0) > 0) {
            const map: Record<string, string> = {};
            for (const o of optionsData!) map[o.value] = o.label;
            onLabelsResolved(map);
        }
    }, [optionsData, onLabelsResolved]);
    return null;
}

/**
 * What a facet's chip says about its current value:
 * - `text`: the summary after the facet label (`Label: summary`);
 * - `neutral`: the facet label alone, with no value text;
 * - `none`: no chip at all.
 */
type ChipSummary = { kind: 'text'; text: string } | { kind: 'neutral' } | { kind: 'none' };

/**
 * A short, human summary of a facet's current value for the chip label. A free-text facet shows what was typed. An
 * option-backed facet never shows a raw URL value (frame-foundation 60): only values that match an option count; one
 * match shows its label, several show "N selected". A value that matches no option draws no chip for INLINE options (a
 * complete, finite domain, so the value is unknown), and a NEUTRAL chip for an `optionsRef` facet, whose domain the
 * Options Source does not promise complete (a capped list may omit a valid applied value, which must stay visible and
 * clearable). The x-filter descriptor names no default option, so there is no default chip to fall back to.
 */
function chipSummary(value: string, descriptor: FilterDescriptor, labels: ReadonlyMap<string, string>, selected: (count: number) => string): ChipSummary {
    const parts = value.split(',').filter(Boolean);
    if (parts.length === 0) return { kind: 'text', text: '…' };
    const optionBacked = descriptor.options !== undefined || descriptor.optionsRef !== undefined;
    if (!optionBacked) return { kind: 'text', text: parts.length === 1 ? parts[0] : selected(parts.length) };
    // Membership by the facet's own options only: a Map, so an inherited Object key (`toString`) is never an option.
    const matched = parts.filter((part) => labels.has(part));
    if (matched.length === 1) return { kind: 'text', text: labels.get(matched[0])! };
    if (matched.length > 1) return { kind: 'text', text: selected(matched.length) };
    return descriptor.options !== undefined ? { kind: 'none' } : { kind: 'neutral' };
}

/**
 * The single control a facet renders inside its popover — the same per-kind control
 * mapping the old always-expanded FilterPanel used, one facet at a time.
 */
function FacetControl({
    descriptor,
    label,
    value,
    onChange,
    onLabelsResolved,
}: {
    descriptor: FilterDescriptor;
    label?: string;
    value: string;
    onChange: (value: string | null) => void;
    onLabelsResolved?: (labels: Record<string, string>) => void;
}) {
    const messages = useFacetsMessages();
    const { Input } = useFacetsInjection().primitives;
    if (descriptor.control === 'multiselect' || descriptor.control === 'select') {
        return (
            <MultiSelectFilter
                descriptor={descriptor}
                label={label}
                value={value}
                onChange={onChange}
                onLabelsResolved={onLabelsResolved}
            />
        );
    }
    return (
        <Input
            autoFocus
            value={value}
            placeholder={descriptor.control === 'search' ? messages.t('schemastud-facets::messages.search_placeholder') : messages.t('schemastud-facets::messages.value_placeholder')}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange(e.target.value || null)}
        />
    );
}

/**
 * The facets bar: a compact, inline chip bar over the same `x-filter`/`x-sort` schema
 * the old FilterPanel consumed — but nothing is expanded until a chip is clicked. It
 * carries a Search input, one chip per active filter (click to edit in a scoped
 * popover, ✕ to clear), a `+ Filter ▾` affordance to add a facet, and a Sort control.
 * State stays bidirectional with the `filter[...]`/`sort` query string — the caller
 * owns URL serialization. Renders through host-injected primitives (SimpleSelect /
 * hand-rolled anchored panels), never a native `<select>`.
 */
export function FacetsBar({
    resource,
    collection,
    schema,
    values,
    sort,
    onFilterChange,
    onSortChange,
}: {
    /**
     * The resource key this bar filters. Required since the filter endpoints became per-resource
     * (splicewire api-surface-coherence 35) — the options lookup a facet performs now needs a
     * resource to address, and to be authorized against. Provided to the leaves through
     * `FacetsResourceProvider` rather than threaded as a prop through the chip-rendering tree.
     */
    resource: string;
    collection?: string;
    schema: FilterSchema;
    values: Record<string, string>;
    sort: string | null;
    onFilterChange: (name: string, value: string | null) => void;
    onSortChange: (value: string | null) => void;
}) {
    const messages = useFacetsMessages();
    const { Button, Input, Label, Popover, PopoverContent, PopoverTrigger, SimpleSelect } =
        useFacetsInjection().primitives;
    const [openChip, setOpenChip] = useState<string | null>(null);
    const [addOpen, setAddOpen] = useState(false);
    // value→label cache so option-backed chips read as names, not ids, kept PER Options Source (keyed by `optionsRef`):
    // a value matches only its own source's options, never a label another facet's source happened to resolve
    // (frame-foundation 60, build-qa). Populated as the per-facet controls resolve their Options Source rows.
    const [labelCache, setLabelCache] = useState<ReadonlyMap<string, ReadonlyMap<string, string>>>(() => new Map());
    const mergeLabels = useCallback((source: string, labels: Record<string, string>) => {
        setLabelCache((prev) => {
            const current = prev.get(source);
            const entries = Object.entries(labels);
            if (entries.every(([k, v]) => current?.get(k) === v)) return prev;
            const next = new Map(prev);
            next.set(source, new Map([...(current ?? []), ...entries]));
            return next;
        });
    }, []);
    // One stable callback per source, so a control's effects keyed on it do not re-run every render.
    const sourceMergers = useRef(new Map<string, (labels: Record<string, string>) => void>());
    const mergeLabelsFor = useCallback(
        (source: string) => {
            let merge = sourceMergers.current.get(source);
            if (!merge) {
                merge = (labels: Record<string, string>) => mergeLabels(source, labels);
                sourceMergers.current.set(source, merge);
            }
            return merge;
        },
        [mergeLabels],
    );

    const properties = Object.entries(schema.properties ?? {});

    const allFacets = useMemo<Facet[]>(
        () =>
            properties
                .filter(([, prop]) => prop['x-filter'])
                .map(([key, prop]) => ({
                    key,
                    label: prop.title ?? humanize(key),
                    descriptor: prop['x-filter']!,
                })),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [schema],
    );

    // The dedicated Search facet (a `search`-control filter) always renders as the
    // bar's leading input, never as a chip.
    const searchFacet = allFacets.find((f) => f.descriptor.control === 'search');
    const chipFacets = allFacets.filter((f) => f !== searchFacet);

    const isActive = (facet: Facet) => Boolean(values[facet.descriptor.name]);
    const summaryOf = (facet: Facet): ChipSummary =>
        chipSummary(
            values[facet.descriptor.name] ?? '',
            facet.descriptor,
            facet.descriptor.options !== undefined
                ? new Map(facet.descriptor.options.map((option) => [String(option.value), option.label]))
                : (facet.descriptor.optionsRef !== undefined ? labelCache.get(facet.descriptor.optionsRef) : undefined) ?? new Map(),
            (count) => messages.choice('schemastud-facets::messages.selected', count, { shownCount: messages.number(count) }),
        );
    // An active inline-options facet whose value matches no option draws no chip; it is offered from `+ Filter` again.
    const isShown = (facet: Facet) => isActive(facet) && summaryOf(facet).kind !== 'none';
    const activeFacets = chipFacets.filter(isActive);
    const inactiveFacets = chipFacets.filter((f) => !isShown(f));

    const sorts = properties.filter(([, prop]) => prop['x-sort']);
    // The Sort control edits the *primary* key of the shared comma-joined `sort`
    // param, leaving any secondary keys a column header added in place — headers and
    // this menu are one state, not competing mechanisms.
    const sortKeys = parseSort(sort);
    const primary = sortKeys[0];
    const sortField = primary?.field ?? '';
    const sortDesc = Boolean(primary?.desc);

    const setPrimarySort = (field: string, desc: boolean) => {
        const rest = sortKeys.filter((k) => k.field !== field);
        onSortChange(serializeSort([{ field, desc }, ...rest]));
    };

    const clearPrimarySort = () => {
        onSortChange(serializeSort(sortKeys.filter((k) => k.field !== sortField)));
    };

    const addFacet = (facet: Facet) => {
        setAddOpen(false);
        // Seed a search/text facet with an empty string so the chip appears and opens
        // for input; option-backed facets stay unset until a value is chosen in the
        // popover.
        setOpenChip(facet.key);
    };

    return (
        <FacetsResourceProvider resource={resource} collection={collection}>
        <div className="flex flex-wrap items-center gap-2 rounded-md border bg-card p-2">
            {/* Warm chip labels for active option-backed facets (deep-link / refresh). */}
            {activeFacets
                .filter((f) => f.descriptor.optionsRef)
                .map((f) => (
                    <LabelWarmer
                        key={`warm-${f.key}`}
                        optionsRef={f.descriptor.optionsRef!}
                        onLabelsResolved={mergeLabelsFor(f.descriptor.optionsRef!)}
                    />
                ))}

            {/* Leading search input */}
            {searchFacet && (
                <div className="relative">
                    <Search className="pointer-events-none absolute top-1/2 left-3 size-3.5 -translate-y-1/2 text-muted-foreground" />
                    <Input
                        className="h-8 w-56 !pl-9"
                        value={values[searchFacet.descriptor.name] ?? ''}
                        placeholder={messages.t('schemastud-facets::messages.search_placeholder')}
                        aria-label={messages.t('schemastud-facets::messages.search')}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                            onFilterChange(searchFacet.descriptor.name, e.target.value || null)
                        }
                    />
                </div>
            )}

            {/* Filter chips: every active facet, and the one just added from `+ Filter` (no value yet). One keyed list,
                so a just-added facet's first value keeps the same popover and editor mounted: a multiselect stays open
                with its list and focus for the next pick (owner-review-20261112 06, D-07-b; build-qa REVISE). */}
            {chipFacets
                .filter((facet) => isShown(facet) || facet.key === openChip)
                .map((facet) => {
                    const value = values[facet.descriptor.name] ?? '';
                    const active = isActive(facet);
                    const summary = summaryOf(facet);
                    return (
                        <Popover
                            key={facet.key}
                            open={openChip === facet.key}
                            onOpenChange={(open: boolean) => setOpenChip(open ? facet.key : null)}
                        >
                            <div
                                className={
                                    active
                                        ? 'inline-flex items-center overflow-hidden rounded-full border bg-secondary text-xs'
                                        : 'inline-flex items-center overflow-hidden rounded-full border border-dashed bg-secondary/60 text-xs'
                                }
                            >
                                <PopoverTrigger asChild>
                                    <button
                                        type="button"
                                        className="flex items-center gap-1 py-1 pr-1.5 pl-2.5 font-medium hover:bg-accent"
                                    >
                                        {summary.kind === 'text' ? (
                                            <>
                                                <span className="text-muted-foreground">{facet.label}:</span>{' '}
                                                <span>{summary.text}</span>
                                            </>
                                        ) : (
                                            // Neutral: the facet label alone, never a value that matches no option.
                                            <span className="text-muted-foreground">{facet.label}</span>
                                        )}
                                    </button>
                                </PopoverTrigger>
                                {active && (
                                    <button
                                        type="button"
                                        aria-label={messages.t('schemastud-facets::messages.clear', { label: facet.label })}
                                        className="flex h-full items-center px-1.5 text-muted-foreground hover:bg-accent hover:text-destructive"
                                        onClick={() => onFilterChange(facet.descriptor.name, null)}
                                    >
                                        <X className="size-3" />
                                    </button>
                                )}
                            </div>
                            <PopoverContent>
                                <Label className="mb-1.5 block">{facet.label}</Label>
                                <FacetControl
                                    descriptor={facet.descriptor}
                                    label={facet.label}
                                    value={value}
                                    onChange={(v) => {
                                        onFilterChange(facet.descriptor.name, v);
                                        // A single-value relational pick replaces and closes; a multiselect and a text
                                        // facet stay open for the next pick or keystroke.
                                        if (!active && v && facet.descriptor.control === 'select') setOpenChip(null);
                                    }}
                                    onLabelsResolved={facet.descriptor.optionsRef ? mergeLabelsFor(facet.descriptor.optionsRef) : undefined}
                                />
                            </PopoverContent>
                        </Popover>
                    );
                })}

            {/* + Filter ▾ affordance — the resource's available (inactive) facets */}
            {inactiveFacets.length > 0 && (
                <Popover open={addOpen} onOpenChange={setAddOpen}>
                    <PopoverTrigger asChild>
                        <Button variant="outline" size="sm" className="h-8 gap-1 border-dashed">
                            <Plus className="size-3.5" /> {messages.t('schemastud-facets::messages.filter')}
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent>
                        <div className="flex flex-col gap-0.5">
                            {inactiveFacets.map((facet) => (
                                <button
                                    key={facet.key}
                                    type="button"
                                    className="flex items-center gap-2 rounded px-2 py-1.5 text-left text-sm hover:bg-accent"
                                    onClick={() => addFacet(facet)}
                                >
                                    <ListFilter className="size-3.5 text-muted-foreground" />
                                    {facet.label}
                                </button>
                            ))}
                        </div>
                    </PopoverContent>
                </Popover>
            )}

            <div className="ml-auto flex items-center gap-1.5">
                {/* Sort control */}
                {sorts.length > 0 && (
                    <>
                        <SimpleSelect
                            className="h-8 w-40"
                            aria-label={messages.t('schemastud-facets::messages.sort_by')}
                            value={sortField}
                            onValueChange={(field: string) =>
                                field ? setPrimarySort(field, sortDesc) : clearPrimarySort()
                            }
                            placeholder={messages.t('schemastud-facets::messages.sort_placeholder')}
                            options={sorts.map(([key, prop]) => ({
                                value: prop['x-sort']!.name,
                                label: humanize(key),
                            }))}
                        />
                        {sortField && (
                            <Button
                                variant="outline"
                                size="icon"
                                className="size-8"
                                aria-label={sortDesc ? messages.t('schemastud-facets::messages.descending') : messages.t('schemastud-facets::messages.ascending')}
                                onClick={() => setPrimarySort(sortField, !sortDesc)}
                            >
                                {sortDesc ? <ArrowDownAZ /> : <ArrowUpAZ />}
                            </Button>
                        )}
                    </>
                )}
            </div>
        </div>
        </FacetsResourceProvider>
    );
}
