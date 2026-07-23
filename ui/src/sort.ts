/**
 * The sort vocabulary the DataTable's sortable column headers read and write.
 *
 * A sort is an ordered list of keys, each `field` (ascending) or `-field`
 * (descending), serialized as a single comma-joined `sort` query param — e.g.
 * `sort=-createdAt,name` = createdAt descending then name ascending. This is exactly
 * the shape Spatie query-builder parses, so header state round-trips through one URL
 * param and can never define a competing mechanism.
 *
 * NOTE — shared vocabulary, two homes. This is a byte-for-byte copy of the vocabulary
 * that also lives in `@schemastud/facets` (the facets-bar Sort control). It is copied,
 * not imported, on purpose: `@schemastud/ui` is a lean foundation-primitives package and
 * must not depend on a higher-level *surface* package (facets peer-requires react-query),
 * which would pull that graph into every consumer of a `Button`. These four pure,
 * stable functions are a settled vocabulary; the tiny duplication is the deliberate cost
 * of keeping the primitives package dependency-clean. If the vocabulary ever needs to
 * change, change both — or graduate it into a shared leaf atom (fog for ticket 07).
 */

export interface SortKey {
    /** The `x-sort` field name (never prefixed). */
    field: string;
    desc: boolean;
}

/** Parse a comma-joined `sort` param into its ordered keys. Empty/null → []. */
export function parseSort(sort: string | null | undefined): SortKey[] {
    if (!sort) return [];
    return sort
        .split(',')
        .map((raw) => raw.trim())
        .filter(Boolean)
        .map((raw) =>
            raw.startsWith('-')
                ? { field: raw.slice(1), desc: true }
                : { field: raw, desc: false },
        );
}

/** Serialize ordered keys back to the comma-joined param. Empty → null (clears it). */
export function serializeSort(keys: SortKey[]): string | null {
    if (keys.length === 0) return null;
    return keys.map((k) => (k.desc ? `-${k.field}` : k.field)).join(',');
}

/**
 * Apply a header click to the current keys and return the next ordered list.
 *
 * - Plain click: the field becomes the *sole* sort, cycling asc → desc → cleared
 *   when it's already the only active key; otherwise it replaces the whole sort.
 * - Shift-click (`append`): the field joins/updates the ordered list without
 *   dropping the others, cycling asc → desc → removed in place — its ordinal
 *   position is preserved across the asc→desc toggle.
 */
export function toggleSortKey(keys: SortKey[], field: string, append: boolean): SortKey[] {
    const existing = keys.find((k) => k.field === field);

    if (!append) {
        // Sole-key cycle only when this field is already the entire sort.
        if (keys.length === 1 && existing) {
            return existing.desc ? [] : [{ field, desc: true }];
        }
        return [{ field, desc: false }];
    }

    // Append / multi-column: operate in place.
    if (!existing) {
        return [...keys, { field, desc: false }];
    }
    if (!existing.desc) {
        return keys.map((k) => (k.field === field ? { field, desc: true } : k));
    }
    // Was descending → drop it, keeping the rest in order.
    return keys.filter((k) => k.field !== field);
}

/** The current sort state for one field, for rendering its header affordance. */
export function sortStateFor(
    keys: SortKey[],
    field: string,
): { active: boolean; desc: boolean; index: number } {
    const index = keys.findIndex((k) => k.field === field);
    if (index === -1) return { active: false, desc: false, index: -1 };
    return { active: true, desc: keys[index].desc, index };
}
