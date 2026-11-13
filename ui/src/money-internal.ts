import type { Messages } from '@schemastud/messages';
import type catalog from '../messages.default.json';
import type { MoneyFormat, MoneyOptions } from './money';

/** Charge rounding is presentation, not accounting. Cost/rate never hide a nonzero under the cap. */
export function formatMoneyWithMessages(amount: number, options: MoneyOptions, format: MoneyFormat, t: Messages<keyof typeof catalog.messages>['t']): string {
    if (!Number.isFinite(amount)) throw new RangeError('Money amount must be finite');
    const currency = new Intl.NumberFormat(format.locale ?? 'en-US', { style: 'currency', currency: format.currency });
    // Intl types allow absent fraction digits; currency defaults normally supply them.
    const minor = format.minorDigits ?? currency.resolvedOptions().maximumFractionDigits ?? 2;
    const cap = format.costMaxDigits ?? 6;
    for (const digits of [minor, cap]) {
        if (!Number.isInteger(digits) || digits < 0 || digits > 20) throw new RangeError('Money digits must be an integer from 0 to 20');
    }
    if (options.basis === null) return t('schemastud-ui::messages.money.pricing_unknown');
    if (options.basis === 'unpriced') return t('schemastud-ui::messages.money.not_priced');
    if (amount === 0 && options.price) return t('schemastud-ui::messages.money.free');

    const precise = options.mode === 'cost' || options.mode === 'rate';
    const max = precise ? cap : minor;
    const number = new Intl.NumberFormat(format.locale ?? 'en-US', {
        style: 'currency', currency: format.currency,
        minimumFractionDigits: Math.min(minor, max), maximumFractionDigits: max,
    });
    const replayed = options.basis === 'replayed';
    // A nonzero below half the final place would round to zero. Name its magnitude instead.
    if (precise && amount !== 0 && Math.abs(amount) < 0.5 * 10 ** -max) {
        const floor = number.format((amount < 0 ? -1 : 1) * 10 ** -max);
        if (amount < 0) return t(replayed ? 'schemastud-ui::messages.money.greater_than_replayed' : 'schemastud-ui::messages.money.greater_than', { amount: floor });
        return t(replayed ? 'schemastud-ui::messages.money.less_than_replayed' : 'schemastud-ui::messages.money.less_than', { amount: floor });
    }
    // Suppress both IEEE -0 and a negative charge that rounds to zero at the minor unit.
    const value = amount === 0 || (!precise && Math.abs(amount) < 0.5 * 10 ** -minor) ? 0 : amount;
    const formatted = number.format(value);
    return replayed ? t('schemastud-ui::messages.money.replayed', { amount: formatted }) : formatted;
}
