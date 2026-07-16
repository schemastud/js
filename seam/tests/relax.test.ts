import { describe, expect, it } from 'vitest';
import { relaxNullableRequired } from '../src/relax';
import { createWidgetRegistry } from '../src/registry';
import { buildUiSchema } from '../src/ui-schema';

describe('relaxNullableRequired', () => {
    it('drops nullable properties from required, keeping hard requirements', () => {
        const relaxed = relaxNullableRequired({
            type: 'object',
            required: ['title', 'schemaRef', 'silos'],
            properties: {
                title: { type: 'string' },
                schemaRef: { type: ['string', 'null'] },
                silos: { type: ['array', 'null'] },
            },
        });

        expect(relaxed.required).toEqual(['title']);
    });

    it('removes an emptied required array and recurses into nested objects', () => {
        const relaxed = relaxNullableRequired({
            type: 'object',
            properties: {
                nested: {
                    type: 'object',
                    required: ['maybe'],
                    properties: { maybe: { type: ['integer', 'null'] } },
                },
            },
        });

        const nested = (relaxed.properties as Record<string, Record<string, unknown>>).nested;
        expect(nested.required).toBeUndefined();
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
