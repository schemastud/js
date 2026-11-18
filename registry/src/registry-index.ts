import { UnregisteredRegistry } from './errors';
import { InvalidRegistryKey, Key, keysEqual, type RegistryKey } from './key';
import { OnKeyDuplicate, PopulationRequirement } from './policy';
import { RegistryStore, type Registry, type RegistryDeclaration, type Superseded } from './registry';
import { identityOf, isBelow } from './segments';

/** The registrant recorded for the index's entry for itself. */
const SELF = '@schemastud/registry';

/**
 * Every described registry, keyed by the root it declares, and the walk that finds which one owns
 * a key.
 *
 * The index is itself a registry, of registries, rooted at the zero-segment root, and it holds
 * itself there. So its `Registry` methods read roots: `keys()` is every described root, `resolve`
 * and `has` take an exact root, `registrantOf` says who described the registry at a root, and
 * `superseded` says which registry a later `describe` of the same root displaced.
 */
export interface RegistryIndex extends Registry<Registry<unknown>> {
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
export function createRegistryIndex(): RegistryIndex {
    return new Index();
}

class Index implements RegistryIndex {
    private readonly registries = new RegistryStore<Registry<unknown>>({
        root: Key.root(),
        onKeyDuplicate: OnKeyDuplicate.Supersede,
        populationRequirement: PopulationRequirement.Required,
        description:
            'Every described registry, keyed by the root of the keyspace it owns. A second registry described at a taken root takes it, and the first is recorded.',
    });

    private readonly owners = new Map<string, object>();

    constructor() {
        this.registries.register(Key.root(), this, SELF);
    }

    get declaration(): RegistryDeclaration {
        return this.registries.declaration;
    }

    describe(registry: Registry<unknown>, by: string, owner?: object): this {
        const root = registry.declaration.root;

        if (root.segments.length === 0) {
            throw new InvalidRegistryKey('Only the index owns the zero-segment root, and it describes itself. A second registry cannot be described there.');
        }

        this.registries.register(root, registry, by);

        // The owner belongs to this describe. A registry that takes a root without naming an owner
        // must not answer with the owner of the one it displaced.
        if (owner === undefined) {
            this.owners.delete(identityOf(root));
        } else {
            this.owners.set(identityOf(root), owner);
        }

        return this;
    }

    routeTo(key: RegistryKey | string): Registry<unknown> | null {
        const routed = Key.of(key);
        let best: RegistryKey | null = null;

        for (const root of this.registries.keys()) {
            const depth = root.segments.length;

            // The zero-segment root is a prefix of every key, so it is a candidate only on an
            // exact match. Otherwise no key could fail to route.
            if (!keysEqual(routed, root) && (depth === 0 || !isBelow(routed, root))) {
                continue;
            }

            if (best === null || depth > best.segments.length) {
                best = root;
            }
        }

        return best === null ? null : this.registries.resolve(best);
    }

    ownerOf(key: RegistryKey | string): Registry<unknown> {
        const registry = this.routeTo(key);

        if (registry === null) {
            throw new UnregisteredRegistry(Key.of(key), this.registries.keys());
        }

        return registry;
    }

    owner(root: RegistryKey | string): object | null {
        const key = Key.of(root);

        return this.owners.get(identityOf(key)) ?? this.registries.tryResolve(key);
    }

    register(key: RegistryKey | string, entry: Registry<unknown>, by: string | null): this {
        this.registries.register(key, entry, by);

        return this;
    }

    has(key: RegistryKey | string): boolean {
        return this.registries.has(key);
    }

    resolve(key: RegistryKey | string): Registry<unknown> {
        return this.registries.resolve(key);
    }

    tryResolve(key: RegistryKey | string): Registry<unknown> | null {
        return this.registries.tryResolve(key);
    }

    matches(key: RegistryKey | string): Registry<unknown>[] {
        return this.registries.matches(key);
    }

    keys(): RegistryKey[] {
        return this.registries.keys();
    }

    registrantOf(key: RegistryKey | string): string | null {
        return this.registries.registrantOf(key);
    }

    superseded(key: RegistryKey | string): Superseded<Registry<unknown>>[] {
        return this.registries.superseded(key);
    }

    keyFor(name: string): RegistryKey {
        return this.registries.keyFor(name);
    }

    names(): string[] {
        return this.registries.names();
    }
}
