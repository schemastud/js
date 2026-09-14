import { StatTile } from '@schemastud/ui';
import { CardHeading, EmptyState } from './chrome';
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
            <CardHeading label={label} href={row?.href} Icon={Icon} options={options} />
            {figures.length === 0 ? (
                <EmptyState>No figures.</EmptyState>
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
