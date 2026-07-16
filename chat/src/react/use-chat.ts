/**
 * `useChat` — the React binding over the framework-agnostic core (CH-02). It
 * wraps `createChatCore` in `useSyncExternalStore` so a component re-renders on
 * every snapshot, and exposes the send + session capabilities `<ChatView>` and
 * a `composer(api)` fill consume. This is the ONLY React↔core seam — the core
 * stays framework-agnostic (the `no-react-in-core` guard); this file lives in
 * `./react` and imports core one way.
 */
import { useMemo, useRef, useSyncExternalStore } from 'react';
import { type ChatCore, type ChatCoreOptions, type ChatSnapshot, type ChatTransport, createChatCore } from '../core/index';

/** What `useChat` returns: the live snapshot + the core's capabilities. */
export interface UseChat {
    /** The current folded read-model — re-rendered on every core snapshot. */
    snapshot: ChatSnapshot;
    /** Send a turn through the bound transport. */
    send: ChatCore['send'];
    /** Re-seed in-view history (the hybrid controlled-core hydration seam). */
    hydrate: ChatCore['hydrate'];
    /** Signal "talk to a human" — inert unless the transport routes it. */
    requestHuman: ChatCore['requestHuman'];
    /** The underlying store, for advanced consumers (e.g. imperative subscribe). */
    core: ChatCore;
}

/** Options accepted directly, or a pre-built `ChatCore` to bind to. */
export type UseChatOptions = ChatCoreOptions | { core: ChatCore };

function isPrebuilt(options: UseChatOptions): options is { core: ChatCore } {
    return 'core' in options && !('transport' in options);
}

/**
 * Bind a `ChatCore` to React. Accepts either the core options (a `transport`,
 * plus optional `initialMessages` / `generateId`) or a pre-built `core`. The
 * store is created once (keyed off transport identity for the options form);
 * changing the transport reference mints a fresh core.
 *
 * Overloads keep the common `useChat(transport)` call ergonomic.
 */
export function useChat(transport: ChatTransport): UseChat;
export function useChat(options: UseChatOptions): UseChat;
export function useChat(arg: ChatTransport | UseChatOptions): UseChat {
    const options: UseChatOptions = 'kind' in arg ? { transport: arg as ChatTransport } : (arg as UseChatOptions);

    // Identity the core is memoized on: a pre-built core, else the transport ref.
    const key = isPrebuilt(options) ? options.core : (options as ChatCoreOptions).transport;

    const built = useRef<{ key: unknown; core: ChatCore } | null>(null);
    if (!built.current || built.current.key !== key) {
        built.current = { key, core: isPrebuilt(options) ? options.core : createChatCore(options) };
    }
    const core = built.current.core;

    const snapshot = useSyncExternalStore(
        (onStoreChange) => core.subscribe(onStoreChange),
        () => core.getSnapshot(),
        () => core.getSnapshot(),
    );

    return useMemo(
        () => ({
            snapshot,
            send: core.send,
            hydrate: core.hydrate,
            requestHuman: core.requestHuman,
            core,
        }),
        [snapshot, core],
    );
}
