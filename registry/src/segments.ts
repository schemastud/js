import type { RegistryKey } from './key';

// Segment comparisons the registry and the index share. Internal: not exported from the package.

/** Strictly below, by segment: `beam.realms` is not below `beam.realm`, and a key is not below itself. */
export function isBelow(key: RegistryKey, prefix: RegistryKey): boolean {
    return prefix.segments.length < key.segments.length && prefix.segments.every((segment, index) => segment === key.segments[index]);
}

/**
 * A key's segments as one string, for use as a `Map` key. Never shown and never parsed back. It is
 * the JSON of the segment list and not the display string, because a carried key's segments may
 * contain any character: `['beam', 'realm']` and `['beam.realm']` display the same.
 */
export function identityOf(key: RegistryKey): string {
    return JSON.stringify(key.segments);
}
