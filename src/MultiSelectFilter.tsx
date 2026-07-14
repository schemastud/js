import { X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useFacetsInjection } from './context';
import { useFilterOptions } from './data';
import type { FilterDescriptor } from './types';

/**
 * A type-ahead, Options-Source-backed relational picker — composed from an Input + a
 * results list + removable chips (no native `<select>`, per house rules). Options
 * resolve exclusively through the Options Source client keyed by the descriptor's
 * `optionsRef`, with server-side type-ahead; the control never hand-codes an
 * options endpoint.
 *
 * Serves both cardinalities off the descriptor's `control`: `multiselect` accrues a
 * comma-joined id set, `select` holds a single relational id (replace-on-pick,
 * closes the list after choosing) — e.g. "Produced By Circuit", which filters
 * Fragments to one circuit's lineage.
 */
export function MultiSelectFilter({
    descriptor,
    value,
    onChange,
    onLabelsResolved,
}: {
    descriptor: FilterDescriptor;
    value: string;
    onChange: (value: string | null) => void;
    // Reports resolved value→label pairs upward so a host (e.g. the facets bar chip)
    // can render names instead of ids for values chosen here.
    onLabelsResolved?: (labels: Record<string, string>) => void;
}) {
    const { Badge, Input } = useFacetsInjection().primitives;
    const single = descriptor.control === 'select';
    const [search, setSearch] = useState('');
    const [open, setOpen] = useState(false);
    const options = useFilterOptions(descriptor.optionsRef, search);

    const selected = value ? value.split(',') : [];

    // Remember labels for values we've seen, so chips read as names not ids.
    const labels = useRef<Record<string, string>>({});
    for (const option of options.data ?? []) {
        labels.current[option.value] = option.label;
    }

    // Report resolved labels upward after commit (never during render), so a host
    // can render names for values chosen here.
    const optionsData = options.data;
    useEffect(() => {
        if (onLabelsResolved && (optionsData?.length ?? 0) > 0) {
            onLabelsResolved({ ...labels.current });
        }
    }, [optionsData, onLabelsResolved]);

    const add = (val: string) => {
        if (single) {
            onChange(val);
            setSearch('');
            setOpen(false);
            return;
        }
        if (selected.includes(val)) return;
        onChange([...selected, val].join(','));
        setSearch('');
    };

    const remove = (val: string) => {
        const next = selected.filter((entry) => entry !== val);
        onChange(next.length ? next.join(',') : null);
    };

    const available = (options.data ?? []).filter((option) => !selected.includes(option.value));

    return (
        <div className="space-y-1.5">
            {selected.length > 0 && (
                <div className="flex flex-wrap gap-1">
                    {selected.map((val) => (
                        <Badge key={val} variant="secondary" className="gap-1">
                            {labels.current[val] ?? val}
                            <button
                                type="button"
                                aria-label={`Remove ${labels.current[val] ?? val}`}
                                onClick={() => remove(val)}
                            >
                                <X className="size-3" />
                            </button>
                        </Badge>
                    ))}
                </div>
            )}
            <div className="relative">
                <Input
                    value={search}
                    placeholder="Search…"
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                        setSearch(e.target.value);
                        setOpen(true);
                    }}
                    onFocus={() => setOpen(true)}
                    onBlur={() => setTimeout(() => setOpen(false), 150)}
                />
                {open && available.length > 0 && (
                    <ul className="absolute z-20 mt-1 max-h-56 w-full overflow-auto rounded-md border bg-background p-1 shadow-md">
                        {available.map((option) => (
                            <li key={option.value}>
                                <button
                                    type="button"
                                    className="w-full rounded px-2 py-1.5 text-left text-sm hover:bg-muted"
                                    onMouseDown={(e) => {
                                        // fire before the input's blur closes the list
                                        e.preventDefault();
                                        add(option.value);
                                    }}
                                >
                                    {option.label}
                                </button>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </div>
    );
}
