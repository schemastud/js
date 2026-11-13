// @vitest-environment jsdom
import React from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { MessageProvider } from '@schemastud/messages/react';
import { formatMoney } from '../src/money';
import { MoneyFormatProvider, useMoneyFormat } from '../src/money-context';

afterEach(cleanup);

describe('formatMoney', () => {
    it.each([
        [0, '$0.00'], [-0, '$0.00'], [0.000029, '$0.000029'],
        [0.0049, '$0.0049'], [0.005, '$0.005'], [-0.001, '-$0.001'], [1234.5, '$1,234.50'],
    ])('keeps cost precision for %s', (value, text) => {
        expect(formatMoney(value, { mode: 'cost' })).toBe(text);
    });

    it('rounds charges to minor units while rates keep sub-cent precision', () => {
        expect(formatMoney(0.0049, { mode: 'charge' })).toBe('$0.00');
        expect(formatMoney(0.005, { mode: 'charge' })).toBe('$0.01');
        expect(formatMoney(0.000029, { mode: 'rate' })).toBe('$0.000029');
    });

    it('uses the declared currency, locale and optional precision override', () => {
        expect(formatMoney(1234.5, {}, { currency: 'JPY', locale: 'en-US' })).toBe('¥1,235');
        expect(formatMoney(1234.5, {}, { currency: 'EUR', locale: 'de-DE' })).toBe('1.234,50 €');
        expect(formatMoney(1.2, {}, { currency: 'USD', locale: 'en-US', minorDigits: 3 })).toBe('$1.200');
    });

    it('uses supplied facts for zero wording instead of inferring a free or unpriced amount', () => {
        expect(formatMoney(0, { price: true })).toBe('Free');
        expect(formatMoney(-0, { price: true })).toBe('Free');
        expect(formatMoney(0, { mode: 'cost', basis: 'unpriced' })).toBe('Not priced');
        expect(formatMoney(0, { mode: 'cost', basis: 'priced' })).toBe('$0.00');
        expect(formatMoney(0, { mode: 'cost', basis: 'replayed' })).toBe('$0.00 · replayed');
        expect(formatMoney(0)).toBe('$0.00');
        expect(formatMoney(3, { price: true })).toBe('$3.00');
    });

    it('distinguishes an explicit unknown pricing fact from an omitted basis', () => {
        expect(formatMoney(0, { mode: 'cost', basis: null })).toBe('Pricing unknown');
        expect(formatMoney(1.25, { mode: 'cost', basis: null })).toBe('Pricing unknown');
        expect(formatMoney(0, { basis: undefined })).toBe('$0.00');
    });

    it('names the configured precision floor without falsely displaying zero', () => {
        const format = { currency: 'USD', locale: 'en-US', costMaxDigits: 4 };
        expect(formatMoney(0.000029, { mode: 'cost' }, format)).toBe('less than $0.0001');
        expect(formatMoney(0.000029, { mode: 'rate' }, format)).toBe('less than $0.0001');
        expect(formatMoney(-0.000029, { mode: 'cost' }, format)).toBe('greater than -$0.0001');
        expect(formatMoney(0.00006, { mode: 'cost' }, format)).toBe('$0.0001');
    });

    it('rejects non-finite amounts and invalid precision rather than inventing a zero', () => {
        expect(() => formatMoney(NaN)).toThrow(RangeError);
        expect(() => formatMoney(Infinity)).toThrow(RangeError);
        expect(() => formatMoney(1, {}, { currency: 'USD', locale: 'en-US', costMaxDigits: -1 })).toThrow(RangeError);
    });
});

it('binds the served format once and updates consumers when the provider changes', () => {
    function Amount() {
        const money = useMoneyFormat();
        return <span>{money(0.0049, { mode: 'cost' })}</span>;
    }
    const { rerender, container } = render(<MoneyFormatProvider value={{ currency: 'USD', locale: 'en-US' }}><Amount /></MoneyFormatProvider>);
    expect(screen.getByText('$0.0049')).toBeTruthy();
    rerender(<MoneyFormatProvider value={{ currency: 'EUR', locale: 'de-DE' }}><Amount /></MoneyFormatProvider>);
    expect(container.textContent).toBe('0,0049 €');
});

it('uses explicit money locale, then the message locale, then en-US without inferring currency', () => {
    function Amount() { return <span>{useMoneyFormat()(1234.5)}</span>; }
    const catalog = { version: 1 as const, locale: 'de-DE', realm: null, direction: 'ltr' as const, messages: {} };
    const { container, rerender } = render(<MessageProvider value={catalog}><Amount /></MessageProvider>);
    expect(container.textContent).toBe('1.234,50 $');
    rerender(<MessageProvider value={catalog}><MoneyFormatProvider value={{ currency: 'EUR' }}><Amount /></MoneyFormatProvider></MessageProvider>);
    expect(container.textContent).toBe('1.234,50 €');
    rerender(<MessageProvider value={catalog}><MoneyFormatProvider value={{ currency: 'EUR', locale: 'en-US' }}><Amount /></MoneyFormatProvider></MessageProvider>);
    expect(container.textContent).toBe('€1,234.50');
    rerender(<Amount />);
    expect(container.textContent).toBe('$1,234.50');
    expect(formatMoney(1234.5, {}, { currency: 'EUR' })).toBe('€1,234.50');
});

it('localizes complete money messages and updates the public hook without a remount', () => {
    function Amounts() {
        const money = useMoneyFormat();
        return <output>{[
            money(1, { basis: null }),
            money(1, { basis: 'unpriced' }),
            money(0, { price: true }),
            money(2, { basis: 'replayed' }),
            money(0.00000001, { mode: 'cost' }),
            money(-0.00000001, { mode: 'cost' }),
            money(0.00000001, { mode: 'cost', basis: 'replayed' }),
            money(-0.00000001, { mode: 'cost', basis: 'replayed' }),
        ].join('|')}</output>;
    }
    const translations = {
        'schemastud-ui::messages.money.pricing_unknown': { text: 'Precio desconocido', sourceLocale: 'es' },
        'schemastud-ui::messages.money.not_priced': { text: 'Sin precio', sourceLocale: 'es' },
        'schemastud-ui::messages.money.free': { text: 'Gratis', sourceLocale: 'es' },
        'schemastud-ui::messages.money.replayed': { text: 'Repetido: :amount', sourceLocale: 'es' },
        'schemastud-ui::messages.money.less_than': { text: 'Menos de :amount', sourceLocale: 'es' },
        'schemastud-ui::messages.money.greater_than': { text: 'Más de :amount', sourceLocale: 'es' },
        'schemastud-ui::messages.money.less_than_replayed': { text: 'Repetido por debajo de :amount', sourceLocale: 'es' },
        'schemastud-ui::messages.money.greater_than_replayed': { text: 'Repetido por encima de :amount', sourceLocale: 'es' },
    };
    const value = { version: 1 as const, locale: 'en-US', realm: null, direction: 'ltr' as const, messages: translations };
    const { container, rerender } = render(<MessageProvider value={value}><Amounts /></MessageProvider>);
    const output = container.querySelector('output');
    expect(output?.textContent).toBe('Precio desconocido|Sin precio|Gratis|Repetido: $2.00|Menos de $0.000001|Más de -$0.000001|Repetido por debajo de $0.000001|Repetido por encima de -$0.000001');
    rerender(<MessageProvider value={{ ...value, messages: {} }}><Amounts /></MessageProvider>);
    expect(container.querySelector('output')).toBe(output);
    expect(output?.textContent).toBe('Pricing unknown|Not priced|Free|$2.00 · replayed|less than $0.000001|greater than -$0.000001|less than $0.000001 · replayed|greater than -$0.000001 · replayed');
});

it('keeps provider-free public money-hook English byte-identical to the standalone formatter', () => {
    const cases: Array<[number, Parameters<typeof formatMoney>[1], string]> = [
        [1, { basis: null }, 'Pricing unknown'],
        [1, { basis: 'unpriced' }, 'Not priced'],
        [0, { price: true }, 'Free'],
        [2, { basis: 'replayed' }, '$2.00 · replayed'],
        [0.00000001, { mode: 'cost' }, 'less than $0.000001'],
        [-0.00000001, { mode: 'cost' }, 'greater than -$0.000001'],
        [0.00000001, { mode: 'cost', basis: 'replayed' }, 'less than $0.000001 · replayed'],
        [-0.00000001, { mode: 'cost', basis: 'replayed' }, 'greater than -$0.000001 · replayed'],
        [-0, {}, '$0.00'],
    ];
    function Amounts() {
        const money = useMoneyFormat();
        return <output>{cases.map(([amount, options]) => money(amount, options)).join('|')}</output>;
    }
    const { container } = render(<Amounts />);
    expect(container.textContent).toBe(cases.map(([, , expected]) => expected).join('|'));
    for (const [amount, options, expected] of cases) expect(formatMoney(amount, options)).toBe(expected);
});
