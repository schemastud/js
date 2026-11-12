import { createContext, createElement, useContext, useMemo, version, type Context, type ReactNode } from 'react';
import { createMessages, type ClientCatalog, type MessageOptions } from './index';

interface SharedContext {
    readonly abi: 1;
    readonly reactVersion: string;
    readonly context: Context<MessageOptions | null>;
}

const identity = Symbol.for('schemastud.messages.context.v1');
const existing: unknown = Reflect.get(globalThis, identity);
function isShared(value: unknown): value is SharedContext {
    return typeof value === 'object' && value !== null && 'abi' in value && value.abi === 1
        && 'reactVersion' in value && value.reactVersion === version
        && 'context' in value && typeof value.context === 'object' && value.context !== null
        && 'Provider' in value.context;
}
if (existing !== undefined && !isShared(existing)) throw new Error('Incompatible messages context ABI or React version');
const shared: SharedContext = isShared(existing) ? existing : {
    abi: 1, reactVersion: version, context: createContext<MessageOptions | null>(null),
};
if (existing === undefined) Reflect.set(globalThis, identity, shared);

export interface MessageProviderProps {
    value: ClientCatalog;
    pseudo?: boolean;
    children: ReactNode;
}

/** The context identity is shared; catalog values remain confined to this render tree. */
export function MessageProvider({ value, pseudo = false, children }: MessageProviderProps) {
    const options = useMemo(() => ({ catalog: value, pseudo }), [value, pseudo]);
    return createElement(shared.context.Provider, { value: options }, children);
}

export function useMessages<const D extends Readonly<Record<string, string>>>(defaults: D) {
    const options = useContext(shared.context);
    return useMemo(() => createMessages(defaults, options ?? {}), [defaults, options]);
}

export function useMessageLocale(): string {
    return useContext(shared.context)?.catalog?.locale ?? 'en-US';
}
