import { createContext, useCallback, useContext, type ReactNode } from 'react';
import { useMessageLocale } from '@schemastud/messages/react';
import { defaultMoneyFormat, type MoneyFormat, type MoneyOptions } from './money';

import { formatMoneyWithMessages } from './money-internal';
import { useUiMessages } from './messages';

const MoneyContext = createContext<MoneyFormat | null>(null);

/** Mount once in the host shell with the served money format. */
export function MoneyFormatProvider({ value, children }: { value: MoneyFormat; children: ReactNode }) {
    return <MoneyContext.Provider value={value}>{children}</MoneyContext.Provider>;
}

export function useMoneyFormat(): (amount: number, options?: MoneyOptions) => string {
    const { t } = useUiMessages();
    const supplied = useContext(MoneyContext);
    const messageLocale = useMessageLocale();
    const locale = supplied?.locale ?? messageLocale;
    const format = supplied ?? defaultMoneyFormat;
    return useCallback((amount: number, options: MoneyOptions = {}) => formatMoneyWithMessages(amount, options, { ...format, locale }, t), [format, locale, t]);
}
