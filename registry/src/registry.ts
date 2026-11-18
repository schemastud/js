import { AmbiguousRegistryMatch, DuplicateRegistryKey, RegistryMiss, absentMiss, ambiguousMiss, unpopulatedMiss } from './errors';
import { InvalidRegistryKey, Key, keysEqual, type RegistryKey } from './key';
import { OnKeyDuplicate, PopulationRequirement } from './policy';
import { identityOf, isBelow } from './segments';

/** What a registry declares about itself. Fixed when the registry is created. */
export interface RegistryDeclaration {
    /** The branch of the keyspace the registry owns. Every key it stores is at or under it. */
    readonly root: Key;
    readonly onKeyDuplicate: OnKeyDuplicate;
    readonly populationRequirement: PopulationRequirement;
    readonly description: string | null;
}

/** A declaration as a caller writes it. Only the root is required. */
export interface RegistryDeclarationInput {
    /** A dotted key such as `frame.routes`, or a parsed `Key`. An illegal string throws. */
    root: Key | string;
    /** Defaults to `OnKeyDuplicate.Supersede`. */
    onKeyDuplicate?: OnKeyDuplicate;
    /** Defaults to `PopulationRequirement.Optional`. */
    populationRequirement?: PopulationRequirement;
    description?: string | null;
}

/** One displaced entry: what was at a key before a later registration took it. History, never read by `resolve` or `matches`. */
export interface Superseded<TEntry> {
    /** The key that was written over. */
    readonly key: RegistryKey;
    /** The displaced entry. */
    readonly entry: TEntry;
    /** Who registered the displaced entry. */
    readonly by: string | null;
    /** Who registered the entry that displaced it. */
    readonly supersededBy: string | null;
    /** The displaced entry's place in the registry's order of writes. Ascending, oldest first. */
    readonly sequence: number;
}

/**
 * A keyed collection with a declared root, a declared duplicate policy and a registrant on every
 * write.
 *
 * Keys go in relative and come out absolute: `register('invoices', …)` on a registry rooted at
 * `beam.resources` stores `beam.resources.invoices`, and a key already at or under the root is left
 * as it is. Only a `Key` (or a string, which is parsed to one) is joined to the root. A key made
 * with `foreignKey` is stored exactly as given.
 *
 * Every method that takes a string parses it, so an illegal key string throws `InvalidRegistryKey`
 * before anything is looked up.
 */
export interface Registry<TEntry> {
    readonly declaration: RegistryDeclaration;

    /**
     * Write an entry. `by` names who is registering it (a package name, say) and is recorded with
     * the entry; pass null only when there is truly nobody to name. What a taken key does is the
     * registry's declared `onKeyDuplicate`. Throws `DuplicateRegistryKey` under `Reject`.
     */
    register(key: RegistryKey | string, entry: TEntry, by: string | null): this;

    /** Whether an entry is registered at exactly this key. */
    has(key: RegistryKey | string): boolean;

    /**
     * The one entry at this key. Throws `RegistryMiss` with a `reason`: `unpopulated` when the
     * registry is required and empty, `absent` when nothing is at or under the key, and
     * `ambiguous` (as `AmbiguousRegistryMatch`) when the key holds several admitted entries or
     * names a branch that has entries under it and none at it. It never walks up to a parent key.
     */
    resolve(key: RegistryKey | string): TEntry;

    /** `resolve`, with null in place of an `absent` or `unpopulated` miss. Ambiguity still throws. */
    tryResolve(key: RegistryKey | string): TEntry | null;

    /**
     * Every entry at or under this key, compared by segment, in registration order. A superseding
     * entry keeps the place of the one it displaced. Displaced entries are not included.
     */
    matches(key: RegistryKey | string): TEntry[];

    /** Every key that holds an entry, absolute, in registration order, each once. */
    keys(): RegistryKey[];

    /** Who registered the entry at exactly this key, or null when there is no entry or it named nobody. With several admitted entries, the first. */
    registrantOf(key: RegistryKey | string): string | null;

    /** What was displaced at exactly this key, oldest first. Always empty unless the registry supersedes. */
    superseded(key: RegistryKey | string): Superseded<TEntry>[];
}

/**
 * A new, empty registry. The root must have at least one segment: the zero-segment root belongs to
 * the index.
 */
export function createRegistry<TEntry>(declaration: RegistryDeclarationInput): Registry<TEntry> {
    const root = typeof declaration.root === 'string' ? Key.parse(declaration.root) : declaration.root;

    if (root.segments.length === 0) {
        throw new InvalidRegistryKey('A registry cannot be rooted at the zero-segment root. Only the index owns it.');
    }

    return new RegistryStore<TEntry>({ ...declaration, root });
}

interface Stored<TEntry> {
    key: RegistryKey;
    entry: TEntry;
    by: string | null;
    sequence: number;
}

/** Not exported from the package: `createRegistry` and `createRegistryIndex` are the ways in. */
export class RegistryStore<TEntry> implements Registry<TEntry> {
    readonly declaration: RegistryDeclaration;

    // One list, held in registration order. A superseding record is put in the place of the
    // one it displaces, so the list's own order is the order every read returns.
    private readonly entries: Stored<TEntry>[] = [];

    private readonly displaced = new Map<string, Superseded<TEntry>[]>();

    private sequence = 0;

    constructor(declaration: Omit<RegistryDeclarationInput, 'root'> & { root: Key }) {
        this.declaration = Object.freeze({
            root: declaration.root,
            onKeyDuplicate: declaration.onKeyDuplicate ?? OnKeyDuplicate.Supersede,
            populationRequirement: declaration.populationRequirement ?? PopulationRequirement.Optional,
            description: declaration.description ?? null,
        });
    }

    register(key: RegistryKey | string, entry: TEntry, by: string | null): this {
        const stored = this.door(key);
        const policy = this.declaration.onKeyDuplicate;
        const occupied = policy === OnKeyDuplicate.Admit ? -1 : this.entries.findIndex((record) => keysEqual(record.key, stored));
        const record: Stored<TEntry> = { key: stored, entry, by, sequence: this.sequence };

        if (occupied === -1) {
            this.entries.push(record);
            this.sequence++;

            return this;
        }

        const occupant = this.entries[occupied] as Stored<TEntry>;

        if (policy === OnKeyDuplicate.Reject) {
            throw new DuplicateRegistryKey(stored, by, occupant.by);
        }

        const identity = identityOf(stored);
        const history = this.displaced.get(identity) ?? [];

        history.push(Object.freeze({ key: occupant.key, entry: occupant.entry, by: occupant.by, supersededBy: by, sequence: occupant.sequence }));
        this.displaced.set(identity, history);
        this.entries[occupied] = record;
        this.sequence++;

        return this;
    }

    has(key: RegistryKey | string): boolean {
        const stored = this.door(key);

        return this.entries.some((record) => keysEqual(record.key, stored));
    }

    resolve(key: RegistryKey | string): TEntry {
        const stored = this.door(key);

        if (this.entries.length === 0 && this.declaration.populationRequirement === PopulationRequirement.Required) {
            throw unpopulatedMiss(stored, this.declaration.root);
        }

        const exact = this.entries.filter((record) => keysEqual(record.key, stored));

        if (exact.length === 1) {
            return (exact[0] as Stored<TEntry>).entry;
        }

        if (exact.length > 1) {
            throw ambiguousMiss(stored, exact.map(candidate));
        }

        // Nothing at the key itself. A key that names a branch is ambiguous, not absent: entries
        // live under it and none of them is what was asked for.
        const below = this.entries.filter((record) => isBelow(record.key, stored));

        if (below.length > 0) {
            throw ambiguousMiss(stored, below.map(candidate));
        }

        throw absentMiss(stored);
    }

    tryResolve(key: RegistryKey | string): TEntry | null {
        try {
            return this.resolve(key);
        } catch (miss) {
            // Ambiguity is a question with several answers, and null would hide a duplicate
            // registration. Only a miss with no answer becomes null.
            if (miss instanceof RegistryMiss && !(miss instanceof AmbiguousRegistryMatch)) {
                return null;
            }

            throw miss;
        }
    }

    matches(key: RegistryKey | string): TEntry[] {
        const stored = this.door(key);

        return this.entries.filter((record) => keysEqual(record.key, stored) || isBelow(record.key, stored)).map((record) => record.entry);
    }

    keys(): RegistryKey[] {
        const keys = new Map<string, RegistryKey>();

        for (const record of this.entries) {
            const identity = identityOf(record.key);

            if (!keys.has(identity)) {
                keys.set(identity, record.key);
            }
        }

        return [...keys.values()];
    }

    registrantOf(key: RegistryKey | string): string | null {
        const stored = this.door(key);

        return this.entries.find((record) => keysEqual(record.key, stored))?.by ?? null;
    }

    superseded(key: RegistryKey | string): Superseded<TEntry>[] {
        return [...(this.displaced.get(identityOf(this.door(key))) ?? [])];
    }

    /** Every key argument's one way in: parse a string, then join a canonical key to the declared root. */
    private door(key: RegistryKey | string): RegistryKey {
        const parsed = Key.of(key);

        return parsed instanceof Key ? parsed.underRoot(this.declaration.root) : parsed;
    }
}

function candidate(record: Stored<unknown>): { key: RegistryKey; by: string | null } {
    return { key: record.key, by: record.by };
}
