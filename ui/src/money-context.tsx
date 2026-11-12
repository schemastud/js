import { createContext, useCallback, useContext, type ReactNode } from 'react';
import { useMessageLocale } from '@schemastud/messages/react';
import { defaultMoneyFormat, formatMoney, type MoneyFormat, type MoneyOptions } from './money';

const MoneyContext = createContext<MoneyFormat | null>(null);

/** Mount once in the host shell with the served money format. */
export function MoneyFormatProvider({ value, children }: { value: MoneyFormat; children: ReactNode }) {
    return <MoneyContext.Provider value={value}>{children}</MoneyContext.Provider>;
}

export function useMoneyFormat(): (amount: number, options?: MoneyOptions) => string {
    const supplied = useContext(MoneyContext);
    const messageLocale = useMessageLocale();
    const locale = supplied?.locale ?? messageLocale;
    const format = supplied ?? defaultMoneyFormat;
    return useCallback((amount: number, options: MoneyOptions = {}) => formatMoney(amount, options, { ...format, locale }), [format, locale]);
}
