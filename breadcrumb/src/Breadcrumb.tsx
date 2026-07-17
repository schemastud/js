import { Fragment, type ReactNode } from 'react';
import { Combobox, type ComboboxOption, type ComboboxPrimitives } from '@schemastud/combobox';

/**
 * A searchable sibling-switcher on a crumb. `search` returns options whose `value` is the
 * navigation target for that sibling; `currentValue` marks the crumb you're on. Present it
 * on a crumb to turn that crumb into a combobox instead of a static menu — so it scales to
 * large dynamic lists.
 */
export interface BreadcrumbSwitcher {
    search: (query: string) => Promise<ComboboxOption[]>;
    /** The current sibling's navigation target (marked in the list). */
    currentValue?: string;
    placeholder?: string;
    emptyText?: string;
}

export interface BreadcrumbCrumb {
    label: ReactNode;
    /** A plain link target. Ignored when `switcher` is present. */
    path?: string;
    /** Turns the crumb into a searchable sibling-switcher. */
    switcher?: BreadcrumbSwitcher;
}

export interface BreadcrumbProps {
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
export function Breadcrumb({
    crumbs,
    onNavigate,
    primitives,
    separator,
    switcherAffordance,
    className,
    crumbLinkClassName,
    crumbCurrentClassName,
    switcherTriggerClassName,
    comboboxContentClassName,
}: BreadcrumbProps) {
    const sep = separator ?? <span className="text-muted-foreground/60">/</span>;

    return (
        <nav className={className ?? 'flex items-center gap-1 text-sm'} aria-label="Breadcrumb">
            {crumbs.map((crumb, index) => (
                <Fragment key={index}>
                    {index > 0 && <span className="mx-0.5 flex items-center">{sep}</span>}
                    {crumb.switcher ? (
                        <Combobox
                            primitives={primitives}
                            search={crumb.switcher.search}
                            currentValue={crumb.switcher.currentValue}
                            placeholder={crumb.switcher.placeholder}
                            emptyText={crumb.switcher.emptyText}
                            onSelect={(option) => onNavigate(option.value)}
                            contentClassName={comboboxContentClassName ?? 'w-72 p-0'}
                            trigger={
                                <button
                                    type="button"
                                    className={
                                        switcherTriggerClassName ??
                                        'inline-flex max-w-[16rem] items-center gap-1 rounded-md px-1.5 py-0.5 text-sm font-medium text-foreground transition-colors hover:bg-accent'
                                    }
                                >
                                    <span className="truncate">{crumb.label}</span>
                                    {switcherAffordance}
                                </button>
                            }
                        />
                    ) : crumb.path ? (
                        <button
                            type="button"
                            onClick={() => onNavigate(crumb.path as string)}
                            className={
                                crumbLinkClassName ??
                                'max-w-[16rem] truncate rounded-md px-1.5 py-0.5 font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground'
                            }
                        >
                            {crumb.label}
                        </button>
                    ) : (
                        <span
                            className={
                                crumbCurrentClassName ??
                                'max-w-[16rem] truncate px-1.5 py-0.5 font-medium text-foreground'
                            }
                        >
                            {crumb.label}
                        </span>
                    )}
                </Fragment>
            ))}
        </nav>
    );
}
