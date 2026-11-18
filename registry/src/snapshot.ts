import type { RegistryKey } from './key';
import type { OnKeyDuplicate, PopulationRequirement } from './policy';
import type { RegistryIndex } from './registry-index';

/**
 * A key as plain data: its segments and its display. The segments are its identity; the display is
 * for showing only. A reader compares segments and never parses the display back into a key: a name
 * carried under a root (`beam.ux.chrome.layouts.DocsLayout`) is not a legal key in either runtime's
 * grammar, and only its segments say where it sits.
 */
export interface KeySnapshot {
    readonly segments: string[];
    readonly display: string;
}

/** One key a registry holds: the key, its name relative to the root (what `names()` gives), and who registered it. */
export interface RegistryKeySnapshot {
    readonly key: KeySnapshot;
    readonly name: string;
    /** Who registered the entry at the key. Under `Admit`, the first of them, as `registrantOf` answers. */
    readonly registrant: string | null;
}

/** One described registry: its root, who described it to the index, its declaration and its keys. Never its entries. */
export interface RegistrySnapshot {
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
export interface RegistryIndexSnapshot {
    readonly version: 1;
    readonly registries: RegistrySnapshot[];
}

const keyData = (key: RegistryKey): KeySnapshot => ({ segments: [...key.segments], display: key.display });

/**
 * What an index holds, as plain data a file can carry and another runtime can read: per described
 * registry, its root, declaration, keys and each key's registrant, and who described it. Entries are
 * left out: they are components or other values with no wire form.
 *
 * The index's own entry at the zero-segment root is left out too. It is the index itself, not a
 * described registry, and its root has no string spelling.
 */
export function snapshotRegistryIndex(index: RegistryIndex): RegistryIndexSnapshot {
    const registries: RegistrySnapshot[] = [];

    for (const root of index.keys()) {
        if (root.segments.length === 0) {
            continue;
        }

        const registry = index.resolve(root);
        const { onKeyDuplicate, populationRequirement, description } = registry.declaration;
        const keys = registry.keys();
        // `names()` is `keys()` named relative to the root, one for one and in the same order.
        const names = registry.names();

        registries.push({
            root: keyData(root),
            describedBy: index.registrantOf(root),
            declaration: { onKeyDuplicate, populationRequirement, description },
            keys: keys.map((key, at) => ({ key: keyData(key), name: names[at] ?? key.display, registrant: registry.registrantOf(key) })),
        });
    }

    return { version: 1, registries };
}
