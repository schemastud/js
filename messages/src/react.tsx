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
    /**
     * The catalog for this subtree, or `null` for "none served here": the provider then re-provides the outer
     * provider's options unchanged (same object, so consumers don't re-render) and `pseudo` is ignored — the outer
     * setting is inherited. At the root, `null` behaves exactly like no provider.
     */
    value: ClientCatalog | null;
    /** Pseudo-localize this subtree's lines. Ignored when `value` is `null` (the outer setting applies). */
    pseudo?: boolean;
    children: ReactNode;
}

/**
 * The context identity is shared; catalog values remain confined to this render tree. Always renders the same
 * Provider element, so switching `value` between a catalog and `null` never remounts the subtree.
 */
export function MessageProvider({ value, pseudo = false, children }: MessageProviderProps) {
    const outer = useContext(shared.context);
    const own = useMemo(() => (value === null ? null : { catalog: value, pseudo }), [value, pseudo]);
    return createElement(shared.context.Provider, { value: value === null ? outer : own }, children);
}

export function useMessages<const D extends Readonly<Record<string, string>>>(defaults: D) {
    const options = useContext(shared.context);
    return useMemo(() => createMessages(defaults, options ?? {}), [defaults, options]);
}

export function useMessageLocale(): string {
    return useContext(shared.context)?.catalog?.locale ?? 'en-US';
}

export { RichMessage, richMessage, type RichMessageProps } from './rich-message';
