/**
 * The component MANIFEST + the host's pre-render load gate.
 *
 * "Recipe vs kitchen": a remote component ships a small manifest DECLARING which
 * vocabulary MAJOR it was built against and which capabilities it will request. The host
 * reads this manifest BEFORE it mounts the guest (before a single mutation is applied,
 * before the broker is ever called) and decides: GRANT (render), SHIM (render a safe
 * placeholder instead), or REFUSE (do not render, emit a structured reason).
 *
 * This is a THIN seam over the two existing layers — it forks neither:
 *   - version compatibility reads `VOCABULARY_MAJOR` (version.ts, single-sourced from
 *     the semver'd vocabulary contract);
 *   - capability permission reads `TIER_CAPABILITIES` (tiers.ts, the SAME grant boundary
 *     the RCP-05 broker enforces per call).
 * So the gate cannot drift from what the host actually paints or actually brokers.
 *
 * ## Where the host reads the manifest
 * The manifest travels with the component as data (a small JSON object the loader has
 * before it fetches/evals the guest bundle — e.g. alongside the bundle URL, or a
 * `manifest` export the loader reads first). It is NOT trusted guest code: the host reads
 * it as untrusted input (`readManifest` coerces + validates), decides with
 * `evaluateManifest`, and only on GRANT does it proceed to load the bundle into the VM.
 * Because the decision is made from DATA before any guest code runs, an over-asking or
 * version-mismatched component is stopped without ever executing.
 *
 * ## Refuse vs shim — the policy, and why
 * Both outcomes share the invariant RCP-06 requires: NEVER a silent runtime break — the
 * host always emits a structured decision, and the guest's tree is never painted as if
 * nothing changed. The choice between them:
 *   - **Capability over-ask → always REFUSE.** A component asking for authority beyond
 *     its tier is a trust violation, not a compatibility gap. There is nothing safe to
 *     shim: rendering it "read-only" would be guessing at intent and could still mount a
 *     component written to assume save. Refuse, with the exact tier + capability in the
 *     reason. (This is the load-time twin of the RCP-05 broker's per-call refusal.)
 *   - **Version mismatch → SHIM by default, REFUSE if shimming is disabled.** A wrong
 *     major is a compatibility gap, not a trust breach — the component is trusted-enough,
 *     it just speaks an older/newer vocabulary. A shim is DEFINABLE here: the host owns
 *     the whole paint surface, so it can render a first-party placeholder (a visible dev
 *     "built for vocabulary vX, host is vY" card; in prod, a quiet host-owned fallback)
 *     INSTEAD OF the guest tree. That is strictly safer than painting a guest tree whose
 *     block/prop meanings may have shifted under it. A host that prefers hard failure
 *     sets `allowShim: false` and gets a structured REFUSE instead. Either way the guest
 *     never renders — the mismatch is surfaced, not swallowed.
 */
import { VOCABULARY_MAJOR } from './version.js';
import {
    type TrustTier,
    type CapabilityName,
    isKnownCapability,
    tierGrants,
} from './tiers.js';

/**
 * What a remote component declares about itself. Ships as DATA the host reads before
 * mounting the guest — never executed as guest code.
 */
export interface ComponentManifest {
    /** The vocabulary MAJOR this component was built against (see version.ts). */
    vocabularyMajor: number;
    /** The capabilities this component will request via `FrameRemote.capability(...)`. */
    capabilities: readonly CapabilityName[];
    /**
     * The trust tier the component claims. Advisory only — the HOST decides the tier it
     * actually assigns (a publisher cannot promote itself to `first_party` by declaring
     * it). `evaluateManifest` takes the host-assigned tier as its own argument; this
     * field is carried for provenance/telemetry, never as the authority.
     */
    tier?: TrustTier;
}

/** The three load outcomes. */
export type LoadDecisionKind = 'grant' | 'shim' | 'refuse';

/**
 * A structured load decision — the host's answer BEFORE render. Always present (never a
 * silent pass-through): `grant` proceeds to mount the guest, `shim` paints a host-owned
 * placeholder instead, `refuse` renders nothing and reports why.
 */
export interface LoadDecision {
    readonly kind: LoadDecisionKind;
    /** A stable machine reason code (e.g. `capability_over_ask`, `vocabulary_major_mismatch`). */
    readonly reason?: string;
    /** A human-readable explanation, safe to show in a dev placeholder. */
    readonly message?: string;
    /** The vocabulary major the host is on, for a shim/refuse placeholder. */
    readonly hostMajor: number;
    /** The vocabulary major the component declared. */
    readonly componentMajor: number;
}

export interface EvaluateManifestOptions {
    /** The tier the HOST assigns this component (authority — not the manifest's claim). */
    tier: TrustTier;
    /** The host's current vocabulary major. Defaults to the single-sourced constant. */
    hostMajor?: number;
    /**
     * Whether a version mismatch may be SHIMMED (default true). `false` = a wrong major
     * is a hard REFUSE. Capability over-ask is ALWAYS refused regardless of this flag.
     */
    allowShim?: boolean;
}

/**
 * The pre-render gate. Reads a validated manifest + the host-assigned tier and returns a
 * structured {@link LoadDecision}. Deterministic, side-effect-free — the caller acts on
 * the decision (mount / shim / refuse). Capability is checked FIRST: a trust violation
 * short-circuits before any compatibility consideration.
 */
export function evaluateManifest(
    manifest: ComponentManifest,
    options: EvaluateManifestOptions,
): LoadDecision {
    const hostMajor = options.hostMajor ?? VOCABULARY_MAJOR;
    const componentMajor = manifest.vocabularyMajor;
    const allowShim = options.allowShim ?? true;

    // --- 1. capability permission (trust) — over-ask is ALWAYS a refuse ---
    for (const cap of manifest.capabilities) {
        if (!isKnownCapability(cap)) {
            return {
                kind: 'refuse',
                reason: 'capability_unknown',
                message: `component requests unknown capability "${String(cap)}" — not a host capability`,
                hostMajor,
                componentMajor,
            };
        }
        if (!tierGrants(options.tier, cap)) {
            return {
                kind: 'refuse',
                reason: 'capability_over_ask',
                message:
                    `component (tier "${options.tier}") requests capability "${cap}" beyond its tier — ` +
                    `refused at load before render`,
                hostMajor,
                componentMajor,
            };
        }
    }

    // --- 2. version compatibility — same major renders; mismatch shims-or-refuses ---
    if (componentMajor !== hostMajor) {
        const message =
            `component built for vocabulary major v${componentMajor}, host is on v${hostMajor} — ` +
            (allowShim ? 'painting a host-owned shim instead of the guest tree' : 'refused (shim disabled)');
        return {
            kind: allowShim ? 'shim' : 'refuse',
            reason: 'vocabulary_major_mismatch',
            message,
            hostMajor,
            componentMajor,
        };
    }

    // --- compatible major + in-tier capabilities → render ---
    return { kind: 'grant', hostMajor, componentMajor };
}

/**
 * Coerce + validate untrusted manifest input into a `ComponentManifest`, or return a
 * `null` + reason if it is malformed. The host uses this on the raw manifest DATA before
 * `evaluateManifest`. It is intentionally strict: a manifest that omits its major or ships
 * a non-array `capabilities` is not "assumed compatible" — it is a structured refusal.
 */
export function readManifest(
    raw: unknown,
): { ok: true; manifest: ComponentManifest } | { ok: false; reason: string; message: string } {
    if (raw == null || typeof raw !== 'object') {
        return { ok: false, reason: 'manifest_missing', message: 'no component manifest supplied' };
    }
    const obj = raw as Record<string, unknown>;
    if (typeof obj.vocabularyMajor !== 'number' || !Number.isInteger(obj.vocabularyMajor)) {
        return {
            ok: false,
            reason: 'manifest_no_major',
            message: 'manifest.vocabularyMajor must be an integer',
        };
    }
    if (!Array.isArray(obj.capabilities) || !obj.capabilities.every((c) => typeof c === 'string')) {
        return {
            ok: false,
            reason: 'manifest_bad_capabilities',
            message: 'manifest.capabilities must be an array of capability-name strings',
        };
    }
    const tier = obj.tier;
    const manifest: ComponentManifest = {
        vocabularyMajor: obj.vocabularyMajor,
        capabilities: obj.capabilities as readonly CapabilityName[],
        ...(tier === 'first_party' || tier === 'untrusted_publisher' ? { tier } : {}),
    };
    return { ok: true, manifest };
}
