import { ClientCatalog, MessageOptions, Messages } from './index.js';
import * as react from 'react';
import { ReactNode } from 'react';

interface MessageProviderProps {
    value: ClientCatalog;
    pseudo?: boolean;
    children: ReactNode;
}
/** The context identity is shared; catalog values remain confined to this render tree. */
declare function MessageProvider({ value, pseudo, children }: MessageProviderProps): react.FunctionComponentElement<react.ProviderProps<MessageOptions | null>>;
declare function useMessages<const D extends Readonly<Record<string, string>>>(defaults: D): Messages<Extract<keyof D, string>>;
declare function useMessageLocale(): string;

export { MessageProvider, type MessageProviderProps, useMessageLocale, useMessages };
