import type { RegistryKey } from './key';
import { MissReason } from './policy';

/** One entry a failed read considered, with who registered it. */
export interface MissCandidate {
    readonly key: RegistryKey;
    readonly by: string | null;
}

/**
 * A read named a key and did not get one entry back. Thrown by `resolve`; `tryResolve` returns null
 * for it. `reason` says why, and `candidates` lists what was considered when the reason is
 * `ambiguous`.
 */
export class RegistryMiss extends Error {
    override readonly name: string = 'RegistryMiss';

    constructor(
        readonly key: RegistryKey,
        readonly reason: MissReason,
        readonly candidates: readonly MissCandidate[],
        message: string,
    ) {
        super(message);
    }
}

/**
 * Several entries matched and none of them is the answer. A `RegistryMiss`, so a caller that only
 * wants "I did not get my entry" catches the parent. `tryResolve` does not turn it into null.
 */
export class AmbiguousRegistryMatch extends RegistryMiss {
    override readonly name: string = 'AmbiguousRegistryMatch';
}

/**
 * `register` was offered a taken key on a registry that declares `OnKeyDuplicate.Reject`. Not a
 * `RegistryMiss`: nothing was missed, a write was refused. It names both registrants.
 */
export class DuplicateRegistryKey extends Error {
    override readonly name = 'DuplicateRegistryKey';

    constructor(
        readonly key: RegistryKey,
        /** Who made the refused registration. */
        readonly incoming: string | null,
        /** Who registered the entry already at the key. */
        readonly existing: string | null,
    ) {
        super(
            `An entry is already registered under \`${key.display}\`${existing === null ? '' : ` (by ${existing})`}; ` +
                `this registry rejects duplicates rather than overwriting, so the incoming registration${incoming === null ? '' : ` from ${incoming}`} was refused. ` +
                'Two entries under one key need two keys.',
        );
    }
}

/**
 * A key was handed to the index and no described root claims it. Not a `RegistryMiss`: "no such
 * registry" and "no such entry" have different fixes, and catching one must not catch the other.
 */
export class UnregisteredRegistry extends Error {
    override readonly name = 'UnregisteredRegistry';

    constructor(
        readonly key: RegistryKey,
        /** Every root the index holds, its own zero-segment root included. */
        readonly roots: readonly RegistryKey[],
    ) {
        super(
            `No registry claims \`${key.display}\`: no described root is a prefix of it. Described roots are: ` +
                roots.map((root) => (root.segments.length === 0 ? '`` (the index)' : `\`${root.display}\``)).join(', ') +
                '.',
        );
    }
}

export function absentMiss(key: RegistryKey): RegistryMiss {
    return new RegistryMiss(key, MissReason.Absent, [], `No entry registered under \`${key.display}\`.`);
}

export function ambiguousMiss(key: RegistryKey, candidates: readonly MissCandidate[]): AmbiguousRegistryMatch {
    return new AmbiguousRegistryMatch(
        key,
        MissReason.Ambiguous,
        candidates,
        `\`${key.display}\` is ambiguous: ${candidates.length} candidates and no single answer: ` +
            candidates.map((candidate) => `\`${candidate.key.display}\`${candidate.by === null ? '' : ` (by ${candidate.by})`}`).join(', ') +
            '. Name one exactly.',
    );
}

export function unpopulatedMiss(key: RegistryKey, root: RegistryKey): RegistryMiss {
    return new RegistryMiss(
        key,
        MissReason.Unpopulated,
        [],
        `The \`${root.display}\` registry declares itself required and is empty: nothing has registered into it. ` +
            'This is usually a registration that did not run, not a bad key.',
    );
}
