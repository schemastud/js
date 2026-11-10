import { useMutation, useQueryClient } from '@tanstack/react-query';
import { transportScope } from '@schemastud/facets';
import { resolveActions } from './actions';
import type { ContextManifest } from './contexts';
import { useFrameInjection } from './context';
import { resourceQueryKey } from './data';
import type { ActionInputOf, ActionKeyOf, ResourceKey } from './resources';
import type { ActionResult, ResourceActionDefinition } from './types';

/** What `useResourceAction` returns: the declared action, and a call typed by its registered input. */
export interface ResourceActionCall<K extends ResourceKey = ResourceKey, A extends ActionKeyOf<K> = ActionKeyOf<K>> {
    /**
     * The declared action of either scope that this actor may press (`manifest.can.actions`), provided the transport
     * can `invoke`. `undefined` otherwise. A transport without `getActionSchema` still counts: the host's dialog is
     * the form.
     */
    definition: ResourceActionDefinition | undefined;
    available: boolean;
    /**
     * Typed by the registration: a confirm-only action's input is `null`. Never rejects: it resolves the result, or
     * `undefined` on a refusal, which `error` holds. A record action called without an `id` is refused there and
     * never reaches the transport.
     */
    invoke(target: { id?: string | null; data: ActionInputOf<K, A> }): Promise<ActionResult | undefined>;
    pending: boolean;
    /** The refusal: a `FrameActionError` carries the server's message and a 422's field errors. */
    error: Error | null;
    result: ActionResult | undefined;
    reset(): void;
}

/**
 * A declared action as a typed call (ruling 03 slice 5), over `transport.invoke`: a host dialog that sends a payload
 * other than the action's registered input does not compile. On success it refetches the resource's reads in this
 * transport's cache scope, as frame's own action buttons and a save do. It notifies, navigates and opens no form:
 * those are the dialog's. It reads the manifest as the shells do (`manifestFor` from the injection) unless one is
 * handed in.
 */
export function useResourceAction<K extends ResourceKey = ResourceKey, A extends ActionKeyOf<K> = ActionKeyOf<K>>(
    resource: K,
    action: A,
    options: { manifest?: ContextManifest } = {},
): ResourceActionCall<K, A> {
    const { transport, manifestFor } = useFrameInjection();
    const queryClient = useQueryClient();
    const manifest = options.manifest ?? manifestFor?.(resource);
    // Declared and allowed (either scope, record first), and the transport can send it. Not the shell button's
    // predicate: that also asks for `getActionSchema`, which only frame's own generated form needs.
    const definition =
        typeof transport.invoke === 'function'
            ? [...resolveActions(manifest, 'record'), ...resolveActions(manifest, 'resource')].find(
                  (declared) => declared.key === action,
              )
            : undefined;

    const mutation = useMutation<ActionResult, Error, { id?: string | null; data: unknown }>({
        // The key frame's own action button uses, so `useIsMutating` sees both.
        mutationKey: resourceQueryKey(transport, resource, 'action', action),
        mutationFn: (target) => {
            if (!definition || !transport.invoke) {
                return Promise.reject(new Error(`The action "${action}" is not available here.`));
            }
            // A record action's URL carries `{id}`: without one it would be sent to `…//${action}`.
            if (definition.scope === 'record' && (target.id === undefined || target.id === null || target.id === '')) {
                return Promise.reject(new Error(`The record action "${action}" needs the record's id.`));
            }
            // The transport's own error (a `FrameActionError`, with its request URL on `cause`) passes through unwrapped.
            return transport.invoke(definition, { id: target.id ?? null, data: target.data });
        },
        onSuccess: () => {
            // The declared default: refetch everything this resource's reads hold, in this transport's cache scope.
            void queryClient.invalidateQueries({
                queryKey: ['frame', resource],
                predicate: (query) => query.queryKey.at(-1) === transportScope(transport),
            });
        },
    });

    return {
        definition,
        available: definition !== undefined,
        // Never rejects: the refusal is on `error`, so a host form keeps no error state of its own.
        invoke: (target) => mutation.mutateAsync(target).catch(() => undefined),
        pending: mutation.isPending,
        error: mutation.error ?? null,
        result: mutation.data,
        reset: mutation.reset,
    };
}
