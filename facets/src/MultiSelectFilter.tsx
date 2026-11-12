import { ComboboxList, type ComboboxOption } from '@schemastud/combobox';
import { X } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useFacetsInjection } from './context';
import { useFilterOptions, useFilterOptionsSearch } from './data';
import type { FilterDescriptor } from './types';

/**
 * A picker over declared inline options or an Options Source: the kit's `ComboboxList`
 * rendered inline (it sits inside the facets bar's popover, so it brings no popover of its
 * own), with removable chips for what is chosen. Relational options are searched on the
 * server once per typing pause; finite enum/bool options are searched locally. The list is
 * keyboard-driven (arrows, Enter, Escape) with listbox roles.
 *
 * Serves both cardinalities off the descriptor's `control`: `multiselect` toggles a value
 * in a comma-joined id set and stays open; `select` holds a single relational id
 * (replace-on-pick, closes the list after choosing) — e.g. "Produced By Circuit", which
 * filters Fragments to one circuit's lineage.
 *
 * A preselected value (from the URL) reads as its label once the source's first page
 * names it. An Options Source has no lookup by id, so a value outside that first page
 * shows its id until a search returns it.
 */
export function MultiSelectFilter({
    descriptor,
    label,
    value,
    onChange,
    onLabelsResolved,
}: {
    descriptor: FilterDescriptor;
    /** The facet's title, the picker's accessible name. Defaults to the filter's name. */
    label?: string;
    value: string;
    onChange: (value: string | null) => void;
    // Reports resolved value→label pairs upward so a host (e.g. the facets bar chip)
    // can render names instead of ids for values chosen here.
    onLabelsResolved?: (labels: Record<string, string>) => void;
}) {
    const { Badge, Input } = useFacetsInjection().primitives;
    const single = descriptor.control === 'select';
    const [open, setOpen] = useState(false);
    const selected = useMemo(() => (value ? value.split(',') : []), [value]);

    // URL state uses strings; enum/bool/number declarations retain their labels while
    // crossing that boundary. Keep the full inline set for initial and hidden chips.
    const inlineOptions = useMemo(
        () => descriptor.options?.map((option) => ({ value: String(option.value), label: option.label })),
        [descriptor.options],
    );
    const ref = inlineOptions === undefined ? descriptor.optionsRef : undefined;

    // Remember labels for values we've seen, so chips read as names not ids. Declared
    // options name every value from the first render.
    const labels = useRef<Record<string, string>>({});
    for (const option of inlineOptions ?? []) labels.current[option.value] = option.label;
    const [, relabelled] = useState(0);
    const learn = useCallback(
        (options: readonly ComboboxOption[]) => {
            let learned = false;
            for (const option of options) {
                if (labels.current[option.value] !== option.label) {
                    labels.current[option.value] = option.label;
                    learned = true;
                }
            }
            if (learned) {
                relabelled((n) => n + 1);
                onLabelsResolved?.({ ...labels.current });
            }
        },
        [onLabelsResolved],
    );

    // Report the declared labels upward after commit (never during render).
    useEffect(() => {
        if (inlineOptions && inlineOptions.length > 0) onLabelsResolved?.({ ...labels.current });
    }, [inlineOptions, onLabelsResolved]);

    // A preselected relational value has no label yet: read the source's first page (the
    // cached query the bar's label warmer and the open list also read) to name it.
    const unlabelled = ref !== undefined && selected.some((val) => labels.current[val] === undefined);
    const firstPage = useFilterOptions(unlabelled ? ref : undefined, '');
    useEffect(() => {
        if (firstPage.data) learn(firstPage.data);
    }, [firstPage.data, learn]);

    const remoteSearch = useFilterOptionsSearch(ref);
    const search = useCallback(
        async (term: string) => {
            const options = inlineOptions
                ? inlineOptions.filter((option) => option.label.toLowerCase().includes(term.toLowerCase()))
                : await remoteSearch(term);
            learn(options);
            return options;
        },
        [inlineOptions, remoteSearch, learn],
    );

    const pick = (option: ComboboxOption) => {
        if (single) {
            onChange(option.value);
            setOpen(false);
            return;
        }
        const next = selected.includes(option.value)
            ? selected.filter((entry) => entry !== option.value)
            : [...selected, option.value];
        onChange(next.length ? next.join(',') : null);
    };

    const remove = (val: string) => {
        const next = selected.filter((entry) => entry !== val);
        onChange(next.length ? next.join(',') : null);
    };

    return (
        <div className="space-y-1.5">
            {selected.length > 0 && (
                <div className="flex flex-wrap gap-1">
                    {selected.map((val) => (
                        <Badge key={val} variant="secondary" className="gap-1">
                            {labels.current[val] ?? val}
                            <button type="button" aria-label={`Remove ${labels.current[val] ?? val}`} onClick={() => remove(val)}>
                                <X className="size-3" />
                            </button>
                        </Badge>
                    ))}
                </div>
            )}
            <ComboboxList
                Input={Input}
                search={search}
                onSelect={pick}
                selectedValues={selected}
                multiple={!single}
                open={open}
                onOpenChange={setOpen}
                label={label ?? descriptor.name}
                placeholder="Search…"
                // Inline options are already here; only a server search waits for a pause.
                debounceMs={inlineOptions ? 0 : 200}
                listClassName="max-h-56 overflow-auto rounded-md border bg-background p-1 shadow-md"
            />
        </div>
    );
}
