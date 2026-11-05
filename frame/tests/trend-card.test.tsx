import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import { createWidgetRegistry } from '@schemastud/seam';
import {
    describeTrend,
    forecastBoundary,
    registerCardWidgets,
    TrendCard,
    trendSegments,
    trendSeries,
    type DashboardRow,
    type SummaryFigure,
    type SummaryPayload,
} from '../src/cards';

afterEach(cleanup);

// exec-board ticket 06: `trend-card` draws a summary's figures as a period series.

const month = (key: string, value: number | string, forecast?: boolean): SummaryFigure => ({
    key,
    label: key,
    value,
    ...(forecast === undefined ? {} : { forecast }),
});

const payload = (figures: SummaryFigure[], over: Partial<SummaryPayload> = {}): SummaryPayload => ({
    key: 'exec-revenue',
    label: 'Revenue',
    figures,
    ...over,
});

const ACTUAL = [month('2026-01', 100), month('2026-02', 120), month('2026-03', 110), month('2026-04', 140)];
const PROJECTED = [...ACTUAL, month('2026-05', 150, true), month('2026-06', 165, true)];

const segmentsIn = (container: HTMLElement) =>
    Array.from(container.querySelectorAll('[data-frame-trend-segment]')).map((el) => ({
        basis: el.getAttribute('data-frame-trend-segment'),
        dashed: el.getAttribute('stroke-dasharray'),
        vertices: (el.getAttribute('points') ?? '').split(' ').length,
    }));

describe('trend-card — the series', () => {
    it('resolves by its x-widget name from the registered card set', () => {
        const registry = createWidgetRegistry();
        registerCardWidgets(registry);

        expect(registry.resolveWidget({ 'x-widget': 'trend-card' })).toBe(TrendCard);
    });

    it('reads every figure as one period, in display order, from the declared figure shape only', () => {
        const points = trendSeries(ACTUAL);

        expect(points.map((p) => [p.key, p.value, p.forecast, p.index])).toEqual([
            ['2026-01', 100, false, 0],
            ['2026-02', 120, false, 1],
            ['2026-03', 110, false, 2],
            ['2026-04', 140, false, 3],
        ]);
    });

    it('draws a measured series as ONE solid stroke through every period, leading with the latest', () => {
        const { container } = render(<TrendCard value={payload(ACTUAL)} />);

        expect(segmentsIn(container)).toEqual([{ basis: 'actual', dashed: null, vertices: 4 }]);
        expect(container.querySelector('[data-frame-trend-boundary]')).toBeNull();
        expect(container.querySelector('[data-frame-trend-legend]')).toBeNull();
        expect(container.querySelector('[data-frame-trend-lead]')?.getAttribute('data-frame-trend-lead')).toBe('2026-04');
        // The end of the line carries a dot; the axis names the first and last period.
        expect(container.querySelector('[data-frame-trend-point="2026-04"]')).not.toBeNull();
        expect(container.querySelector('[data-frame-trend-axis]')?.textContent).toBe('2026-012026-04');
    });

    it('scales the highest period to the top and the lowest to the bottom of the chart', () => {
        const { container } = render(<TrendCard value={payload(ACTUAL)} />);
        const ys = (container.querySelector('[data-frame-trend-segment]')?.getAttribute('points') ?? '')
            .split(' ')
            .map((pair) => Number(pair.split(',')[1]));

        expect(Math.min(...ys)).toBe(ys[3]); // 140, the maximum, is nearest the top
        expect(Math.max(...ys)).toBe(ys[0]); // 100, the minimum, is nearest the bottom
    });

    it('is an image with a one-sentence title AND a hidden table of every period', () => {
        render(<TrendCard value={payload(ACTUAL)} />);

        const chart = screen.getByRole('img');
        expect(chart).toHaveProperty('tagName', 'svg');
        expect(chart.getAttribute('aria-labelledby')).toBeTruthy();
        expect(screen.getByRole('img', { name: 'Revenue: 4 periods, 2026-01 to 2026-04.' })).toBe(chart);

        const table = screen.getByRole('table', { name: 'Revenue' });
        const rows = within(table).getAllByRole('row').slice(1);
        expect(rows.map((r) => r.textContent)).toEqual([
            '2026-01100Actual',
            '2026-02120Actual',
            '2026-03110Actual',
            '2026-04140Actual',
        ]);
    });

    it('plots plain decimal strings, and leaves a formatted string as a gap that keeps its value in the table', () => {
        const points = trendSeries([month('a', '12.5'), month('b', '$1,200'), month('c', 14)]);
        expect(points.map((p) => p.value)).toEqual([12.5, null, 14]);
        // The gap breaks the line: two isolated periods, no stroke between them.
        expect(trendSegments(points).map((s) => s.points.map((p) => p.key))).toEqual([['a'], ['c']]);

        const { container } = render(<TrendCard value={payload([month('a', '12.5'), month('b', '$1,200'), month('c', 14)])} />);
        expect(container.querySelectorAll('[data-frame-trend-segment]')).toHaveLength(0);
        expect(container.querySelectorAll('[data-frame-trend-point]')).toHaveLength(2);
        expect(screen.getByRole('table').textContent).toContain('$1,200');
    });
});

describe('trend-card — the forecast boundary', () => {
    it('splits at the last measured period: solid up to it, dashed from it', () => {
        const segments = trendSegments(trendSeries(PROJECTED));

        expect(segments.map((s) => [s.forecast, s.points.map((p) => p.key)])).toEqual([
            [false, ['2026-01', '2026-02', '2026-03', '2026-04']],
            [true, ['2026-04', '2026-05', '2026-06']],
        ]);
        expect(forecastBoundary(trendSeries(PROJECTED))?.key).toBe('2026-04');
    });

    it('draws the forecast as a dashed stroke in the muted token, with a rule, a legend and the basis in the table', () => {
        const { container } = render(<TrendCard value={payload(PROJECTED)} />);

        expect(segmentsIn(container)).toEqual([
            { basis: 'actual', dashed: null, vertices: 4 },
            { basis: 'forecast', dashed: '5 4', vertices: 3 },
        ]);
        const actual = container.querySelector('[data-frame-trend-segment="actual"]');
        const forecast = container.querySelector('[data-frame-trend-segment="forecast"]');
        expect(actual?.getAttribute('class')).toContain('text-primary');
        expect(forecast?.getAttribute('class')).toContain('text-muted-foreground');
        // The line is continuous: the dashed stroke starts on the solid one's last vertex.
        const lastSolid = actual?.getAttribute('points')?.split(' ').at(-1);
        expect(forecast?.getAttribute('points')?.split(' ')[0]).toBe(lastSolid);

        expect(container.querySelector('[data-frame-trend-boundary]')?.getAttribute('data-frame-trend-boundary')).toBe('2026-04');
        expect(container.querySelector('[data-frame-trend-legend]')?.textContent).toBe('ActualForecast');
        // The lead is the latest MEASURED period, never a projection.
        expect(container.querySelector('[data-frame-trend-lead]')?.getAttribute('data-frame-trend-lead')).toBe('2026-04');

        expect(screen.getByRole('img').textContent).toBe('Revenue: 6 periods, 2026-01 to 2026-06; 2 forecast from 2026-05.');
        const rows = within(screen.getByRole('table')).getAllByRole('row').slice(1);
        expect(rows.map((r) => r.lastElementChild?.textContent)).toEqual([
            'Actual',
            'Actual',
            'Actual',
            'Actual',
            'Forecast',
            'Forecast',
        ]);
    });

    it('reads an absent or null forecast as measured (a summary that predates the field draws unchanged)', () => {
        const points = trendSeries([{ key: 'a', label: 'a', value: 1, forecast: null }, { key: 'b', label: 'b', value: 2 }]);

        expect(points.map((p) => p.forecast)).toEqual([false, false]);
        expect(forecastBoundary(points)).toBeNull();
    });

    it('a series that is all forecast (a projection with no measured baseline) is dashed throughout, with no rule', () => {
        const all = [month('2026-05', 150, true), month('2026-06', 165, true)];
        const { container } = render(<TrendCard value={payload(all)} />);

        expect(segmentsIn(container)).toEqual([{ basis: 'forecast', dashed: '5 4', vertices: 2 }]);
        expect(container.querySelector('[data-frame-trend-boundary]')).toBeNull();
        expect(container.querySelector('[data-frame-trend-lead]')).toBeNull();
    });

    it('places the boundary on the last PLOTTED measured period when a gap precedes the forecast', () => {
        const points = trendSeries([month('a', 1), month('b', 'n/a'), month('c', 3, true)]);

        expect(forecastBoundary(points)?.key).toBe('a');
    });
});

describe('trend-card — the edges', () => {
    it('an empty series is the honest empty state, with no chart and no table', () => {
        const { container } = render(<TrendCard value={payload([])} />);

        expect(container.querySelector('[data-frame-card-empty]')?.textContent).toBe('No periods.');
        expect(container.querySelector('svg')).toBeNull();
        expect(container.querySelector('table')).toBeNull();
        expect(describeTrend('Revenue', [])).toBe('Revenue: no periods.');
    });

    it('an absent payload is the same empty state', () => {
        const { container } = render(<TrendCard value={undefined as unknown as SummaryPayload} />);

        expect(container.querySelector('[data-frame-card-empty]')?.textContent).toBe('No periods.');
    });

    it('a single point draws a centred dot, no stroke and no rule, and is described', () => {
        const { container } = render(<TrendCard value={payload([month('2026-04', 140)])} />);

        expect(container.querySelectorAll('[data-frame-trend-segment]')).toHaveLength(0);
        expect(container.querySelector('[data-frame-trend-boundary]')).toBeNull();
        const dot = container.querySelector('[data-frame-trend-point="2026-04"]');
        expect(dot?.getAttribute('cx')).toBe('160');
        expect(dot?.getAttribute('cy')).toBe('48');
        expect(screen.getByRole('img', { name: 'Revenue: 1 period, 2026-04: 140.' })).toBeTruthy();
        expect(within(screen.getByRole('table')).getAllByRole('row')).toHaveLength(2);
    });

    it('a single forecast point is a hollow dot in the muted token, described as forecast', () => {
        const { container } = render(<TrendCard value={payload([month('2026-05', 150, true)])} />);

        const dot = container.querySelector('[data-frame-trend-point="2026-05"]');
        expect(dot?.getAttribute('class')).toContain('fill-background');
        expect(dot?.getAttribute('class')).toContain('text-muted-foreground');
        expect(screen.getByRole('img', { name: 'Revenue: 1 period, 2026-05: 150 (forecast).' })).toBeTruthy();
    });

    it('a flat series draws along the middle rather than an edge', () => {
        const { container } = render(<TrendCard value={payload([month('a', 5), month('b', 5)])} />);

        expect(container.querySelector('[data-frame-trend-segment]')?.getAttribute('points')).toBe('6,48 314,48');
    });

    it('leaves the lead to the overview frame when an overview row already declares a headline', () => {
        const value = payload(ACTUAL, { overview: { headline: { key: 'arr', label: 'ARR', value: 1680 }, items: [] } });
        const row: DashboardRow = { resource: 'exec-revenue', context: 'overview', label: 'Revenue', href: '/exec/exec-revenue', summary: value };
        const { container } = render(<TrendCard value={value} row={row} />);

        expect(container.querySelector('[data-frame-trend-lead]')).toBeNull();
        expect(container.querySelector('[data-frame-card-heading]')?.getAttribute('href')).toBe('/exec/exec-revenue');
    });
});
