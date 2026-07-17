import { useEffect, useRef, useState, type ComponentType, type ReactNode } from 'react';

export interface ComboboxOption {
    /** The identity returned to `onSelect` (e.g. an id, or a navigation path). */
    value: string;
    label: string;
    /** Optional secondary line under the label. */
    hint?: string;
}

/**
 * The host's design-system atoms, injected so the combobox carries no UI dependency of
 * its own. Mirrors the injection style of @schemastud/facets + /frame, but passed as a
 * prop (not a provider) so the combobox works anywhere — including chrome that renders
 * outside any provider (e.g. a breadcrumb).
 */
export interface ComboboxPrimitives {
    Popover: ComponentType<any>;
    PopoverTrigger: ComponentType<any>;
    PopoverContent: ComponentType<any>;
    Input: ComponentType<any>;
}

export interface ComboboxProps {
    primitives: ComboboxPrimitives;
    /** The always-visible trigger (e.g. a breadcrumb crumb button). */
    trigger: ReactNode;
    /**
     * Fetch matching options for a query — debounced by the combobox, and called with
     * `''` when the popover opens. Stale responses are dropped (last query wins), so the
     * caller can implement it as a plain async request without guarding races.
     */
    search: (query: string) => Promise<ComboboxOption[]>;
    onSelect: (option: ComboboxOption) => void;
    /** The value marked current (a check + emphasis). */
    currentValue?: string;
    placeholder?: string;
    emptyText?: string;
    loadingText?: string;
    debounceMs?: number;
    contentClassName?: string;
    inputClassName?: string;
    listClassName?: string;
    optionClassName?: string;
}

/**
 * A searchable, debounced, keyboard-navigable combobox over a caller-supplied async
 * `search`. Value-neutral: `option.value` is whatever the caller wants back (an id, a
 * route path, …). The results box lives in the injected Popover; the trigger is the
 * caller's element.
 */
export function Combobox({
    primitives,
    trigger,
    search,
    onSelect,
    currentValue,
    placeholder = 'Search…',
    emptyText = 'No matches',
    loadingText = 'Searching…',
    debounceMs = 200,
    contentClassName,
    inputClassName,
    listClassName,
    optionClassName,
}: ComboboxProps) {
    const { Popover, PopoverTrigger, PopoverContent, Input } = primitives;

    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState('');
    const [options, setOptions] = useState<ComboboxOption[]>([]);
    const [loading, setLoading] = useState(false);
    const [activeIndex, setActiveIndex] = useState(0);

    // Monotonic request id so a slow earlier response can't overwrite a newer one.
    const requestSeq = useRef(0);
    const inputRef = useRef<HTMLInputElement>(null);

    // Debounced fetch, re-run on query change while open. Reset when closed.
    useEffect(() => {
        if (!open) return;

        let cancelled = false;
        const seq = ++requestSeq.current;
        setLoading(true);

        const timer = setTimeout(() => {
            search(query)
                .then((result) => {
                    if (cancelled || seq !== requestSeq.current) return;
                    setOptions(result);
                    setActiveIndex(0);
                })
                .catch(() => {
                    if (cancelled || seq !== requestSeq.current) return;
                    setOptions([]);
                })
                .finally(() => {
                    if (cancelled || seq !== requestSeq.current) return;
                    setLoading(false);
                });
        }, debounceMs);

        return () => {
            cancelled = true;
            clearTimeout(timer);
        };
    }, [open, query, search, debounceMs]);

    // Reset the query each time the popover opens, and focus the input.
    useEffect(() => {
        if (open) {
            setQuery('');
            const id = requestAnimationFrame(() => inputRef.current?.focus());
            return () => cancelAnimationFrame(id);
        }
    }, [open]);

    const choose = (option: ComboboxOption) => {
        onSelect(option);
        setOpen(false);
    };

    const onKeyDown = (event: React.KeyboardEvent) => {
        if (event.key === 'ArrowDown') {
            event.preventDefault();
            setActiveIndex((index) => Math.min(index + 1, options.length - 1));
        } else if (event.key === 'ArrowUp') {
            event.preventDefault();
            setActiveIndex((index) => Math.max(index - 1, 0));
        } else if (event.key === 'Enter') {
            event.preventDefault();
            const option = options[activeIndex];
            if (option) choose(option);
        } else if (event.key === 'Escape') {
            setOpen(false);
        }
    };

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>{trigger}</PopoverTrigger>
            <PopoverContent
                className={contentClassName ?? 'w-72 p-0'}
                onOpenAutoFocus={(event: Event) => event.preventDefault()}
            >
                <div className="border-b border-border p-1.5">
                    <Input
                        ref={inputRef}
                        value={query}
                        onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                            setQuery(event.target.value)
                        }
                        onKeyDown={onKeyDown}
                        placeholder={placeholder}
                        className={inputClassName ?? 'h-8'}
                        aria-label={placeholder}
                    />
                </div>
                <div
                    className={listClassName ?? 'max-h-72 overflow-y-auto p-1'}
                    role="listbox"
                >
                    {loading ? (
                        <div className="px-2 py-2 text-sm text-muted-foreground">{loadingText}</div>
                    ) : options.length === 0 ? (
                        <div className="px-2 py-2 text-sm text-muted-foreground">{emptyText}</div>
                    ) : (
                        options.map((option, index) => {
                            const current = option.value === currentValue;
                            const active = index === activeIndex;
                            return (
                                <button
                                    key={option.value}
                                    type="button"
                                    role="option"
                                    aria-selected={current}
                                    onMouseEnter={() => setActiveIndex(index)}
                                    onClick={() => choose(option)}
                                    className={
                                        optionClassName ??
                                        `flex w-full items-start gap-2 rounded-sm px-2 py-1.5 text-left text-sm transition-colors ${
                                            active ? 'bg-accent' : ''
                                        } ${current ? 'font-medium' : ''}`
                                    }
                                >
                                    <span className="mt-0.5 w-3 shrink-0 text-primary">
                                        {current ? '✓' : ''}
                                    </span>
                                    <span className="min-w-0 flex-1">
                                        <span className="block truncate">{option.label}</span>
                                        {option.hint && (
                                            <span className="block truncate text-xs text-muted-foreground">
                                                {option.hint}
                                            </span>
                                        )}
                                    </span>
                                </button>
                            );
                        })
                    )}
                </div>
            </PopoverContent>
        </Popover>
    );
}
