/** Host-declared presentation only. Amounts remain in currency units, never integer cents. */
export interface MoneyFormat {
    currency: string;
    locale: string;
    minorDigits?: number;
    costMaxDigits?: number;
}

export type MoneyMode = 'charge' | 'cost' | 'rate';
export type MoneyBasis = 'priced' | 'unpriced' | 'replayed';

export interface MoneyOptions {
    mode?: MoneyMode;
    /** Only a price (plan/offer/listing) of zero is Free. A recorded zero is an amount. */
    price?: boolean;
    /** Supplied by the row; never inferred from an amount or a missing model. */
    basis?: MoneyBasis;
}

export const defaultMoneyFormat: Readonly<MoneyFormat> = {
    currency: 'USD', locale: 'en-US', costMaxDigits: 6,
};

/** Charge rounding is presentation, not accounting. Cost/rate never hide a nonzero under the cap. */
export function formatMoney(amount: number, options: MoneyOptions = {}, format: MoneyFormat = defaultMoneyFormat): string {
    if (!Number.isFinite(amount)) throw new RangeError('Money amount must be finite');
    const currency = new Intl.NumberFormat(format.locale, { style: 'currency', currency: format.currency });
    const minor = format.minorDigits ?? currency.resolvedOptions().maximumFractionDigits;
    const cap = format.costMaxDigits ?? 6;
    for (const digits of [minor, cap]) {
        if (!Number.isInteger(digits) || digits < 0 || digits > 20) throw new RangeError('Money digits must be an integer from 0 to 20');
    }
    if (options.basis === 'unpriced') return 'Not priced';
    if (amount === 0 && options.price) return 'Free';

    const precise = options.mode === 'cost' || options.mode === 'rate';
    const max = precise ? cap : minor;
    const number = new Intl.NumberFormat(format.locale, {
        style: 'currency', currency: format.currency,
        minimumFractionDigits: Math.min(minor, max), maximumFractionDigits: max,
    });
    const replay = options.basis === 'replayed' ? ' · replayed' : '';
    // A nonzero below half the final place would round to zero. Name its magnitude instead.
    if (precise && amount !== 0 && Math.abs(amount) < 0.5 * 10 ** -max) {
        const floor = number.format((amount < 0 ? -1 : 1) * 10 ** -max);
        return `${amount < 0 ? 'greater than' : 'less than'} ${floor}${replay}`;
    }
    // Suppress both IEEE -0 and a negative charge that rounds to zero at the minor unit.
    const value = amount === 0 || (!precise && Math.abs(amount) < 0.5 * 10 ** -minor) ? 0 : amount;
    return `${number.format(value)}${replay}`;
}
