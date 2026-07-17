import { ArrowDownAZ, ArrowUpAZ, ListFilter, Plus, Search, X } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useFacetsInjection } from './context';
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

/** A short, human summary of a facet's current value for the chip label. */
function chipSummary(value: string, labels: Record<string, string>): string {
    const parts = value.split(',').filter(Boolean);
    if (parts.length === 0) return '';
    if (parts.length === 1) return labels[parts[0]] ?? parts[0];
    return `${parts.length} selected`;
}

/**
 * The single control a facet renders inside its popover — the same per-kind control
 * mapping the old always-expanded FilterPanel used, one facet at a time.
 */
function FacetControl({
    descriptor,
    value,
    onChange,
    onLabelsResolved,
}: {
    descriptor: FilterDescriptor;
    value: string;
    onChange: (value: string | null) => void;
    onLabelsResolved?: (labels: Record<string, string>) => void;
}) {
    const { Input } = useFacetsInjection().primitives;
    if (descriptor.control === 'multiselect' || descriptor.control === 'select') {
        return (
            <MultiSelectFilter
                descriptor={descriptor}
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
            placeholder={descriptor.control === 'search' ? 'Search…' : 'Value…'}
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
    schema,
    values,
    sort,
    onFilterChange,
    onSortChange,
}: {
    schema: FilterSchema;
    values: Record<string, string>;
    sort: string | null;
    onFilterChange: (name: string, value: string | null) => void;
    onSortChange: (value: string | null) => void;
}) {
    const { Button, Input, Label, Popover, PopoverContent, PopoverTrigger, SimpleSelect } =
        useFacetsInjection().primitives;
    const [openChip, setOpenChip] = useState<string | null>(null);
    const [addOpen, setAddOpen] = useState(false);
    // value→label cache so option-backed chips read as names, not ids. Populated as the
    // per-facet controls resolve their Options Source rows.
    const [labelCache, setLabelCache] = useState<Record<string, string>>({});
    const mergeLabels = useCallback((labels: Record<string, string>) => {
        setLabelCache((prev) => {
            let changed = false;
            for (const [k, v] of Object.entries(labels)) {
                if (prev[k] !== v) changed = true;
            }
            return changed ? { ...prev, ...labels } : prev;
        });
    }, []);

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
    const activeFacets = chipFacets.filter(isActive);
    const inactiveFacets = chipFacets.filter((f) => !isActive(f));

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
        <div className="flex flex-wrap items-center gap-2 rounded-md border bg-card p-2">
            {/* Warm chip labels for active option-backed facets (deep-link / refresh). */}
            {activeFacets
                .filter((f) => f.descriptor.optionsRef)
                .map((f) => (
                    <LabelWarmer
                        key={`warm-${f.key}`}
                        optionsRef={f.descriptor.optionsRef!}
                        onLabelsResolved={mergeLabels}
                    />
                ))}

            {/* Leading search input */}
            {searchFacet && (
                <div className="relative">
                    <Search className="pointer-events-none absolute top-1/2 left-3 size-3.5 -translate-y-1/2 text-muted-foreground" />
                    <Input
                        className="h-8 w-56 !pl-9"
                        value={values[searchFacet.descriptor.name] ?? ''}
                        placeholder="Search…"
                        aria-label="Search"
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                            onFilterChange(searchFacet.descriptor.name, e.target.value || null)
                        }
                    />
                </div>
            )}

            {/* Active-filter chips */}
            {activeFacets.map((facet) => {
                const value = values[facet.descriptor.name] ?? '';
                return (
                    <Popover
                        key={facet.key}
                        open={openChip === facet.key}
                        onOpenChange={(open: boolean) => setOpenChip(open ? facet.key : null)}
                    >
                        <div className="inline-flex items-center overflow-hidden rounded-full border bg-secondary text-xs">
                            <PopoverTrigger asChild>
                                <button
                                    type="button"
                                    className="flex items-center gap-1 py-1 pr-1.5 pl-2.5 font-medium hover:bg-accent"
                                >
                                    <span className="text-muted-foreground">{facet.label}:</span>
                                    <span>{chipSummary(value, labelCache) || '…'}</span>
                                </button>
                            </PopoverTrigger>
                            <button
                                type="button"
                                aria-label={`Clear ${facet.label}`}
                                className="flex h-full items-center px-1.5 text-muted-foreground hover:bg-accent hover:text-destructive"
                                onClick={() => onFilterChange(facet.descriptor.name, null)}
                            >
                                <X className="size-3" />
                            </button>
                        </div>
                        <PopoverContent>
                            <Label className="mb-1.5 block">{facet.label}</Label>
                            <FacetControl
                                descriptor={facet.descriptor}
                                value={value}
                                onChange={(v) => onFilterChange(facet.descriptor.name, v)}
                                onLabelsResolved={mergeLabels}
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
                            <Plus className="size-3.5" /> Filter
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

            {/* Newly-added facet that has no value yet: render its editing popover inline */}
            {openChip &&
                !activeFacets.some((f) => f.key === openChip) &&
                (() => {
                    const facet = chipFacets.find((f) => f.key === openChip);
                    if (!facet) return null;
                    return (
                        <Popover
                            key={`new-${facet.key}`}
                            open
                            onOpenChange={(open: boolean) => !open && setOpenChip(null)}
                        >
                            <div className="inline-flex items-center rounded-full border border-dashed bg-secondary/60 py-1 pr-2 pl-2.5 text-xs">
                                <PopoverTrigger asChild>
                                    <button type="button" className="font-medium">
                                        {facet.label}: <span className="text-muted-foreground">…</span>
                                    </button>
                                </PopoverTrigger>
                            </div>
                            <PopoverContent>
                                <Label className="mb-1.5 block">{facet.label}</Label>
                                <FacetControl
                                    descriptor={facet.descriptor}
                                    value=""
                                    onChange={(v) => {
                                        onFilterChange(facet.descriptor.name, v);
                                        if (v) setOpenChip(null);
                                    }}
                                    onLabelsResolved={mergeLabels}
                                />
                            </PopoverContent>
                        </Popover>
                    );
                })()}

            <div className="ml-auto flex items-center gap-1.5">
                {/* Sort control */}
                {sorts.length > 0 && (
                    <>
                        <SimpleSelect
                            className="h-8 w-40"
                            aria-label="Sort by"
                            value={sortField}
                            onValueChange={(field: string) =>
                                field ? setPrimarySort(field, sortDesc) : clearPrimarySort()
                            }
                            placeholder="Sort by…"
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
                                aria-label={sortDesc ? 'Descending' : 'Ascending'}
                                onClick={() => setPrimarySort(sortField, !sortDesc)}
                            >
                                {sortDesc ? <ArrowDownAZ /> : <ArrowUpAZ />}
                            </Button>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}
