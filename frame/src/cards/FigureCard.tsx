import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@schemastud/ui';
import type { CardWidgetProps, SummaryPayload } from './types';

/**
 * The `overview` context default: a resource expanded to a card with a body — the overview's
 * `headline` large, every `figure` as a sub-tile beneath it, `period` as the subtitle, `note`
 * as a caption, and a "View all" link when the row carries an href (tower's billing snapshot,
 * generalized). A payload with no `headline` (a summary answered for an overview row, as the
 * `overview ← summary` cascade allows) leads with its first figure instead, so the card never
 * opens on an empty number. A resource that declared only a summary never lands here from a
 * dashboard: `dashboard-card` falls through to `stat-row` first.
 */
export function FigureCard({ value, options, row }: CardWidgetProps<SummaryPayload>) {
    const figures = value?.figures ?? [];
    const headline = value?.overview?.headline ?? undefined;
    const lead = headline ?? figures[0];
    const rest = headline ? figures : figures.slice(1);
    const label = value?.label ?? row?.label ?? value?.key ?? '';
    const Icon = options?.iconFor?.(value?.icon ?? row?.icon);
    const description = value?.overview?.period ?? row?.description ?? undefined;
    const note = value?.overview?.note ?? undefined;

    return (
        <Card data-frame-card="figure-card">
            <CardHeader className="p-4 pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                    {Icon ? <Icon className="size-4 text-muted-foreground" /> : null}
                    {label}
                </CardTitle>
                {description ? <CardDescription>{description}</CardDescription> : null}
            </CardHeader>
            <CardContent className="space-y-4 p-4 pt-0">
                {lead ? (
                    <div>
                        <div className="text-3xl font-semibold tabular-nums" data-frame-figure={lead.key}>
                            {lead.value}
                        </div>
                        <div className="text-xs text-muted-foreground">{lead.label}</div>
                    </div>
                ) : (
                    <div className="rounded-md border border-dashed px-3 py-6 text-center text-sm text-muted-foreground">
                        No figures.
                    </div>
                )}
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
                {note ? (
                    <p data-frame-card-note className="text-xs text-muted-foreground">
                        {note}
                    </p>
                ) : null}
                {row?.href ? (
                    <a
                        href={row.href}
                        data-frame-card-link
                        className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                    >
                        View all →
                    </a>
                ) : null}
            </CardContent>
        </Card>
    );
}
