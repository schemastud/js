/**
 * The trust TIERS and their capability grants — the load-time authority table RCP-06
 * checks a manifest against.
 *
 * RCP-05 defined two trust tiers conceptually and enforced them PER CALL: the guest
 * holds an injected scoped token, and the server-side broker refuses any capability
 * outside the token's grant when the guest actually invokes it (`vm.ts` /
 * `capability.test.ts`). RCP-06 adds the LOAD-TIME complement (defense in depth): a
 * component *declares* the capabilities it will request in its manifest, and the host
 * checks that declaration against the component's tier BEFORE it ever renders or brokers
 * a call. An `untrusted_publisher` that declares `request_save` is refused at load with a
 * structured reason — it never mounts, never reaches the broker. The two checks are the
 * same trust decision at two moments: the manifest gate is the early, cheap, no-render
 * refusal; the broker is the final, authoritative, per-call refusal.
 *
 * This table is the SINGLE SOURCE for the tier→capability mapping — it is not a fork of
 * a parallel capability list. The capability *names* here are the same strings the guest
 * passes to `FrameRemote.capability(name, ...)` and the broker keys on. The tiers mirror
 * RCP-05's `first_party` (resolve + read + save) and `untrusted_publisher` (resolve +
 * read, no save) grant boundary.
 */

/** The trust tier a host assigns a component when it loads it (RCP-05). */
export type TrustTier = 'first_party' | 'untrusted_publisher';

/**
 * The capability names a component may request. These are the SAME strings the guest
 * passes to `FrameRemote.capability(name, ...)` (runtime.ts) and the broker authorizes
 * against — not a parallel enum. Kept as a string union so a manifest that names an
 * UNKNOWN capability is itself a compile hint, and refused at load if it slips through.
 */
export type CapabilityName = 'resolve' | 'read_scoped' | 'request_save';

/** Every capability name, as a runtime set (used to reject an unknown request at load). */
export const CAPABILITY_NAMES = ['resolve', 'read_scoped', 'request_save'] as const satisfies readonly CapabilityName[];

/**
 * The grant table: which capabilities each tier is allowed to request. A capability a
 * tier does not list is REFUSED at load if a manifest declares it. This is the load-time
 * shape of RCP-05's tier boundary:
 *   - `first_party`      → resolve + read + save (the full grant)
 *   - `untrusted_publisher` → resolve + read only (no save — the exact over-ask the
 *     RCP-05 broker refuses per call, here refused before render)
 */
export const TIER_CAPABILITIES: Record<TrustTier, readonly CapabilityName[]> = {
    first_party: ['resolve', 'read_scoped', 'request_save'],
    untrusted_publisher: ['resolve', 'read_scoped'],
};

/** True if `name` is a known capability the host defines a grant for. */
export function isKnownCapability(name: string): name is CapabilityName {
    return (CAPABILITY_NAMES as readonly string[]).includes(name);
}

/** True if `tier` is permitted to request capability `name` at load time. */
export function tierGrants(tier: TrustTier, name: CapabilityName): boolean {
    return TIER_CAPABILITIES[tier].includes(name);
}
