import type { SchemaNode } from './types';

/**
 * Re-express nullable `$ref`s (`{$ref, nullable: true}` — the OpenAPI idiom
 * laravel-data-schemas emits for a nullable nested Data) as `anyOf[$ref, null]`:
 * AJV rejects `nullable` without a `type` sibling, so the form's validator sees
 * a broken schema otherwise. It is the same transform the server applies for
 * opis.
 *
 * This is a NOTATION fix, not a policy one — nothing here touches `required`.
 * It used to ship inside `relaxNullableRequired()`, which also stripped every
 * nullable property out of `required` to compensate for a server-side defect:
 * laravel-data-schemas marked every non-`Optional` constructor property
 * required, including defaulted ones. That defect is fixed at the source (a
 * defaulted property is now optional on the request axis and required on the
 * response axis), and the compensator was never a faithful inverse of it — it
 * relaxed on NULLABILITY where the real rule is HAS-DEFAULT, so it dropped
 * genuinely-required nullable properties and kept genuinely-optional
 * non-nullable ones. The server's `required` is now authoritative at the form
 * layer; only the `$ref` notation still needs bridging.
 */
export function normalizeNullableRefs(schema: SchemaNode): SchemaNode {
    function walk(node: unknown): unknown {
        if (Array.isArray(node)) return node.map(walk);
        if (!node || typeof node !== 'object') return node;

        let record = { ...(node as SchemaNode) };

        if (typeof record.$ref === 'string' && record.nullable === true) {
            const { $ref, nullable: _nullable, ...siblings } = record;
            record = { anyOf: [{ $ref }, { type: 'null' }], ...siblings };
        }

        for (const [key, value] of Object.entries(record)) {
            record[key] = walk(value);
        }
        return record;
    }

    return walk(schema) as SchemaNode;
}
