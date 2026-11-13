import { useComboboxMessages } from './messages';
import { useEffect, useId, useRef, useState, type ComponentType, type KeyboardEvent, type Ref } from 'react';

export interface ComboboxOption {
    /** The identity returned to `onSelect` (e.g. an id, or a navigation path). */
    value: string;
    label: string;
    /** Optional secondary line under the label. */
    hint?: string;
}

export interface ComboboxListProps {
    /** The host's text input, injected so the list carries no design-system dependency. */
    Input: ComponentType<any>;
    /**
     * Fetch matching options for a query, debounced by the list and called with `''` when the list opens. Stale
     * responses are dropped (last query wins), so the caller can implement it as a plain async request.
     */
    search: (query: string) => Promise<ComboboxOption[]>;
    /** A pick, by Enter on the active option or a click. The query is cleared after it. */
    onSelect: (option: ComboboxOption) => void;
    /** The values marked chosen (a check, emphasis and `aria-selected`). */
    selectedValues?: readonly string[];
    /** Several values can be chosen (`aria-multiselectable`); the caller decides what a pick does to the set. */
    multiple?: boolean;
    /**
     * Whether the results are shown and searched. Defaults to always. A caller that renders the list inline passes
     * its own state and `onOpenChange`; inside a popover the popover's state is enough.
     */
    open?: boolean;
    /** Asked to open on focus, typing or ArrowDown, and to close on Escape. */
    onOpenChange?: (open: boolean) => void;
    /** Focus the input each time the list opens (the popover combobox does). */
    autoFocus?: boolean;
    /** The input's accessible name. Defaults to the placeholder. */
    label?: string;
    placeholder?: string;
    emptyText?: string;
    loadingText?: string;
    debounceMs?: number;
    inputClassName?: string;
    /** When set, the input is wrapped in a box with this class (the popover combobox's bordered header). */
    inputWrapperClassName?: string;
    listClassName?: string;
    optionClassName?: string;
    inputRef?: Ref<HTMLInputElement>;
}

/**
 * The combobox without its popover: a text input over a listbox of the options a debounced `search` returns, driven
 * by the keyboard (ArrowUp/ArrowDown move, Enter picks, Escape closes) with the ARIA combobox pattern
 * (`role="combobox"` on the input, `aria-activedescendant` on the active option). Use it where a popover already
 * exists, such as a filter editor inside a facets bar; `Combobox` wraps it in one.
 */
export function ComboboxList({
    Input,
    search,
    onSelect,
    selectedValues = [],
    multiple = false,
    open = true,
    onOpenChange,
    autoFocus = false,
    label,
    placeholder,
    emptyText,
    loadingText,
    debounceMs = 200,
    inputClassName,
    inputWrapperClassName,
    listClassName,
    optionClassName,
    inputRef,
}: ComboboxListProps) {
    const messages = useComboboxMessages();
    placeholder ??= messages.t('schemastud-combobox::messages.search');
    emptyText ??= messages.t('schemastud-combobox::messages.no_matches');
    loadingText ??= messages.t('schemastud-combobox::messages.searching');
    const [query, setQuery] = useState('');
    const [options, setOptions] = useState<ComboboxOption[]>([]);
    const [loading, setLoading] = useState(false);
    const [activeIndex, setActiveIndex] = useState(0);
    const listId = useId();
    const ownInput = useRef<HTMLInputElement | null>(null);

    // Monotonic request id so a slow earlier response can't overwrite a newer one.
    const requestSeq = useRef(0);

    // Debounced fetch, re-run on query change while open: one request per typing pause.
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

    // Each time the list opens: a fresh query, and the input focused when asked.
    const wasOpen = useRef(open);
    useEffect(() => {
        if (open && !wasOpen.current) setQuery('');
        wasOpen.current = open;
        if (open && autoFocus) {
            const id = requestAnimationFrame(() => ownInput.current?.focus());
            return () => cancelAnimationFrame(id);
        }
    }, [open, autoFocus]);

    const choose = (option: ComboboxOption) => {
        onSelect(option);
        setQuery('');
    };

    const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
        if (event.key === 'ArrowDown') {
            event.preventDefault();
            if (!open) {
                onOpenChange?.(true);
                return;
            }
            setActiveIndex((index) => Math.min(index + 1, options.length - 1));
        } else if (event.key === 'ArrowUp') {
            event.preventDefault();
            setActiveIndex((index) => Math.max(index - 1, 0));
        } else if (event.key === 'Enter') {
            if (!open || loading) return;
            event.preventDefault();
            const option = options[activeIndex];
            if (option) choose(option);
        } else if (event.key === 'Escape') {
            if (open && onOpenChange) {
                event.preventDefault();
                onOpenChange(false);
            }
        }
    };

    const optionId = (index: number) => `${listId}-option-${index}`;
    const showOptions = open && !loading && options.length > 0;

    const input = (
        <Input
                ref={(node: HTMLInputElement | null) => {
                    ownInput.current = node;
                    if (typeof inputRef === 'function') inputRef(node);
                    else if (inputRef) (inputRef as { current: HTMLInputElement | null }).current = node;
                }}
                role="combobox"
                aria-label={label ?? placeholder}
                aria-expanded={open}
                aria-controls={open ? listId : undefined}
                aria-autocomplete="list"
                aria-activedescendant={showOptions && options[activeIndex] ? optionId(activeIndex) : undefined}
                value={query}
                onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
                    setQuery(event.target.value);
                    if (!open) onOpenChange?.(true);
                }}
                onFocus={() => {
                    if (!open) onOpenChange?.(true);
                }}
                onKeyDown={onKeyDown}
                placeholder={placeholder}
                className={inputClassName ?? 'h-8'}
                autoComplete="off"
            />
    );

    return (
        <>
            {inputWrapperClassName ? <div className={inputWrapperClassName}>{input}</div> : input}
            {open && (
                <div
                    id={listId}
                    role="listbox"
                    aria-label={label ?? placeholder}
                    aria-multiselectable={multiple || undefined}
                    className={listClassName ?? 'max-h-72 overflow-y-auto p-1'}
                >
                    {loading ? (
                        <div className="px-2 py-2 text-sm text-muted-foreground">{loadingText}</div>
                    ) : options.length === 0 ? (
                        <div className="px-2 py-2 text-sm text-muted-foreground">{emptyText}</div>
                    ) : (
                        options.map((option, index) => {
                            const current = selectedValues.includes(option.value);
                            const active = index === activeIndex;
                            return (
                                <div
                                    key={option.value}
                                    id={optionId(index)}
                                    role="option"
                                    aria-selected={current}
                                    data-active={active || undefined}
                                    onMouseEnter={() => setActiveIndex(index)}
                                    // Keep focus in the input, so the keyboard path carries on after a click.
                                    onMouseDown={(event) => event.preventDefault()}
                                    onClick={() => choose(option)}
                                    className={
                                        optionClassName ??
                                        `flex w-full cursor-pointer items-start gap-2 rounded-sm px-2 py-1.5 text-left text-sm transition-colors ${
                                            active ? 'bg-accent' : ''
                                        } ${current ? 'font-medium' : ''}`
                                    }
                                >
                                    <span className="mt-0.5 w-3 shrink-0 text-primary" aria-hidden="true">
                                        {current ? '✓' : ''}
                                    </span>
                                    <span className="min-w-0 flex-1">
                                        <span className="block truncate">{option.label}</span>
                                        {option.hint && (
                                            <span className="block truncate text-xs text-muted-foreground">{option.hint}</span>
                                        )}
                                    </span>
                                </div>
                            );
                        })
                    )}
                </div>
            )}
        </>
    );
}
