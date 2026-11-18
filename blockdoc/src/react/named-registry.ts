import { OnKeyDuplicate, createRegistry, type Registry, type RegistryKey } from '@schemastud/registry';

/**
 * One registration a later one displaced, as the kernel recorded it: the entry that was registered under
 * the name, who registered it, and who registered the one that took its place. Internal: each registry
 * maps it to its own public shape.
 */
interface DisplacedEntry<TEntry> {
    readonly entry: TEntry;
    readonly by: string | null;
    readonly supersededBy: string | null;
}

/**
 * The one implementation under blockdoc's skin registry and node-view registry: a name→entry registry
 * over an `@schemastud/registry` kernel registry, answering names exactly as the `Map` it replaces did.
 * Not exported from the package; each registry keeps its own interface and its own miss.
 *
 * - Any string is a name. One that is not a legal registry key (`ContentSection`, `fancy/product`, `''`)
 *   is carried as one segment under the root and never throws; `keyFor` never reads a name as absolute.
 * - `resolve` is `has(key) ? resolve(key) : undefined`. A branch name (`callout`, with `callout.warning`
 *   registered) is not registered and answers `undefined`; the kernel's `tryResolve` would throw for it.
 *   Each caller turns `undefined` into its own miss.
 * - A read handed something that is not a string misses, as a `Map` lookup did.
 * - A duplicate supersedes, declared: the later entry takes the name and the earlier one is recorded.
 */
export function createNamedRegistry<TEntry>(root: string, description: string) {
    const registry: Registry<TEntry> = createRegistry<TEntry>({
        root,
        onKeyDuplicate: OnKeyDuplicate.Supersede,
        description,
    });

    // Null is the miss for a read handed something that is not a string.
    const keyOf = (name: string): RegistryKey | null => (typeof name === 'string' ? registry.keyFor(name) : null);

    return {
        register(name: string, entry: TEntry, by?: string): void {
            // A name that is not a string is registered under its string form. `by` is read defensively: a
            // caller that passes the method as a callback hands it an index.
            registry.register(registry.keyFor(String(name)), entry, typeof by === 'string' ? by : null);
        },
        has(name: string): boolean {
            const key = keyOf(name);

            return key !== null && registry.has(key);
        },
        resolve(name: string): TEntry | undefined {
            const key = keyOf(name);

            return key !== null && registry.has(key) ? registry.resolve(key) : undefined;
        },
        registrant(name: string): string | null {
            const key = keyOf(name);

            return key === null ? null : registry.registrantOf(key);
        },
        superseded(name: string): DisplacedEntry<TEntry>[] {
            const key = keyOf(name);

            return key === null ? [] : registry.superseded(key).map(({ entry, by, supersededBy }) => ({ entry, by, supersededBy }));
        },
    };
}
