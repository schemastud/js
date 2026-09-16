/**
 * Runtime cache identity for an injected transport. Keep the object stable while
 * its authority is stable; replace it when realm, tenant or principal changes.
 * These opaque keys are not a persistent-cache or SSR hydration protocol.
 */
const scopes = new WeakMap<object, string>();

export function transportScope(transport: object): string {
    let scope = scopes.get(transport);
    if (!scope) {
        // getRandomValues also works on HTTP development hosts where randomUUID
        // is unavailable. Random identity avoids collisions with rehydrated keys.
        scope = Array.from(crypto.getRandomValues(new Uint32Array(4)), (n) => n.toString(16)).join(
            '-',
        );
        scopes.set(transport, scope);
    }
    return scope;
}
