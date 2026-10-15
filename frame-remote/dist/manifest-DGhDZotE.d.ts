/**
 * The vocabulary *spec* — the single typed declaration of what an author may name.
 *
 * `DEFAULT_ALLOWLIST` (allowlist.tsx) owns the RUNTIME half of the vocabulary: the
 * seven first-party renderers, keyed by type name, each reading a fixed set of props
 * off the reconciled element. This module owns the TYPE half of the SAME vocabulary:
 * for each allowlisted type name, the prop shape an author may pass. Together they are
 * one vocabulary described from two sides — the renderer that reads a prop, and the
 * author-facing type that lets you pass it (with autocomplete) and refuses a prop or a
 * type the host never owns (a compile error).
 *
 * These two halves must not drift. There is no way to make TypeScript derive one prop
 * shape from a `createElement` call, so the alignment is asserted the other way: the
 * key SET here must equal the key set of `DEFAULT_ALLOWLIST`, and that equality is a
 * test (`vocabulary-spec.test.ts`). Add a block to the allowlist without adding its
 * prop shape here (or vice-versa) and the suite fails — the list stays single-sourced.
 *
 * Handler props follow the guest runtime's `on<Event>` convention (runtime.ts): a
 * prop whose value is a function is shipped as a handler *id*, never a function across
 * the wire (protocol.ts). The author declares them as `HandlerProp<Payload>` so the
 * authored callback is typed by the payload the host mints for that event.
 */
/**
 * An event-handler authored prop. Its value is a callback the author writes; the
 * runtime registers it under an id and ships only the id (never the function itself).
 * Typed by the payload shape the host mints when the corresponding browser event fires
 * (see `DEFAULT_ALLOWLIST` renderers' `fire(...)` payloads).
 */
type HandlerProp<Payload = void> = (payload: Payload) => void;
/**
 * The prop shape for each allowlisted block type. Keys MUST match `DEFAULT_ALLOWLIST`
 * exactly (asserted in a test). Each field mirrors a prop the matching renderer reads.
 */
interface BlockProps {
    /** Vertical flex container. `gap` is the row gap in px (renderer default 12). */
    Stack: {
        gap?: number;
    };
    /** A padded, bordered surface. Content-only — no own props read. */
    Card: Record<string, never>;
    /** A section heading. */
    Heading: {
        text?: string;
    };
    /** A paragraph of body copy. */
    Text: {
        text?: string;
    };
    /** A small pill label. */
    Badge: {
        text?: string;
    };
    /** A button. `onClick` fires with no payload (`{}` on the wire). */
    Button: {
        text?: string;
        onClick?: HandlerProp<void>;
    };
    /** A controlled text input. `onInput` fires `{ value }` on each change. */
    TextInput: {
        placeholder?: string;
        value?: string;
        onInput?: HandlerProp<{
            value: string;
        }>;
    };
}
/** The set of allowlisted block type names — the vocabulary keys an author may name. */
type BlockType = keyof BlockProps;
/**
 * The vocabulary type names as a runtime array (source of truth for the drift check).
 * Declared with a `satisfies` so it is impossible to list a name that is not a
 * `BlockType`, and the test asserts the reverse (every `BlockType` is listed and every
 * listed name is in `DEFAULT_ALLOWLIST`).
 */
declare const BLOCK_TYPES: readonly ["Stack", "Card", "Heading", "Text", "Badge", "Button", "TextInput"];

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
type TrustTier = 'first_party' | 'untrusted_publisher';
/**
 * The capability names a component may request. These are the SAME strings the guest
 * passes to `FrameRemote.capability(name, ...)` (runtime.ts) and the broker authorizes
 * against — not a parallel enum. Kept as a string union so a manifest that names an
 * UNKNOWN capability is itself a compile hint, and refused at load if it slips through.
 */
type CapabilityName = 'resolve' | 'read_scoped' | 'request_save';
/** Every capability name, as a runtime set (used to reject an unknown request at load). */
declare const CAPABILITY_NAMES: readonly ["resolve", "read_scoped", "request_save"];
/**
 * The grant table: which capabilities each tier is allowed to request. A capability a
 * tier does not list is REFUSED at load if a manifest declares it. This is the load-time
 * shape of RCP-05's tier boundary:
 *   - `first_party`      → resolve + read + save (the full grant)
 *   - `untrusted_publisher` → resolve + read only (no save — the exact over-ask the
 *     RCP-05 broker refuses per call, here refused before render)
 */
declare const TIER_CAPABILITIES: Record<TrustTier, readonly CapabilityName[]>;
/** True if `name` is a known capability the host defines a grant for. */
declare function isKnownCapability(name: string): name is CapabilityName;
/** True if `tier` is permitted to request capability `name` at load time. */
declare function tierGrants(tier: TrustTier, name: CapabilityName): boolean;

/**
 * What a remote component declares about itself. Ships as DATA the host reads before
 * mounting the guest — never executed as guest code.
 */
interface ComponentManifest {
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
type LoadDecisionKind = 'grant' | 'shim' | 'refuse';
/**
 * A structured load decision — the host's answer BEFORE render. Always present (never a
 * silent pass-through): `grant` proceeds to mount the guest, `shim` paints a host-owned
 * placeholder instead, `refuse` renders nothing and reports why.
 */
interface LoadDecision {
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
interface EvaluateManifestOptions {
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
declare function evaluateManifest(manifest: ComponentManifest, options: EvaluateManifestOptions): LoadDecision;
/**
 * Coerce + validate untrusted manifest input into a `ComponentManifest`, or return a
 * `null` + reason if it is malformed. The host uses this on the raw manifest DATA before
 * `evaluateManifest`. It is intentionally strict: a manifest that omits its major or ships
 * a non-array `capabilities` is not "assumed compatible" — it is a structured refusal.
 */
declare function readManifest(raw: unknown): {
    ok: true;
    manifest: ComponentManifest;
} | {
    ok: false;
    reason: string;
    message: string;
};

export { type BlockType as B, type CapabilityName as C, type EvaluateManifestOptions as E, type HandlerProp as H, type LoadDecision as L, type TrustTier as T, type BlockProps as a, type ComponentManifest as b, BLOCK_TYPES as c, CAPABILITY_NAMES as d, type LoadDecisionKind as e, TIER_CAPABILITIES as f, evaluateManifest as g, isKnownCapability as i, readManifest as r, tierGrants as t };
