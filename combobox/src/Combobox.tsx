import { useState, type ComponentType, type ReactNode } from 'react';
import { ComboboxList, type ComboboxOption } from './ComboboxList';

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
    /** The value or values marked current (a check + emphasis). */
    currentValue?: string | readonly string[];
    /**
     * Several values can be chosen: the popover stays open after a pick, so the caller can toggle one value after
     * another. Single (the default) closes on a pick.
     */
    multiple?: boolean;
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
 * route path, …). The results box is a `ComboboxList` in the injected Popover; the
 * trigger is the caller's element.
 */
export function Combobox({
    primitives,
    trigger,
    search,
    onSelect,
    currentValue,
    multiple = false,
    placeholder,
    emptyText,
    loadingText,
    debounceMs,
    contentClassName,
    inputClassName,
    listClassName,
    optionClassName,
}: ComboboxProps) {
    const { Popover, PopoverTrigger, PopoverContent, Input } = primitives;
    const [open, setOpen] = useState(false);
    const selectedValues = currentValue === undefined ? [] : typeof currentValue === 'string' ? [currentValue] : currentValue;

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>{trigger}</PopoverTrigger>
            <PopoverContent
                className={contentClassName ?? 'w-72 p-0'}
                onOpenAutoFocus={(event: Event) => event.preventDefault()}
            >
                <ComboboxList
                    inputWrapperClassName="border-b border-border p-1.5"
                    Input={Input}
                    search={search}
                    onSelect={(option) => {
                        onSelect(option);
                        if (!multiple) setOpen(false);
                    }}
                    selectedValues={selectedValues}
                    multiple={multiple}
                    open={open}
                    onOpenChange={setOpen}
                    autoFocus
                    placeholder={placeholder}
                    emptyText={emptyText}
                    loadingText={loadingText}
                    debounceMs={debounceMs}
                    inputClassName={inputClassName}
                    listClassName={listClassName}
                    optionClassName={optionClassName}
                />
            </PopoverContent>
        </Popover>
    );
}
