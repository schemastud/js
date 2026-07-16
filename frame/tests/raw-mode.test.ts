import { describe, expect, it } from 'vitest';
import { STUD_WIDGET_KEYWORD, stripHostWidgets } from '../src/raw-mode';
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
