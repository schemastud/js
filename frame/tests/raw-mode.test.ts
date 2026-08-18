import { describe, expect, it } from 'vitest';
import { STUD_WIDGET_KEYWORD, STUD_WIDGET_OPTIONS_KEYWORD, bridgeHostWidgets, stripHostWidgets } from '../src/raw-mode';
import type { SchemaNode } from '@schemastud/seam';

/**
 * The `raw` form-mode contract: host-widget overrides (`x-stud-widget`) are stripped
 * so every field falls to its inferred control. `splicewire` mode keeps them.
 */
describe('stripHostWidgets (raw mode)', () => {
    const schema: SchemaNode = {
        type: 'object',
        properties: {
            interpretation: { type: 'string', [STUD_WIDGET_KEYWORD]: 'splicewire-enrich' },
            title: { type: 'string', 'x-placeholder': 'A title' },
            tags: {
                type: 'array',
                items: { type: 'string', [STUD_WIDGET_KEYWORD]: 'textarea' },
            },
        },
        $defs: {
            Nested: { type: 'string', [STUD_WIDGET_KEYWORD]: 'splicewire-enrich' },
        },
    };

    it('removes x-stud-widget everywhere it appears (properties, items, $defs)', () => {
        const raw = stripHostWidgets(schema) as Record<string, any>;
        expect(raw.properties.interpretation[STUD_WIDGET_KEYWORD]).toBeUndefined();
        expect(raw.properties.tags.items[STUD_WIDGET_KEYWORD]).toBeUndefined();
        expect(raw.$defs.Nested[STUD_WIDGET_KEYWORD]).toBeUndefined();
    });

    it('preserves every other keyword (only the host-widget override is dropped)', () => {
        const raw = stripHostWidgets(schema) as Record<string, any>;
        expect(raw.properties.interpretation.type).toBe('string');
        expect(raw.properties.title['x-placeholder']).toBe('A title');
        expect(raw.type).toBe('object');
    });

    it('never mutates the input (splicewire mode still sees the widget)', () => {
        stripHostWidgets(schema);
        expect(
            (schema.properties as any).interpretation[STUD_WIDGET_KEYWORD],
        ).toBe('splicewire-enrich');
    });
});

/**
 * The other half of the `enriched` mode contract: seam's WidgetRegistry predicates
 * (and its own generic widgets — button-group, star-rating, combobox) check the
 * BARE `x-widget`/`x-widget-options`, never frame's namespaced `x-stud-*` ones —
 * found live, nothing bridged them, so a `#[Widget(...)]`-declared widget never
 * actually resolved in either form mode. `bridgeHostWidgets` is that bridge.
 */
describe('bridgeHostWidgets (enriched mode)', () => {
    const schema: SchemaNode = {
        type: 'object',
        properties: {
            realm: {
                type: 'string',
                [STUD_WIDGET_KEYWORD]: 'combobox',
                [STUD_WIDGET_OPTIONS_KEYWORD]: { suggestions: ['site', 'operator'] },
            },
            title: { type: 'string', 'x-placeholder': 'A title' },
            tags: {
                type: 'array',
                items: { type: 'string', [STUD_WIDGET_KEYWORD]: 'textarea' },
            },
        },
        $defs: {
            Nested: { type: 'string', [STUD_WIDGET_KEYWORD]: 'splicewire-enrich' },
        },
    };

    it('copies x-stud-widget onto bare x-widget everywhere it appears', () => {
        const bridged = bridgeHostWidgets(schema) as Record<string, any>;
        expect(bridged.properties.realm['x-widget']).toBe('combobox');
        expect(bridged.properties.tags.items['x-widget']).toBe('textarea');
        expect(bridged.$defs.Nested['x-widget']).toBe('splicewire-enrich');
    });

    it('copies x-stud-widget-options onto bare x-widget-options', () => {
        const bridged = bridgeHostWidgets(schema) as Record<string, any>;
        expect(bridged.properties.realm['x-widget-options']).toEqual({ suggestions: ['site', 'operator'] });
    });

    it('preserves the original x-stud-* keywords alongside the bridged bare ones', () => {
        const bridged = bridgeHostWidgets(schema) as Record<string, any>;
        expect(bridged.properties.realm[STUD_WIDGET_KEYWORD]).toBe('combobox');
    });

    it('preserves every other keyword (title, x-placeholder, plain type fields)', () => {
        const bridged = bridgeHostWidgets(schema) as Record<string, any>;
        expect(bridged.properties.title['x-placeholder']).toBe('A title');
        expect(bridged.type).toBe('object');
    });

    it('leaves a node with no host-widget keyword untouched', () => {
        const bridged = bridgeHostWidgets(schema) as Record<string, any>;
        expect(bridged.properties.title['x-widget']).toBeUndefined();
    });

    it('never mutates the input', () => {
        bridgeHostWidgets(schema);
        expect((schema.properties as any).realm['x-widget']).toBeUndefined();
    });
});
