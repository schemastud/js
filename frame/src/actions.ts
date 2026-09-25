import type { ContextManifest } from './contexts';
import type { FrameTransport, ResourceActionDefinition, Row } from './types';

/**
 * A non-2xx answer to an action's request, carrying what the shell shows: the server's `message` and, on
 * a 422, the per-field `errors`. A host transport's `write` throws this so the action UI can tell a
 * validation refusal (show it on the form) from any other refusal (show the message).
 */
export class FrameActionError extends Error {
    readonly status: number;
    readonly errors: Record<string, string[]>;
    readonly body: unknown;

    constructor(status: number, body: unknown, fallback = `The request failed (${status}).`) {
        const envelope = (body && typeof body === 'object' ? body : {}) as {
            message?: unknown;
            errors?: unknown;
        };
        super(typeof envelope.message === 'string' && envelope.message !== '' ? envelope.message : fallback);
        this.name = 'FrameActionError';
        this.status = status;
        this.body = body;
        this.errors =
            envelope.errors && typeof envelope.errors === 'object'
                ? (envelope.errors as Record<string, string[]>)
                : {};
    }
}

/**
 * The actions of one scope this ACTOR may press, in declared order (ADR-0005).
 *
 * Two gates, both from the manifest: the resource must DECLARE the action, and the per-actor
 * `can.actions[key]` must be `true`. Absent or `false` hides it — deny-while-unknown, the same posture a
 * host's `can` takes for the CRUD verbs — because a button that 403s teaches the reader the screen is
 * broken. The action's own URL is still the enforcement.
 *
 * A transport that cannot `invoke`, or cannot fetch the form of an action that has one, hides the
 * action too: a button that cannot send is worse than none.
 */
export function resolveActions(
    manifest: ContextManifest | undefined,
    scope: ResourceActionDefinition['scope'],
    transport?: Pick<FrameTransport, 'invoke' | 'getActionSchema'>,
): ResourceActionDefinition[] {
    const declared = manifest?.actions ?? [];
    const allowed = manifest?.can?.actions ?? {};

    return declared.filter(
        (action) =>
            action.scope === scope &&
            allowed[action.key] === true &&
            (!transport ||
                (typeof transport.invoke === 'function' &&
                    (action.input === null || typeof transport.getActionSchema === 'function'))),
    );
}

/** The action's URL for this record — `{id}` filled (encoded) for a record action; a resource action's URL as-is. */
export function actionUrl(action: ResourceActionDefinition, id?: string | null): string {
    if (action.scope !== 'record') return action.url;

    return action.url.replace('{id}', encodeURIComponent(String(id ?? '')));
}

/** The id a `navigate` result opens: the response's `data.id`, else the acted-on record's. */
export function navigateTarget(result: { data?: unknown } | undefined, record?: Row): string | null {
    const data = result?.data as { id?: unknown } | null | undefined;
    const id = data && typeof data === 'object' && data.id != null ? data.id : record?.id;

    return id == null || id === '' ? null : String(id);
}
