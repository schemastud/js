// @vitest-environment jsdom
import React from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
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
    const { rerender } = render(<MoneyFormatProvider value={{ currency: 'USD', locale: 'en-US' }}><Amount /></MoneyFormatProvider>);
    expect(screen.getByText('$0.0049')).toBeTruthy();
    rerender(<MoneyFormatProvider value={{ currency: 'EUR', locale: 'de-DE' }}><Amount /></MoneyFormatProvider>);
    expect(screen.getByText('0,0049 €')).toBeTruthy();
});
