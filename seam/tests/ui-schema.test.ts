import { describe, expect, it } from 'vitest';
import { createWidgetRegistry } from '../src/registry';
import { buildUiSchema, mergeUiSchema } from '../src/ui-schema';

const registry = createWidgetRegistry();

describe('uiSchema walker', () => {
    it('emits ui:widget only where resolution differs from the RJSF default', () => {
        const ui = buildUiSchema(
            {
                type: 'object',
                properties: {
                    notes: { type: 'string', 'x-widget': 'textarea' },
                    mood: { type: 'string', enum: ['calm', 'urgent'] },
                    title: { type: 'string' },
                    count: { type: 'integer' },
                },
            },
            registry,
        );

        expect(ui).toEqual({
            notes: { 'ui:widget': 'textarea' },
            mood: { 'ui:widget': 'radio' },
        });
    });

    it('maps x-placeholder to ui:placeholder', () => {
        const ui = buildUiSchema(
            {
                type: 'object',
                properties: {
                    email: { type: 'string', format: 'email', 'x-placeholder': 'you@example.com' },
                },
            },
            registry,
        );

        expect(ui).toEqual({ email: { 'ui:placeholder': 'you@example.com' } });
    });

    it('recurses through nested objects and array items', () => {
        const ui = buildUiSchema(
            {
                type: 'object',
                properties: {
                    sections: {
                        type: 'array',
                        items: {
                            type: 'object',
                            properties: {
                                body: { type: 'string', 'x-widget': 'textarea' },
                            },
                        },
                    },
                },
            },
            registry,
        );

        expect(ui).toEqual({
            sections: { items: { body: { 'ui:widget': 'textarea' } } },
        });
    });

    it('hides a shapeless nested array reached only behind a local $ref', () => {
        // The item-less-array guard must reach a field defined inside a $def and
        // referenced by $ref (RJSF resolves the ref for the real form, so the
        // uiSchema has to mirror the resolved shape at the data path). Prior to the
        // $ref descent, `rule.byday` was never visited and RJSF showed its
        // "Missing items definition" error block.
        const ui = buildUiSchema(
            {
                type: 'object',
                properties: {
                    rule: { $ref: '#/$defs/Rule' },
                },
                $defs: {
                    Rule: {
                        type: 'object',
                        properties: {
                            freq: { type: 'string' },
                            byday: { type: 'array' }, // no items → shapeless
                        },
                    },
                },
            },
            registry,
        );

        expect(ui).toEqual({ rule: { byday: { 'ui:widget': 'hidden' } } });
    });

    it('tolerates unknown extension keywords without emitting anything for them', () => {
        const ui = buildUiSchema(
            {
                type: 'object',
                properties: {
                    beat: {
                        type: 'object',
                        'x-acme-beat': 'expandable',
                        'x-acme-pause': true,
                        properties: { headline: { type: 'string' } },
                    },
                },
            },
            registry,
        );

        expect(ui).toEqual({});
    });
});

describe('mergeUiSchema', () => {
    it('caller overrides win on leaves without clobbering sibling branches', () => {
        const merged = mergeUiSchema(
            { notes: { 'ui:widget': 'textarea' }, mood: { 'ui:widget': 'radio' } },
            { notes: { 'ui:widget': 'markdown', 'ui:rows': 10 } },
        );

        expect(merged).toEqual({
            notes: { 'ui:widget': 'markdown', 'ui:rows': 10 },
            mood: { 'ui:widget': 'radio' },
        });
    });
});
