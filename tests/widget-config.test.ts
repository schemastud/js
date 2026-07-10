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
