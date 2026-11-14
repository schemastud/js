import * as react from 'react';
import { ComponentType, Ref, ReactNode } from 'react';

interface ComboboxOption {
    /** The identity returned to `onSelect` (e.g. an id, or a navigation path). */
    value: string;
    label: string;
    /** Optional secondary line under the label. */
    hint?: string;
}
interface ComboboxListProps {
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
declare function ComboboxList({ Input, search, onSelect, selectedValues, multiple, open, onOpenChange, autoFocus, label, placeholder, emptyText, loadingText, debounceMs, inputClassName, inputWrapperClassName, listClassName, optionClassName, inputRef, }: ComboboxListProps): react.JSX.Element;

/**
 * The host's design-system atoms, injected so the combobox carries no UI dependency of
 * its own. Mirrors the injection style of @schemastud/facets + /frame, but passed as a
 * prop (not a provider) so the combobox works anywhere — including chrome that renders
 * outside any provider (e.g. a breadcrumb).
 */
interface ComboboxPrimitives {
    Popover: ComponentType<any>;
    PopoverTrigger: ComponentType<any>;
    PopoverContent: ComponentType<any>;
    Input: ComponentType<any>;
}
interface ComboboxProps {
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
declare function Combobox({ primitives, trigger, search, onSelect, currentValue, multiple, placeholder, emptyText, loadingText, debounceMs, contentClassName, inputClassName, listClassName, optionClassName, }: ComboboxProps): react.JSX.Element;

export { Combobox, ComboboxList, type ComboboxListProps, type ComboboxOption, type ComboboxPrimitives, type ComboboxProps };
