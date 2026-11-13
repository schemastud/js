import { createMessages } from '@schemastud/messages';
import catalog from '../messages.default.json';
import { formatMoneyWithMessages } from './money-internal';

const english = createMessages(catalog.messages);

/** Host-declared presentation only. Amounts remain in currency units, never integer cents. */
export interface MoneyFormat {
    currency: string;
    locale?: string;
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
    basis?: MoneyBasis | null;
}

export const defaultMoneyFormat: Readonly<MoneyFormat> = {
    currency: 'USD', locale: 'en-US', costMaxDigits: 6,
};

/** Charge rounding is presentation, not accounting. Cost/rate never hide a nonzero under the cap. */
export function formatMoney(amount: number, options: MoneyOptions = {}, format: MoneyFormat = defaultMoneyFormat): string {
    return formatMoneyWithMessages(amount, options, format, english.t);
}
