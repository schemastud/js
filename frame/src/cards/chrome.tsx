import type { ComponentType, ReactNode } from 'react';
import type { SchemaNode } from '@schemastud/seam';
import { Card, CardContent, CardDescription, CardHeader } from '@schemastud/ui';
import type { CardWidgetOptions, SummaryFigure } from './types';

// =============================================================================
// The chrome every card shares — ONE heading, ONE empty state, ONE "View all",
// ONE overview frame, and ONE anchor seam. A card composes these; none of them is
// duplicated in a widget file (realm-dashboards ticket 03 review).
// =============================================================================

/** The root pointer a card resolves its target's entry against. */
export const ROOT_NODE: SchemaNode = { type: 'object' };

/**
 * Every anchor a card draws goes through the host's injected `renderLink`
 * (`registerCardWidgets(registry, { renderLink })`), exactly as `@schemastud/nav`'s
 * `ExpandableNav` takes its link element by injection. Frame ships no navigation
 * primitive: a raw `<a href>` full-page-reloads an Inertia or router host, which is a
 * regression the card cannot see from here.
 *
 * `marker` rides the DEFAULT anchor only. Frame's `data-frame-*` markers describe frame's
 * own element; an injected renderer owns the element it returns, and stamping frame's
 * attributes onto someone else's `<Link>` would claim a contract the host never signed.
 */
export function CardLink({
    href,
    className,
    children,
    ariaLabel,
    marker,
    options,
}: {
    href: string;
    className?: string;
    children: ReactNode;
    ariaLabel?: string;
    marker?: Record<string, string>;
    options?: CardWidgetOptions;
}): ReactNode {
    const render = options?.renderLink;
    if (render) {
        return render({ href, className, children, ...(ariaLabel ? { 'aria-label': ariaLabel } : {}) });
    }

    return (
        <a href={href} className={className} aria-label={ariaLabel} {...(marker ?? {})}>
            {children}
        </a>
    );
}

/** The small uppercase heading every card shares; a link when the row carries an href. */
export function CardHeading({
    label,
    href,
    Icon,
    options,
}: {
    label: string;
    href?: string;
    Icon?: ComponentType<{ className?: string }>;
    options?: CardWidgetOptions;
}): ReactNode {
    const body = (
        <>
            {Icon ? <Icon className="size-3.5" /> : null}
            <span className="truncate">{label}</span>
        </>
    );
    const className =
        'flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground';

    if (!href) {
        return (
            <h3 data-frame-card-heading className={className}>
                {body}
            </h3>
        );
    }

    return (
        <CardLink
            href={href}
            className={`${className} hover:text-foreground`}
            marker={{ 'data-frame-card-heading': '' }}
            options={options}
        >
            {body}
        </CardLink>
    );
}

/** The one "View all →" affordance; nothing at all without an href. */
export function ViewAllLink({ href, options }: { href?: string; options?: CardWidgetOptions }): ReactNode {
    if (!href) return null;

    return (
        <CardLink
            href={href}
            className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
            marker={{ 'data-frame-card-link': '' }}
            options={options}
        >
            View all →
        </CardLink>
    );
}

/** The one honest-empty treatment — a dashed well, never a blank card. */
export function EmptyState({ children }: { children: ReactNode }): ReactNode {
    return (
        <div
            data-frame-card-empty
            className="rounded-md border border-dashed px-3 py-6 text-center text-sm text-muted-foreground"
        >
            {children}
        </div>
    );
}

export interface OverviewFrameProps {
    /** The `data-frame-card` marker the framed card answers to. */
    card: string;
    label: string;
    Icon?: ComponentType<{ className?: string }>;
    href?: string;
    period?: string;
    note?: string;
    /** The one figure the overview leads with, rendered large. */
    headline?: SummaryFigure;
    /** Drawn in place of the headline when there is none (a card whose body carries no figure). */
    fallback?: ReactNode;
    options?: CardWidgetOptions;
    children?: ReactNode;
}

/**
 * The overview CHROME: heading, the big headline figure, the period subtitle, the note, and
 * the "View all" link, around whatever body the caller supplies.
 *
 * Two surfaces share it, and that is the point. `figure-card` is the overview context default;
 * `dashboard-card` wraps the SUMMARY widget in it when an overview row falls back to the
 * target's `summary` binding, so the `headline`/`period`/`note` the server sent for that row
 * still reach the screen instead of being silently dropped with the tier that was asked for.
 */
export function OverviewFrame({
    card,
    label,
    Icon,
    href,
    period,
    note,
    headline,
    fallback,
    options,
    children,
}: OverviewFrameProps): ReactNode {
    return (
        <Card data-frame-card={card}>
            <CardHeader className="p-4 pb-2">
                <CardHeading label={label} href={href} Icon={Icon} options={options} />
                {period ? <CardDescription>{period}</CardDescription> : null}
            </CardHeader>
            <CardContent className="space-y-4 p-4 pt-0">
                {headline ? (
                    <div>
                        <div className="text-3xl font-semibold tabular-nums" data-frame-figure={headline.key}>
                            {headline.value}
                        </div>
                        <div className="text-xs text-muted-foreground">{headline.label}</div>
                    </div>
                ) : (
                    (fallback ?? null)
                )}
                {children}
                {note ? (
                    <p data-frame-card-note className="text-xs text-muted-foreground">
                        {note}
                    </p>
                ) : null}
                <ViewAllLink href={href} options={options} />
            </CardContent>
        </Card>
    );
}
