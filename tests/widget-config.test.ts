import { describe, expect, it } from 'vitest';
import { createWidgetRegistry } from '../src/registry';
import { buildUiSchema, mergeUiSchema } from '../src/ui-schema';

describe('registerWidget config argument', () => {
    it('two-arg registrations behave exactly as before', () => {
        const registry = createWidgetRegistry();
        registry.registerWidget('citation', 'citation-widget');

        expect(registry.resolveWidget({ 'x-widget': 'citation' })).toBe('citation-widget');
        expect(registry.resolveEntry({ 'x-widget': 'citation' })).toEqual({
            widget: 'citation-widget',
            config: undefined,
        });
    });

    it('object config is returned by resolveEntry for the matched entry only', () => {
        const registry = createWidgetRegistry();
        registry.registerWidget('citation', 'citation-widget', { style: 'inline' });

        expect(registry.resolveEntry({ 'x-widget': 'citation' }).config).toEqual({
            style: 'inline',
        });
        expect(registry.resolveEntry({ type: 'string' }).config).toBeUndefined();
    });

    it('function config computes against the schema node', () => {
        const registry = createWidgetRegistry();
        registry.registerWidget('rich-content', 'rich-content-widget', (schema) => ({
            palette: schema.format === 'compact' ? 'minimal' : 'full',
        }));

        expect(
            registry.resolveEntry({ 'x-widget': 'rich-content', format: 'compact' }).config,
        ).toEqual({ palette: 'minimal' });
        expect(registry.resolveEntry({ 'x-widget': 'rich-content' }).config).toEqual({
            palette: 'full',
        });
    });
});

describe('walker ui:options emission', () => {
    it('emits registry config as ui:options', () => {
        const registry = createWidgetRegistry();
        registry.registerWidget('rich-content', 'rich-content-widget', { palette: 'full' });

        const ui = buildUiSchema(
            {
                type: 'object',
                properties: { body: { type: 'object', 'x-widget': 'rich-content' } },
            },
            registry,
        );

        expect(ui).toEqual({
            body: { 'ui:widget': 'rich-content-widget', 'ui:options': { palette: 'full' } },
        });
    });

    it('x-widget-options wins over registry config, deep-merged', () => {
        const registry = createWidgetRegistry();
        registry.registerWidget('rich-content', 'rich-content-widget', {
            palette: 'full',
            commit: { debounceMs: 500, onBlur: true },
        });

        const ui = buildUiSchema(
            {
                type: 'object',
                properties: {
                    body: {
                        type: 'object',
                        'x-widget': 'rich-content',
                        'x-widget-options': {
                            manifestRef: 'block-manifests/content',
                            commit: { debounceMs: 250 },
                        },
                    },
                },
            },
            registry,
        );

        expect(ui.body).toEqual({
            'ui:widget': 'rich-content-widget',
            'ui:options': {
                palette: 'full',
                manifestRef: 'block-manifests/content',
                commit: { debounceMs: 250, onBlur: true },
            },
        });
    });

    it('caller uiSchema wins last through the existing merge', () => {
        const registry = createWidgetRegistry();
        registry.registerWidget('rich-content', 'rich-content-widget', { palette: 'full' });

        const generated = buildUiSchema(
            {
                type: 'object',
                properties: {
                    body: {
                        type: 'object',
                        'x-widget': 'rich-content',
                        'x-widget-options': { palette: 'schema' },
                    },
                },
            },
            registry,
        );
        const merged = mergeUiSchema(generated, {
            body: { 'ui:options': { palette: 'caller' } },
        });

        expect((merged.body as Record<string, unknown>)['ui:options']).toEqual({
            palette: 'caller',
        });
    });

    it('x-widget-options emits even when no registry entry matches', () => {
        const ui = buildUiSchema(
            {
                type: 'object',
                properties: {
                    notes: { type: 'string', 'x-widget-options': { rows: 12 } },
                },
            },
            createWidgetRegistry(),
        );

        expect(ui).toEqual({ notes: { 'ui:options': { rows: 12 } } });
    });
});

describe('composite-node component resolution', () => {
    it('a component widget on an object node emits ui:field, not ui:widget', () => {
        const registry = createWidgetRegistry();
        const RichContent = () => null;
        registry.registerWidget('rich-content', RichContent);

        const ui = buildUiSchema(
            {
                type: 'object',
                properties: { body: { type: 'object', 'x-widget': 'rich-content' } },
            },
            registry,
        );

        expect(ui).toEqual({ body: { 'ui:field': RichContent } });
    });

    it('a string widget name on an object node still emits ui:widget', () => {
        const registry = createWidgetRegistry();
        registry.registerWidget('special-object', 'special-widget');

        const ui = buildUiSchema({ type: 'object', 'x-widget': 'special-object' }, registry);

        expect(ui).toEqual({ 'ui:widget': 'special-widget' });
    });
});

describe('local $ref composite resolution', () => {
    it('a component widget on a local-$ref object node emits ui:field', () => {
        const registry = createWidgetRegistry();
        const RichContent = () => null;
        registry.registerWidget('rich-content', RichContent);

        const ui = buildUiSchema(
            {
                type: 'object',
                properties: {
                    bodyDoc: { $ref: '#/$defs/Doc', nullable: true, 'x-widget': 'rich-content' },
                },
                $defs: { Doc: { type: 'object', properties: { type: { type: 'string' } } } },
            },
            registry,
        );

        expect(ui.bodyDoc).toEqual({ 'ui:field': RichContent });
    });
});

describe('nullable-$ref expansion end to end', () => {
    it('relax expands {$ref, nullable} into anyOf and the walker still emits ui:field with fieldReplacesAnyOrOneOf', async () => {
        const { relaxNullableRequired } = await import('../src/relax');
        const registry = createWidgetRegistry();
        const RichContent = () => null;
        registry.registerWidget('rich-content', RichContent);

        const relaxed = relaxNullableRequired({
            type: 'object',
            properties: {
                bodyDoc: {
                    $ref: '#/$defs/Doc',
                    nullable: true,
                    'x-widget': 'rich-content',
                    'x-widget-options': { manifestRef: 'block-manifests/content' },
                },
            },
            $defs: { Doc: { type: 'object', properties: { type: { type: 'string' } } } },
        });

        const bodyDoc = (relaxed.properties as Record<string, Record<string, unknown>>).bodyDoc;
        expect(bodyDoc.anyOf).toEqual([{ $ref: '#/$defs/Doc' }, { type: 'null' }]);
        expect(bodyDoc.nullable).toBeUndefined();

        const ui = buildUiSchema(relaxed, registry);
        expect((ui.bodyDoc as Record<string, unknown>)['ui:field']).toBe(RichContent);
        expect((ui.bodyDoc as Record<string, unknown>)['ui:options']).toEqual({
            fieldReplacesAnyOrOneOf: true,
            manifestRef: 'block-manifests/content',
        });
    });
});
