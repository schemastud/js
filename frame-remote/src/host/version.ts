/**
 * The SEMVER of the block vocabulary contract — the single source of truth for "which
 * vocabulary a component was built against". This is the CODE-version seam RCP-06 adds:
 * the data-manifest parity (a remote block *names* an allowlisted type) never covered
 * "the component's code targets a DIFFERENT SHAPE of that vocabulary than the host now
 * ships". `vocabulary-spec.ts` owns WHAT the vocabulary is (the type/prop shapes);
 * this module owns WHICH VERSION of that shape the host is currently on.
 *
 * ## The compatibility rule (documented in README + VERIFY, pinned by a test)
 * We version the vocabulary by semver and gate on the MAJOR only:
 *   - **same major** = COMPATIBLE. A minor/patch bump is ADDITIVE ONLY — a new
 *     allowlisted block, a new optional prop, a new capability the host *offers*. A
 *     component built against `2.0` still renders on host `2.7`: everything it names
 *     still exists and still means the same thing.
 *   - **different major** = INCOMPATIBLE. A major bump is the ONLY place a block may be
 *     removed/renamed or a prop's meaning may change. A component built against major N
 *     cannot be trusted to render correctly on major M≠N, so the host must NOT paint it
 *     as if nothing changed (that is the "silent runtime break" RCP-06 forbids).
 *
 * A publisher targets a stable major (`vocabularyMajor` in their manifest) and is
 * guaranteed forward-compatibility across every minor/patch the host ships under it.
 *
 * ## Single-sourced
 * `VOCABULARY_MAJOR` is derived from `VOCABULARY_VERSION` — there is exactly one string
 * to bump. The documented major (README/VERIFY) is pinned to this constant by
 * `version.test.ts`, mirroring the `vocabulary-spec` drift guard: the docs and the code
 * cannot silently disagree about which major publishers may target.
 */

/**
 * The vocabulary contract version, semver. Bump the MAJOR only on a breaking vocabulary
 * change (a removed/renamed block, a changed prop meaning, a removed capability); bump
 * minor/patch for purely additive changes. This is the one string that moves.
 */
export const VOCABULARY_VERSION = '1.0.0' as const;

/**
 * The current vocabulary MAJOR, derived from {@link VOCABULARY_VERSION}. The host
 * compares a component's declared `vocabularyMajor` against THIS number at load time
 * (manifest.ts) — same major renders, different major is refused-or-shimmed.
 */
export const VOCABULARY_MAJOR: number = Number(VOCABULARY_VERSION.split('.')[0]);
