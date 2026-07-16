import type { Row } from './types';

// =============================================================================
// A small registerable hook bus — the host-side `onSubmitted` seam (FC-04). A
// frame surface saves through the transport; a host registers a handler to react
// (invalidate a sibling list, toast, close a panel) WITHOUT frame naming that
// vocabulary. Per-resource keyed, so a handler only hears its own resource.
// =============================================================================

/** The submit context handed to an `onSubmitted` handler alongside the saved record. */
export interface SubmittedContext {
    resource: string;
    mode: 'create' | 'edit';
}

export type SubmittedHandler = (record: Row, ctx: SubmittedContext) => void;

export interface FrameHooks {
    /** Register a handler for a resource's successful submit; returns an unregister fn. */
    onSubmitted(resource: string, handler: SubmittedHandler): () => void;
    /** Fire every handler registered for `resource` with the saved record + context. */
    fireSubmitted(resource: string, record: Row, ctx: SubmittedContext): void;
}

/**
 * Create an isolated hook bus. Handlers are held in a `Map<resource, Set<handler>>`;
 * a resource with no handlers is a silent no-op. `fireSubmitted` iterates a copy so a
 * handler that unregisters mid-fire never mutates the set under iteration.
 */
export function createFrameHooks(): FrameHooks {
    const handlers = new Map<string, Set<SubmittedHandler>>();

    return {
        onSubmitted(resource, handler) {
            let set = handlers.get(resource);
            if (!set) {
                set = new Set();
                handlers.set(resource, set);
            }
            set.add(handler);

            return () => {
                const current = handlers.get(resource);
                if (!current) return;
                current.delete(handler);
                if (current.size === 0) handlers.delete(resource);
            };
        },

        fireSubmitted(resource, record, ctx) {
            const set = handlers.get(resource);
            if (!set) return;
            for (const handler of [...set]) {
                handler(record, ctx);
            }
        },
    };
}
