/**
 * A registry key as it is carried: its segments, outermost first, and the string to show for it.
 *
 * Identity is the segments. `display` is for showing and is never parsed back into a key: a key
 * that is not dot-separated (a URI, say) has a display string this package's grammar would refuse
 * or split wrongly.
 */
interface RegistryKey {
    readonly segments: readonly string[];
    readonly display: string;
}
/** Thrown when a string is not a legal key, or a carried key has no segments. */
declare class InvalidRegistryKey extends Error {
    readonly name = "InvalidRegistryKey";
}
declare const CANONICAL: unique symbol;
/**
 * The canonical key: dot-separated lowercase segments, `beam.realm.overlays`.
 *
 * Parsing validates and never repairs: no case folding, no trimming, no alternate separators. A
 * string is a legal key or it is refused.
 */
declare class Key implements RegistryKey {
    readonly segments: readonly string[];
    private constructor();
    /** The key for a string, or a thrown `InvalidRegistryKey`. */
    static parse(input: string): Key;
    /** The key for a string, or null when the string is not a legal key. */
    static tryParse(input: string): Key | null;
    /**
     * The zero-segment key: the root of the whole tree. It displays as the empty string, and this
     * is the only way to get it. `parse('')` throws, because an empty string arriving from config
     * or a request is a mistake, not an address.
     */
    static root(): Key;
    /** A key passes through untouched, whatever its type; a string is parsed. */
    static of(key: RegistryKey | string): RegistryKey;
    /** True on every canonical key, from this copy of the package or another. Not part of the interface. */
    get [CANONICAL](): true;
    /** The dotted rendering. Empty for the root. */
    get display(): string;
    equals(other: RegistryKey): boolean;
    /** The key one segment shallower, or null for a single-segment key and for the root. */
    parent(): Key | null;
    /**
     * Whether this key sits strictly below `other`, compared segment by segment: `beam.realms` is
     * not under `beam.realm`, and a key is not under itself. Every key with segments is under the
     * root. A string is parsed, so an illegal one throws.
     */
    isUnder(other: RegistryKey | string): boolean;
    /**
     * This key as a registry rooted at `root` stores it. A key equal to the root or under it is
     * already absolute and comes back untouched; any other key is relative and gets the root's
     * segments joined onto its front. So it is idempotent, and under the zero-segment root every key
     * comes back untouched.
     *
     * A key that only looks absolute, because it sits under some other root, is read as relative
     * and joined: nothing here can tell that from a typo.
     */
    underRoot(root: Key): Key;
    toString(): string;
}
/** Whether two keys have the same segments. The display strings are not compared. */
declare function keysEqual(a: RegistryKey, b: RegistryKey): boolean;
/**
 * A key that is not in the canonical grammar, carried as the segments and display string it
 * arrived with. Neither is validated against the grammar and the display is never parsed. It must
 * have at least one segment: the zero-segment root comes only from `Key.root()`.
 */
declare function foreignKey(segments: readonly string[], display: string): RegistryKey;

/** What `register` does when the key is already taken. Declared per registry. */
declare const OnKeyDuplicate: {
    /** The later write takes the key, in the earlier one's place in the order. What it displaced is recorded. */
    readonly Supersede: "supersede";
    /** The later write is refused: `register` throws `DuplicateRegistryKey`. */
    readonly Reject: "reject";
    /** Both entries live under the key. `matches` returns both; `resolve` of that key is ambiguous. */
    readonly Admit: "admit";
};
type OnKeyDuplicate = (typeof OnKeyDuplicate)[keyof typeof OnKeyDuplicate];
/** Whether an empty registry is expected. */
declare const PopulationRequirement: {
    /** Empty is a bug: `resolve` on the empty registry misses with `MissReason.Unpopulated`. */
    readonly Required: "required";
    /** Empty is normal. */
    readonly Optional: "optional";
};
type PopulationRequirement = (typeof PopulationRequirement)[keyof typeof PopulationRequirement];
/**
 * Why a read did not produce one entry. The PHP enum has a fourth case, `Filtered`, for an entry an
 * authorizer hid. Nothing in this package authorizes, so it is not here.
 */
declare const MissReason: {
    /** No entry at the key, and none under it. */
    readonly Absent: "absent";
    /** Several entries answer and none is the one: an admitted duplicate, or a key that names a branch. */
    readonly Ambiguous: "ambiguous";
    /** The registry declares itself required and nothing has registered into it. */
    readonly Unpopulated: "unpopulated";
};
type MissReason = (typeof MissReason)[keyof typeof MissReason];

/** One entry a failed read considered, with who registered it. */
interface MissCandidate {
    readonly key: RegistryKey;
    readonly by: string | null;
}
/**
 * A read named a key and did not get one entry back. Thrown by `resolve`; `tryResolve` returns null
 * for it. `reason` says why, and `candidates` lists what was considered when the reason is
 * `ambiguous`.
 */
declare class RegistryMiss extends Error {
    readonly key: RegistryKey;
    readonly reason: MissReason;
    readonly candidates: readonly MissCandidate[];
    readonly name: string;
    constructor(key: RegistryKey, reason: MissReason, candidates: readonly MissCandidate[], message: string);
}
/**
 * Several entries matched and none of them is the answer. A `RegistryMiss`, so a caller that only
 * wants "I did not get my entry" catches the parent. `tryResolve` does not turn it into null.
 */
declare class AmbiguousRegistryMatch extends RegistryMiss {
    readonly name: string;
}
/**
 * `register` was offered a taken key on a registry that declares `OnKeyDuplicate.Reject`. Not a
 * `RegistryMiss`: nothing was missed, a write was refused. It names both registrants.
 */
declare class DuplicateRegistryKey extends Error {
    readonly key: RegistryKey;
    /** Who made the refused registration. */
    readonly incoming: string | null;
    /** Who registered the entry already at the key. */
    readonly existing: string | null;
    readonly name = "DuplicateRegistryKey";
    constructor(key: RegistryKey, 
    /** Who made the refused registration. */
    incoming: string | null, 
    /** Who registered the entry already at the key. */
    existing: string | null);
}
/**
 * A key was handed to the index and no described root claims it. Not a `RegistryMiss`: "no such
 * registry" and "no such entry" have different fixes, and catching one must not catch the other.
 */
declare class UnregisteredRegistry extends Error {
    readonly key: RegistryKey;
    /** Every root the index holds, its own zero-segment root included. */
    readonly roots: readonly RegistryKey[];
    readonly name = "UnregisteredRegistry";
    constructor(key: RegistryKey, 
    /** Every root the index holds, its own zero-segment root included. */
    roots: readonly RegistryKey[]);
}

/** What a registry declares about itself. Fixed when the registry is created. */
interface RegistryDeclaration {
    /**
     * The branch of the keyspace the registry owns. Every canonical key it stores is at or under it.
     * A carried key (`foreignKey`) is stored as given, so it is under the root only when its
     * segments begin with the root's, which is how `keyFor` builds one.
     */
    readonly root: Key;
    readonly onKeyDuplicate: OnKeyDuplicate;
    readonly populationRequirement: PopulationRequirement;
    readonly description: string | null;
}
/** A declaration as a caller writes it. Only the root is required. */
interface RegistryDeclarationInput {
    /** A dotted key such as `frame.routes`, or a parsed `Key`. An illegal string throws. */
    root: Key | string;
    /** Defaults to `OnKeyDuplicate.Supersede`. */
    onKeyDuplicate?: OnKeyDuplicate;
    /** Defaults to `PopulationRequirement.Optional`. */
    populationRequirement?: PopulationRequirement;
    description?: string | null;
}
/** One displaced entry: what was at a key before a later registration took it. History, never read by `resolve` or `matches`. */
interface Superseded<TEntry> {
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
 * with `foreignKey` is stored with exactly the segments it was given: it is under the root only
 * when those segments begin with the root's.
 *
 * Every method that takes a string parses it, so an illegal key string throws `InvalidRegistryKey`
 * before anything is looked up. For a name that may not be a legal key, pass `keyFor(name)`.
 */
interface Registry<TEntry> {
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
    /**
     * The key this registry uses for a name. It never throws, whatever the string. A name that is a
     * legal key is parsed and joined to the root. Any other string (uppercase, a slash, a space, the
     * empty string) becomes one segment under the root, carried as it is: `DocsLayout` in a registry
     * rooted at `beam.ux.chrome.layouts` is the key with segments `[beam, ux, chrome, layouts, DocsLayout]`.
     *
     * A name is never read as absolute. A legal key that is the root or begins with it
     * (`frame.routes.home` in a registry rooted at `frame.routes`) is carried whole as one segment
     * under the root too, so it is a different key from `home`. To address an entry by its absolute
     * key, pass the string or the `Key` itself to `register`, `has` or `resolve`.
     */
    keyFor(name: string): RegistryKey;
    /**
     * The names this registry holds, in registration order, each once: every key with the root
     * taken off the front and the rest joined with dots. The inverse of `keyFor`. An entry at the
     * root itself has the name `''`, and a carried key that is not under the root is named by its
     * display string.
     */
    names(): string[];
}
/**
 * A new, empty registry. The root must have at least one segment: the zero-segment root belongs to
 * the index.
 */
declare function createRegistry<TEntry>(declaration: RegistryDeclarationInput): Registry<TEntry>;

/**
 * Every described registry, keyed by the root it declares, and the walk that finds which one owns
 * a key.
 *
 * The index is itself a registry, of registries, rooted at the zero-segment root, and it holds
 * itself there. So its `Registry` methods read roots: `keys()` is every described root, `resolve`
 * and `has` take an exact root, `registrantOf` says who described the registry at a root, and
 * `superseded` says which registry a later `describe` of the same root displaced.
 */
interface RegistryIndex extends Registry<Registry<unknown>> {
    /**
     * Take a registry into the index at the root it declares. `by` names who is describing it.
     * `owner` is the object a caller thinks of as "the registry" when that is a wrapper around
     * this one; `owner()` hands it back.
     *
     * A second registry described at a taken root takes the root, and the first is recorded:
     * `superseded(root)` returns it with both registrants.
     */
    describe(registry: Registry<unknown>, by: string, owner?: object): this;
    /**
     * The registry whose root is the longest segment prefix of the key, or null when no described
     * root claims it. An exact hit on a root counts. The index's own zero-segment root is a prefix
     * of every key and is never the fallback: it answers only `Key.root()` itself.
     */
    routeTo(key: RegistryKey | string): Registry<unknown> | null;
    /** `routeTo`, throwing `UnregisteredRegistry` in place of null. */
    ownerOf(key: RegistryKey | string): Registry<unknown>;
    /**
     * What is described at exactly this root: the owner object when `describe` was given one,
     * otherwise the registry, and null when nothing is described there. Throws
     * `AmbiguousRegistryMatch` for a key that is not a root but has roots under it.
     */
    owner(root: RegistryKey | string): object | null;
}
/** A new index, holding only itself. */
declare function createRegistryIndex(): RegistryIndex;

/**
 * A key as plain data: its segments and its display. The segments are its identity; the display is
 * for showing only. A reader compares segments and never parses the display back into a key: a name
 * carried under a root (`beam.ux.chrome.layouts.DocsLayout`) is not a legal key in either runtime's
 * grammar, and only its segments say where it sits.
 */
interface KeySnapshot {
    readonly segments: string[];
    readonly display: string;
}
/** One key a registry holds: the key, its name relative to the root (what `names()` gives), and who registered it. */
interface RegistryKeySnapshot {
    readonly key: KeySnapshot;
    readonly name: string;
    /** Who registered the entry at the key. Under `Admit`, the first of them, as `registrantOf` answers. */
    readonly registrant: string | null;
}
/** One described registry: its root, who described it to the index, its declaration and its keys. Never its entries. */
interface RegistrySnapshot {
    readonly root: KeySnapshot;
    /** Who described the registry to the index (`index.registrantOf(root)`). */
    readonly describedBy: string | null;
    readonly declaration: {
        readonly onKeyDuplicate: OnKeyDuplicate;
        readonly populationRequirement: PopulationRequirement;
        readonly description: string | null;
    };
    /** In registration order, each once. */
    readonly keys: RegistryKeySnapshot[];
}
/** What an index holds, as JSON-ready data: every described registry, in the order it was described. */
interface RegistryIndexSnapshot {
    readonly version: 1;
    readonly registries: RegistrySnapshot[];
}
/**
 * What an index holds, as plain data a file can carry and another runtime can read: per described
 * registry, its root, declaration, keys and each key's registrant, and who described it. Entries are
 * left out: they are components or other values with no wire form.
 *
 * The index's own entry at the zero-segment root is left out too. It is the index itself, not a
 * described registry, and its root has no string spelling.
 */
declare function snapshotRegistryIndex(index: RegistryIndex): RegistryIndexSnapshot;

export { AmbiguousRegistryMatch, DuplicateRegistryKey, InvalidRegistryKey, Key, type KeySnapshot, type MissCandidate, MissReason, OnKeyDuplicate, PopulationRequirement, type Registry, type RegistryDeclaration, type RegistryDeclarationInput, type RegistryIndex, type RegistryIndexSnapshot, type RegistryKey, type RegistryKeySnapshot, RegistryMiss, type RegistrySnapshot, type Superseded, UnregisteredRegistry, createRegistry, createRegistryIndex, foreignKey, keysEqual, snapshotRegistryIndex };
