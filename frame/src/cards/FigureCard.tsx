import { EmptyState, OverviewFrame } from './chrome';
import type { CardWidgetProps, SummaryPayload } from './types';

/**
 * The `overview` context default: a resource expanded to a card with a body — the overview's
 * `headline` large, every `figure` as a sub-tile beneath it, `period` as the subtitle, `note`
 * as a caption, and a "View all" link when the row carries an href (tower's billing snapshot,
 * generalized). A payload with no `headline` (a summary answered for an overview row, as the
 * `overview ← summary` cascade allows) leads with its first figure instead, so the card never
 * opens on an empty number. A resource that declared only a summary never lands here from a
 * dashboard: `dashboard-card` falls through to `stat-row` first, inside the SAME
 * {@link OverviewFrame} chrome this card is built from.
 */
export function FigureCard({ value, options, row }: CardWidgetProps<SummaryPayload>) {
    const figures = value?.figures ?? [];
    const headline = value?.overview?.headline ?? undefined;
    const lead = headline ?? figures[0];
    const rest = headline ? figures : figures.slice(1);

    return (
        <OverviewFrame
            card="figure-card"
            label={value?.label ?? row?.label ?? value?.key ?? ''}
            Icon={options?.iconFor?.(value?.icon ?? row?.icon)}
            href={row?.href}
            period={value?.overview?.period ?? row?.description ?? undefined}
            note={value?.overview?.note ?? undefined}
            headline={lead}
            fallback={<EmptyState>No figures.</EmptyState>}
            options={options}
        >
            {rest.length > 0 ? (
                <div
                    className="grid gap-2 text-center"
                    style={{ gridTemplateColumns: `repeat(${Math.min(rest.length, 4)}, minmax(0, 1fr))` }}
                >
                    {rest.map((figure) => (
                        <div key={figure.key} className="rounded-md border p-2" data-frame-figure={figure.key}>
                            <div className="text-lg font-semibold tabular-nums">{figure.value}</div>
                            <div className="text-[11px] text-muted-foreground">{figure.label}</div>
                        </div>
                    ))}
                </div>
            ) : null}
        </OverviewFrame>
    );
}
