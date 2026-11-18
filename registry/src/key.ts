import { SEPARATOR, matchSegments } from './grammar';

/**
 * A registry key as it is carried: its segments, outermost first, and the string to show for it.
 *
 * Identity is the segments. `display` is for showing and is never parsed back into a key: a key
 * that is not dot-separated (a URI, say) has a display string this package's grammar would refuse
 * or split wrongly.
 */
export interface RegistryKey {
    readonly segments: readonly string[];
    readonly display: string;
}

/** Thrown when a string is not a legal key, or a carried key has no segments. */
export class InvalidRegistryKey extends Error {
    override readonly name = 'InvalidRegistryKey';
}

// Marks a canonical key so that one built by another copy of this package is still recognised.
// `instanceof` fails across two copies in one bundle; a registered symbol is the same in both.
const CANONICAL = Symbol.for('@schemastud/registry/canonical-key');

/**
 * The canonical key: dot-separated lowercase segments, `beam.realm.overlays`.
 *
 * Parsing validates and never repairs: no case folding, no trimming, no alternate separators. A
 * string is a legal key or it is refused.
 */
export class Key implements RegistryKey {
    readonly segments: readonly string[];

    private constructor(segments: readonly string[]) {
        this.segments = Object.freeze([...segments]);
    }

    /** The key for a string, or a thrown `InvalidRegistryKey`. */
    static parse(input: string): Key {
        const key = Key.tryParse(input);

        if (key === null) {
            throw new InvalidRegistryKey(
                `\`${input}\` is not a legal registry key: expected dot-separated lowercase segments, e.g. \`beam.realm.overlays\`. ` +
                    'Segments may join groups with `-`, `_` or `:`, but never lead, trail or double one, and `/` is not a key character.',
            );
        }

        return key;
    }

    /** The key for a string, or null when the string is not a legal key. */
    static tryParse(input: string): Key | null {
        const segments = matchSegments(input);

        return segments === null ? null : new Key(segments);
    }

    /**
     * The zero-segment key: the root of the whole tree. It displays as the empty string, and this
     * is the only way to get it. `parse('')` throws, because an empty string arriving from config
     * or a request is a mistake, not an address.
     */
    static root(): Key {
        return new Key([]);
    }

    /** A key passes through untouched, whatever its type; a string is parsed. */
    static of(key: RegistryKey | string): RegistryKey {
        return typeof key === 'string' ? Key.parse(key) : key;
    }

    /** True on every canonical key, from this copy of the package or another. Not part of the interface. */
    get [CANONICAL](): true {
        return true;
    }

    /** The dotted rendering. Empty for the root. */
    get display(): string {
        return this.segments.join(SEPARATOR);
    }

    equals(other: RegistryKey): boolean {
        return keysEqual(this, other);
    }

    /** The key one segment shallower, or null for a single-segment key and for the root. */
    parent(): Key | null {
        return this.segments.length < 2 ? null : new Key(this.segments.slice(0, -1));
    }

    /**
     * Whether this key sits strictly below `other`, compared segment by segment: `beam.realms` is
     * not under `beam.realm`, and a key is not under itself. Every key with segments is under the
     * root. A string is parsed, so an illegal one throws.
     */
    isUnder(other: RegistryKey | string): boolean {
        const prefix = Key.of(other).segments;

        if (prefix.length >= this.segments.length) {
            return false;
        }

        return prefix.every((segment, index) => segment === this.segments[index]);
    }

    /**
     * This key as a registry rooted at `root` stores it. A key equal to the root or under it is
     * already absolute and comes back untouched; any other key is relative and gets the root's
     * segments joined onto its front. So it is idempotent, and under the zero-segment root every key
     * comes back untouched.
     *
     * A key that only looks absolute, because it sits under some other root, is read as relative
     * and joined: nothing here can tell that from a typo.
     */
    underRoot(root: Key): Key {
        if (this.equals(root) || this.isUnder(root)) {
            return this;
        }

        return new Key([...root.segments, ...this.segments]);
    }

    toString(): string {
        return this.display;
    }
}

/**
 * The key as this copy's `Key` when it is canonical, or null when it is a carried key. A canonical
 * key from another copy of the package is rebuilt from its segments. Internal: not exported from
 * the package.
 */
export function canonicalKey(key: RegistryKey): Key | null {
    if (key instanceof Key) {
        return key;
    }

    if ((key as { [CANONICAL]?: unknown })[CANONICAL] !== true) {
        return null;
    }

    return key.segments.length === 0 ? Key.root() : Key.parse(key.segments.join(SEPARATOR));
}

/** Whether two keys have the same segments. The display strings are not compared. */
export function keysEqual(a: RegistryKey, b: RegistryKey): boolean {
    return a.segments.length === b.segments.length && a.segments.every((segment, index) => segment === b.segments[index]);
}

/**
 * A key that is not in the canonical grammar, carried as the segments and display string it
 * arrived with. Neither is validated against the grammar and the display is never parsed. It must
 * have at least one segment: the zero-segment root comes only from `Key.root()`.
 */
export function foreignKey(segments: readonly string[], display: string): RegistryKey {
    if (segments.length === 0) {
        throw new InvalidRegistryKey('A carried key needs at least one segment. The zero-segment root is `Key.root()`.');
    }

    return Object.freeze({ segments: Object.freeze([...segments]), display });
}
