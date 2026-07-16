import type { SchemaFetcher, SchemaNode } from './types';

/**
 * Async pre-resolution of EXTERNAL `$ref`s (anything not starting with `#`)
 * through the host-injected fetcher, before the schema reaches RJSF. Local
 * `#/...` refs are left alone — RJSF/AJV resolve those natively.
 *
 * Fetches are memoized per-fetcher via a WeakMap so repeated renders and shared
 * refs hit the network once. A ref that appears inside its own expansion (a
 * cycle) is left as a `$ref` rather than recursing forever; the same ref used
 * in two sibling branches inlines in both.
 */
const cacheByFetcher = new WeakMap<SchemaFetcher, Map<string, Promise<SchemaNode>>>();

function fetchRef(ref: string, fetcher: SchemaFetcher): Promise<SchemaNode> {
    let cache = cacheByFetcher.get(fetcher);
    if (!cache) {
        cache = new Map();
        cacheByFetcher.set(fetcher, cache);
    }

    let pending = cache.get(ref);
    if (!pending) {
        pending = fetcher(ref);
        cache.set(ref, pending);
    }

    return pending;
}

export async function resolveExternalRefs(
    schema: SchemaNode,
    fetcher?: SchemaFetcher,
): Promise<SchemaNode> {
    if (!fetcher) return schema;

    async function walk(node: unknown, ancestry: ReadonlySet<string>): Promise<unknown> {
        if (Array.isArray(node)) {
            return Promise.all(node.map((item) => walk(item, ancestry)));
        }
        if (!node || typeof node !== 'object') {
            return node;
        }

        const record = node as SchemaNode;
        const ref = record.$ref;

        if (typeof ref === 'string' && !ref.startsWith('#')) {
            if (ancestry.has(ref)) {
                // Cycle: this ref is already being expanded above us — leave it.
                return record;
            }
            const fetched = await fetchRef(ref, fetcher!);
            const { $ref: _dropped, ...siblings } = record;
            const resolved = (await walk(fetched, new Set([...ancestry, ref]))) as SchemaNode;
            // JSON Schema 2020-12 semantics: siblings of $ref apply alongside it.
            return { ...resolved, ...siblings };
        }

        const out: SchemaNode = {};
        for (const [key, value] of Object.entries(record)) {
            out[key] = await walk(value, ancestry);
        }
        return out;
    }

    return (await walk(schema, new Set())) as SchemaNode;
}
