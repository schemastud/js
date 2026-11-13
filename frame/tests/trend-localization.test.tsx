import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, expect, it } from 'vitest';
import { MessageProvider } from '@schemastud/messages/react';
import { TrendCard, describeTrend, trendSeries } from '../src/cards/TrendCard';

afterEach(cleanup);
const figures = [
    { key: 'jan', label: 'January', value: 10 },
    { key: 'feb', label: 'February', value: 20, forecast: true },
];

it('trend image title translates the whole forecast sentence with semantic parameters', () => {
    render(<MessageProvider value={{ version: 1, locale: 'es', realm: null, direction: 'ltr', messages: {
        'schemastud-frame::messages.trend.span_forecast': { text: '{1} :label: :shownCount período, :first a :last; previsión :forecast desde :forecastFrom.|[0,*] :label: :shownCount períodos, :first a :last; previsión :forecast desde :forecastFrom.', sourceLocale: 'es' },
    } }}><TrendCard value={{ key: 'revenue', label: 'Revenue', figures }} /></MessageProvider>);
    expect(screen.getByRole('img').textContent).toBe('Revenue: 2 períodos, January a February; previsión 1 desde February.');
});

it('pure trend helper and provider-free chart retain exact English', () => {
    const expected = 'Revenue: 2 periods, January to February; 1 forecast from February.';
    expect(describeTrend('Revenue', trendSeries(figures))).toBe(expected);
    render(<TrendCard value={{ key: 'revenue', label: 'Revenue', figures }} />);
    expect(screen.getByRole('img').textContent).toBe(expected);
});
