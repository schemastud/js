import type { ComponentType } from 'react';
import { StatTile } from '@schemastud/ui';
import type { CardWidgetProps, SummaryPayload } from './types';

/**
 * The `summary` context default: a resource compressed to its figures, one `StatTile` per
 * figure. The header names the collection and, on a dashboard row, links to it. Zero
 * figures is an honest empty ("No figures."), never a blank card — an empty platform reads
 * honest zeroes, and a provider that answered nothing reads as exactly that.
 */
export function StatRow({ value, options, row }: CardWidgetProps<SummaryPayload>) {
    const figures = value?.figures ?? [];
    const label = value?.label ?? row?.label ?? value?.key ?? '';
    const Icon = options?.iconFor?.(value?.icon ?? row?.icon);

    return (
        <section data-frame-card="stat-row" className="space-y-2">
            <CardHeading label={label} href={row?.href} Icon={Icon} />
            {figures.length === 0 ? (
                <div className="rounded-md border border-dashed px-3 py-6 text-center text-sm text-muted-foreground">
                    No figures.
                </div>
            ) : (
                <div
                    className="grid gap-3"
                    style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(9rem, 1fr))' }}
                >
                    {figures.map((figure) => (
                        <StatTile
                            key={figure.key}
                            label={figure.label}
                            value={figure.value}
                            tone={figure.tone ?? 'default'}
                        />
                    ))}
                </div>
            )}
        </section>
    );
}

/** The small uppercase heading every card shares; a link when the row carries an href. */
export function CardHeading({
    label,
    href,
    Icon,
}: {
    label: string;
    href?: string;
    Icon?: ComponentType<{ className?: string }>;
}) {
    const body = (
        <>
            {Icon ? <Icon className="size-3.5" /> : null}
            <span className="truncate">{label}</span>
        </>
    );
    const className =
        'flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground';

    return href ? (
        <a href={href} data-frame-card-heading className={`${className} hover:text-foreground`}>
            {body}
        </a>
    ) : (
        <h3 data-frame-card-heading className={className}>
            {body}
        </h3>
    );
}
