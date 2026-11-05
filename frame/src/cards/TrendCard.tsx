import { useId } from 'react';
import { displayLabel } from '@schemastud/seam';
import { CardHeading, EmptyState } from './chrome';
import type { CardWidgetProps, SummaryFigure, SummaryPayload } from './types';

// =============================================================================
// `trend-card` (exec-board ticket 06): a summary's figures drawn as a period series.
//
// The series IS the declared summary wire. Each figure is one period, in display order:
// `key` the period's identity, `label` its display name, `value` the number, and `forecast`
// whether the period is projected rather than measured. Nothing else is read, so a card that
// binds `trend-card` sends exactly what it would send `stat-row`.
// =============================================================================

/** One period of the series, as the chart reads it. */
export interface TrendPoint {
    key: string;
    label: string;
    /** The plotted number; null when the figure's value is not a plain number (a gap). */
    value: number | null;
    /** The value as the server sent it, for the text alternative. */
    display: number | string;
    forecast: boolean;
    index: number;
}

/** A run of consecutive plotted points drawn in one stroke. */
export interface TrendSegment {
    forecast: boolean;
    points: TrendPoint[];
}

const PLAIN_NUMBER = /^-?\d+(?:\.\d+)?$/;

/**
 * A figure's plottable number. A number plots when it is finite; a string plots only when it is
 * a plain decimal (`"12.5"`). An already-formatted string (`"$1,200"`) is not parsed: guessing a
 * locale's separators would plot a wrong line, so the period is a gap in the chart and keeps its
 * value in the text alternative.
 */
function plotValue(value: SummaryFigure['value']): number | null {
    if (typeof value === 'number') return Number.isFinite(value) ? value : null;
    if (typeof value === 'string' && PLAIN_NUMBER.test(value.trim())) return Number(value.trim());

    return null;
}

/** The figures of a summary as the ordered period series. */
export function trendSeries(figures: readonly SummaryFigure[]): TrendPoint[] {
    return figures.map((figure, index) => ({
        key: figure.key,
        label: figure.label,
        value: plotValue(figure.value),
        display: figure.value,
        forecast: figure.forecast === true,
        index,
    }));
}

/**
 * The strokes the series draws. Each step between two adjacent plotted periods is dashed when
 * EITHER end is a forecast, so the step that leaves the last measured period for the first
 * forecast one is already dashed: the line stays continuous and the change of basis falls on
 * the last measured point. Consecutive steps of one basis merge into one segment. A gap (a
 * period with no plottable value) breaks the line; a period with no plotted neighbour is a
 * segment of one point, which the chart draws as a dot.
 */
export function trendSegments(points: readonly TrendPoint[]): TrendSegment[] {
    const segments: TrendSegment[] = [];
    let previous: TrendPoint | null = null;

    for (const point of points) {
        if (point.value === null) {
            previous = null;
            continue;
        }
        if (previous === null) {
            segments.push({ forecast: point.forecast, points: [point] });
            previous = point;
            continue;
        }

        const forecast = previous.forecast || point.forecast;
        const current = segments[segments.length - 1];
        if (current.points.length === 1) {
            current.forecast = forecast;
            current.points.push(point);
        } else if (current.forecast === forecast) {
            current.points.push(point);
        } else {
            segments.push({ forecast, points: [previous, point] });
        }
        previous = point;
    }

    return segments;
}

/**
 * The last measured period before the first forecast one: where the basis changes. Null when the
 * series has no forecast, or no measured period ahead of its first forecast.
 */
export function forecastBoundary(points: readonly TrendPoint[]): TrendPoint | null {
    const first = points.findIndex((point) => point.forecast);
    if (first <= 0) return null;

    for (let i = first - 1; i >= 0; i--) {
        if (points[i].value !== null) return points[i];
    }

    return null;
}

/** The one-sentence description of the series the chart's `<title>` carries. */
export function describeTrend(label: string, points: readonly TrendPoint[]): string {
    if (points.length === 0) return `${label}: no periods.`;

    const first = points[0];
    const last = points[points.length - 1];
    const span =
        points.length === 1
            ? `1 period, ${first.label}: ${first.display}${first.forecast ? ' (forecast)' : ''}`
            : `${points.length} periods, ${first.label} to ${last.label}`;
    const forecast = points.filter((point) => point.forecast);
    const forecastFrom = forecast.length > 0 && points.length > 1 ? `; ${forecast.length} forecast from ${forecast[0].label}` : '';

    return `${label}: ${span}${forecastFrom}.`;
}

// ── Geometry ────────────────────────────────────────────────────────────────────────────

const WIDTH = 320;
const HEIGHT = 96;
const PAD = 6;

function scale(points: readonly TrendPoint[]) {
    const values = points.map((point) => point.value).filter((value): value is number => value !== null);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const n = points.length;

    const x = (point: TrendPoint) => (n === 1 ? WIDTH / 2 : PAD + (point.index * (WIDTH - 2 * PAD)) / (n - 1));
    // A flat series draws along the middle rather than collapsing onto an edge.
    const y = (point: TrendPoint) =>
        max === min ? HEIGHT / 2 : PAD + ((max - (point.value as number)) * (HEIGHT - 2 * PAD)) / (max - min);

    return { x, y };
}

const STROKE = {
    actual: 'text-primary',
    forecast: 'text-muted-foreground',
} as const;

/**
 * The `trend-card` widget: a summary's figures as a period series. Measured periods draw as a
 * solid line in the primary token; forecast periods as a dashed line in the muted token, with a
 * dashed rule at the last measured period. Basis is never carried by color alone: the dash, the
 * legend, and the text alternative each say it.
 *
 * Accessible as an image with a one-sentence `<title>`, plus a visually hidden table of every
 * period, its value as sent, and its basis. Colors are semantic tokens only (`currentColor`
 * under `text-*`), so light, dark and a satellite's re-treatment reach it.
 *
 * On a summary row it leads with the latest measured period. On an overview row that fell back
 * to this summary widget, `dashboard-card`'s overview frame already draws the declared headline,
 * so the lead is left to it.
 */
export function TrendCard({ value, options, row }: CardWidgetProps<SummaryPayload>) {
    const titleId = useId();
    const figures = value?.figures ?? [];
    const label = displayLabel({ title: value?.label ?? row?.label }, value?.key);
    const Icon = options?.iconFor?.(value?.icon ?? row?.icon);
    const points = trendSeries(figures);
    const plotted = points.filter((point) => point.value !== null);
    const hasForecast = points.some((point) => point.forecast);
    const framedHeadline = row?.context === 'overview' && value?.overview?.headline;
    const lead = framedHeadline ? undefined : [...points].reverse().find((point) => !point.forecast);

    return (
        <section data-frame-card="trend-card" className="space-y-2">
            <CardHeading label={label} href={row?.href} Icon={Icon} options={options} />
            {points.length === 0 ? (
                <EmptyState>No periods.</EmptyState>
            ) : (
                <>
                    {lead ? (
                        <div data-frame-trend-lead={lead.key}>
                            <div className="text-2xl font-semibold tabular-nums">{lead.display}</div>
                            <div className="text-xs text-muted-foreground">{lead.label}</div>
                        </div>
                    ) : null}
                    {plotted.length > 0 ? (
                        <TrendChart points={points} titleId={titleId} title={describeTrend(label, points)} />
                    ) : (
                        <EmptyState>No plottable periods.</EmptyState>
                    )}
                    <div
                        aria-hidden="true"
                        className="flex justify-between gap-2 text-[11px] text-muted-foreground"
                        data-frame-trend-axis
                    >
                        <span className="truncate">{points[0].label}</span>
                        {points.length > 1 ? <span className="truncate">{points[points.length - 1].label}</span> : null}
                    </div>
                    {hasForecast ? (
                        <div aria-hidden="true" className="flex gap-3 text-[11px] text-muted-foreground" data-frame-trend-legend>
                            <span className="inline-flex items-center gap-1">
                                <svg viewBox="0 0 16 4" className={`h-1 w-4 ${STROKE.actual}`}>
                                    <line x1="0" y1="2" x2="16" y2="2" stroke="currentColor" strokeWidth="2" />
                                </svg>
                                Actual
                            </span>
                            <span className="inline-flex items-center gap-1">
                                <svg viewBox="0 0 16 4" className={`h-1 w-4 ${STROKE.forecast}`}>
                                    <line x1="0" y1="2" x2="16" y2="2" stroke="currentColor" strokeWidth="2" strokeDasharray="4 3" />
                                </svg>
                                Forecast
                            </span>
                        </div>
                    ) : null}
                    <table className="sr-only" data-frame-trend-table>
                        <caption>{label}</caption>
                        <thead>
                            <tr>
                                <th scope="col">Period</th>
                                <th scope="col">Value</th>
                                <th scope="col">Basis</th>
                            </tr>
                        </thead>
                        <tbody>
                            {points.map((point) => (
                                <tr key={point.key} data-frame-trend-period={point.key}>
                                    <th scope="row">{point.label}</th>
                                    <td>{point.display}</td>
                                    <td>{point.forecast ? 'Forecast' : 'Actual'}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </>
            )}
        </section>
    );
}

function TrendChart({ points, titleId, title }: { points: TrendPoint[]; titleId: string; title: string }) {
    const { x, y } = scale(points);
    const segments = trendSegments(points);
    const boundary = forecastBoundary(points);
    const lastPlotted = [...points].reverse().find((point) => point.value !== null);

    return (
        <svg
            viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
            role="img"
            aria-labelledby={titleId}
            className="h-auto w-full overflow-visible"
            data-frame-trend-chart
        >
            <title id={titleId}>{title}</title>
            {boundary ? (
                <line
                    x1={x(boundary)}
                    x2={x(boundary)}
                    y1={0}
                    y2={HEIGHT}
                    stroke="currentColor"
                    strokeWidth={1}
                    strokeDasharray="2 3"
                    vectorEffect="non-scaling-stroke"
                    className="text-border"
                    data-frame-trend-boundary={boundary.key}
                />
            ) : null}
            {segments.map((segment) =>
                segment.points.length === 1 ? null : (
                    <polyline
                        key={`${segment.points[0].key}-${segment.forecast ? 'f' : 'a'}`}
                        points={segment.points.map((point) => `${x(point)},${y(point)}`).join(' ')}
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={2}
                        strokeLinejoin="round"
                        strokeLinecap="round"
                        strokeDasharray={segment.forecast ? '5 4' : undefined}
                        vectorEffect="non-scaling-stroke"
                        className={segment.forecast ? STROKE.forecast : STROKE.actual}
                        data-frame-trend-segment={segment.forecast ? 'forecast' : 'actual'}
                    />
                ),
            )}
            {points.map((point) => {
                if (point.value === null) return null;
                const isolated = segments.some((s) => s.points.length === 1 && s.points[0] === point);
                if (!isolated && point !== lastPlotted) return null;

                return (
                    <circle
                        key={point.key}
                        cx={x(point)}
                        cy={y(point)}
                        r={3}
                        stroke="currentColor"
                        strokeWidth={2}
                        vectorEffect="non-scaling-stroke"
                        className={`${point.forecast ? `${STROKE.forecast} fill-background` : `${STROKE.actual} fill-current`}`}
                        data-frame-trend-point={point.key}
                    />
                );
            })}
        </svg>
    );
}
