/**
 * The FormIntentBus — the generic intent channel for editing surfaces.
 *
 * RJSF onChange stays pure data mutation; intents ("revise this", "enrich
 * that") are a separate, host-routed vocabulary. The bus is a pure formContext
 * sidecar: it names no host vocabulary and never intercepts RJSF internals.
 * Widgets with pending uncommitted state register a flusher so a dispatch can
 * never race a stale document — every dispatch flushes commits first, then
 * notifies handlers.
 */

export interface FormIntent {
    type: string;
    fieldPath: string;
    target?: unknown;
    payload?: unknown;
}

export type FormIntentHandler = (intent: FormIntent) => void | Promise<void>;

export interface FormIntentBus {
    /** Flushes pending commits, then delivers the intent to every handler. */
    dispatch: (intent: FormIntent) => Promise<void>;
    /** Host-side subscription (the intent router); returns an unsubscribe. */
    onIntent: (handler: FormIntentHandler) => () => void;
    /** Widget-side: register a pending-commit flusher; returns an unregister. */
    registerFlush: (flush: () => void) => () => void;
    /** Flush every registered widget's pending commits synchronously. */
    flushCommits: () => void;
}

export function createFormIntentBus(): FormIntentBus {
    const handlers = new Set<FormIntentHandler>();
    const flushers = new Set<() => void>();

    function flushCommits(): void {
        for (const flush of flushers) {
            flush();
        }
    }

    async function dispatch(intent: FormIntent): Promise<void> {
        flushCommits();
        for (const handler of handlers) {
            await handler(intent);
        }
    }

    return {
        dispatch,
        flushCommits,
        onIntent(handler) {
            handlers.add(handler);
            return () => handlers.delete(handler);
        },
        registerFlush(flush) {
            flushers.add(flush);
            return () => flushers.delete(flush);
        },
    };
}
