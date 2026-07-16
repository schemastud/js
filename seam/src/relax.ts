import type { SchemaNode } from './types';

/**
 * Relax `required` for nullable properties. laravel-data-schemas marks every
 * non-Optional constructor property as required — including nullable ones with
 * null defaults — which makes RJSF block submission on fields the API happily
 * accepts as absent. A property whose type union includes 'null' is treated as
 * optional at the form layer; the write path stays the validation authority.
 *
 * Nullable `$ref`s (`{$ref, nullable: true}` — the OpenAPI idiom the schema
 * generator emits for nullable nested Data) are re-expressed as
 * `anyOf[$ref, null]`: AJV rejects `nullable` without a `type` sibling, the
 * same transform the server applies for opis.
 */
export function relaxNullableRequired(schema: SchemaNode): SchemaNode {
    function walk(node: unknown): unknown {
        if (Array.isArray(node)) return node.map(walk);
        if (!node || typeof node !== 'object') return node;

        let record = { ...(node as SchemaNode) };

        if (typeof record.$ref === 'string' && record.nullable === true) {
            const { $ref, nullable: _nullable, ...siblings } = record;
            record = { anyOf: [{ $ref }, { type: 'null' }], ...siblings };
        }

        const properties = record.properties as Record<string, SchemaNode> | undefined;
        if (properties && Array.isArray(record.required)) {
            record.required = (record.required as string[]).filter((key) => {
                const type = properties[key]?.type;
                return !(Array.isArray(type) && type.includes('null'));
            });
            if ((record.required as string[]).length === 0) {
                delete record.required;
            }
        }

        for (const [key, value] of Object.entries(record)) {
            record[key] = walk(value);
        }
        return record;
    }

    return walk(schema) as SchemaNode;
}
