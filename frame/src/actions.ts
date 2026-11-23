import type { ContextManifest } from './contexts';
import { getFrameActionTransportDiagnostic } from './actionDiagnostics';
import type { FrameTransport, ResourceActionDefinition, Row } from './types';

// FrameActionError lives with the session request (ticket 48), which imports nothing; the root still exports it from here.
export { FrameActionError } from './session';

// A resource can be resolved on every render. Keep the warning once per resource key,
// with weak transport keys so this module retains neither transports nor their resource sets.
const warnedResourcesByTransport = new WeakMap<object, Set<string>>();

function warnIfActionsCannotBeInvoked(
    manifest: ContextManifest | undefined,
    resource: string,
    transport: Pick<FrameTransport, 'invoke' | 'getActionSchema'> | undefined,
): void {
    if (!manifest || !transport || typeof window === 'undefined') return;

    const diagnostic = getFrameActionTransportDiagnostic(transport, manifest);
    if (!diagnostic) return;

    let warnedResources = warnedResourcesByTransport.get(transport);
    if (!warnedResources) {
        warnedResources = new Set<string>();
        warnedResourcesByTransport.set(transport, warnedResources);
    }
    if (warnedResources.has(resource)) return;

    warnedResources.add(resource);
    console.warn(
        `@schemastud/frame: declared actions cannot be invoked by this transport (${diagnostic.actionKeys.join(', ')}).`,
        diagnostic,
    );
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
    resource: string,
    scope: ResourceActionDefinition['scope'],
    transport?: Pick<FrameTransport, 'invoke' | 'getActionSchema'>,
): ResourceActionDefinition[] {
    warnIfActionsCannotBeInvoked(manifest, resource, transport);

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
