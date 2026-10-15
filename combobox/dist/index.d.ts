import * as react from 'react';
import { ComponentType, ReactNode } from 'react';

interface ComboboxOption {
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
declare function Combobox({ primitives, trigger, search, onSelect, currentValue, placeholder, emptyText, loadingText, debounceMs, contentClassName, inputClassName, listClassName, optionClassName, }: ComboboxProps): react.JSX.Element;

export { Combobox, type ComboboxOption, type ComboboxPrimitives, type ComboboxProps };
