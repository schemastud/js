import { describe, expect, it } from 'vitest';
import { normalizeNullableRefs } from '../src/nullable-refs';
import { createWidgetRegistry } from '../src/registry';
import { buildUiSchema } from '../src/ui-schema';

describe('normalizeNullableRefs', () => {
    it('re-expresses a nullable $ref as anyOf[$ref, null], keeping siblings', () => {
        const normalized = normalizeNullableRefs({
            type: 'object',
            properties: {
                owner: { $ref: '#/$defs/Owner', nullable: true, title: 'Owner' },
                plain: { $ref: '#/$defs/Owner' },
            },
        });

        const properties = normalized.properties as Record<string, Record<string, unknown>>;
        expect(properties.owner).toEqual({
            anyOf: [{ $ref: '#/$defs/Owner' }, { type: 'null' }],
            title: 'Owner',
        });
        expect(properties.plain).toEqual({ $ref: '#/$defs/Owner' });
    });

    it('recurses into nested objects and arrays', () => {
        const normalized = normalizeNullableRefs({
            type: 'object',
            properties: {
                nested: {
                    type: 'object',
                    properties: { ref: { $ref: '#/$defs/Deep', nullable: true } },
                },
                list: { type: 'array', items: { $ref: '#/$defs/Deep', nullable: true } },
            },
        });

        const properties = normalized.properties as Record<string, Record<string, unknown>>;
        const nested = properties.nested.properties as Record<string, Record<string, unknown>>;
        expect(nested.ref.anyOf).toBeDefined();
        expect((properties.list.items as Record<string, unknown>).anyOf).toBeDefined();
    });

    /**
     * The server's `required` is authoritative — the form blocks on exactly what the write path
     * rejects. A nullable property with no default IS required — n=646 of them in the flagship spec
     * as of 2026-08-26, counting every property that appears in its schema's `required` AND admits
     * null (`nullable: true`, a `'null'` member of a type union, or a `'null'` anyOf/oneOf branch),
     * over all 475 object schemas. The retired `relaxNullableRequired()` dropped every one of them.
     */
    it('leaves required untouched, including nullable entries', () => {
        const normalized = normalizeNullableRefs({
            type: 'object',
            required: ['title', 'schemaRef', 'silos'],
            properties: {
                title: { type: 'string' },
                schemaRef: { type: ['string', 'null'] },
                silos: { type: ['array', 'null'] },
            },
        });

        expect(normalized.required).toEqual(['title', 'schemaRef', 'silos']);
    });
});

describe('items-less arrays', () => {
    it('hides arrays without an items definition from the form', () => {
        const ui = buildUiSchema(
            {
                type: 'object',
                properties: {
                    silos: { type: ['array', 'null'] },
                    listed: { type: 'array', items: { type: 'string' } },
                },
            },
            createWidgetRegistry(),
        );

        expect(ui).toEqual({ silos: { 'ui:widget': 'hidden' } });
    });
});
