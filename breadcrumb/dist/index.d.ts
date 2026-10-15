import * as react from 'react';
import { ReactNode } from 'react';
import { ComboboxOption, ComboboxPrimitives } from '@schemastud/combobox';

/**
 * A searchable sibling-switcher on a crumb. `search` returns options whose `value` is the
 * navigation target for that sibling; `currentValue` marks the crumb you're on. Present it
 * on a crumb to turn that crumb into a combobox instead of a static menu — so it scales to
 * large dynamic lists.
 */
interface BreadcrumbSwitcher {
    search: (query: string) => Promise<ComboboxOption[]>;
    /** The current sibling's navigation target (marked in the list). */
    currentValue?: string;
    placeholder?: string;
    emptyText?: string;
}
interface BreadcrumbCrumb {
    label: ReactNode;
    /** A plain link target. Ignored when `switcher` is present. */
    path?: string;
    /** Turns the crumb into a searchable sibling-switcher. */
    switcher?: BreadcrumbSwitcher;
}
interface BreadcrumbProps {
    crumbs: BreadcrumbCrumb[];
    /** Bring-your-own navigation (e.g. react-router's navigate). */
    onNavigate: (path: string) => void;
    /** UI atoms for the switcher combobox (Popover*, Input). */
    primitives: ComboboxPrimitives;
    /** Rendered between crumbs. Defaults to a chevron-ish slash. */
    separator?: ReactNode;
    /** Trailing glyph on a switcher trigger (e.g. a chevron). */
    switcherAffordance?: ReactNode;
    className?: string;
    crumbLinkClassName?: string;
    crumbCurrentClassName?: string;
    switcherTriggerClassName?: string;
    comboboxContentClassName?: string;
}
/**
 * Renders a breadcrumb trail. Each crumb is a plain link (`path`), a searchable switcher
 * (`switcher`), or — with neither — the current (unlinked) leaf. The host owns the crumb
 * data and navigation; this component owns only the presentation + the switcher wiring.
 */
declare function Breadcrumb({ crumbs, onNavigate, primitives, separator, switcherAffordance, className, crumbLinkClassName, crumbCurrentClassName, switcherTriggerClassName, comboboxContentClassName, }: BreadcrumbProps): react.JSX.Element;

export { Breadcrumb, type BreadcrumbCrumb, type BreadcrumbProps, type BreadcrumbSwitcher };
