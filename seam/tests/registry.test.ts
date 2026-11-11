import { describe, expect, it } from 'vitest';
import { createWidgetRegistry } from '../src/registry';
import { ComboboxWidget } from '../src/widgets/combobox';

describe('widget resolution contract', () => {
    const registry = createWidgetRegistry();

    it('x-widget override wins over everything', () => {
        expect(
            registry.resolveWidget({ type: 'string', enum: ['a', 'b'], 'x-widget': 'textarea' }),
        ).toBe('textarea');
        expect(registry.resolveWidget({ type: 'string', 'x-widget': 'file' })).toBe('file');
    });

    it('combobox is baked into every fresh registry', () => {
        expect(registry.resolveWidget({ type: 'string', 'x-widget': 'combobox' })).toBe(ComboboxWidget);
        const fresh = createWidgetRegistry();
        expect(fresh.resolveWidget({ type: 'string', 'x-widget': 'combobox' })).toBe(ComboboxWidget);
    });

    it('small enums (≤4) render as radio; larger enums fall to the select default', () => {
        expect(registry.resolveWidget({ type: 'string', enum: ['a', 'b', 'c', 'd'] })).toBe(
            'radio',
        );
        expect(
            registry.resolveWidget({ type: 'string', enum: ['a', 'b', 'c', 'd', 'e'] }),
        ).toBeUndefined();
    });

    it('format file resolves the file widget; native formats emit nothing', () => {
        expect(registry.resolveWidget({ type: 'string', format: 'file' })).toBe('file');
        expect(registry.resolveWidget({ type: 'string', format: 'date' })).toBeUndefined();
        expect(registry.resolveWidget({ type: 'string', format: 'email' })).toBeUndefined();
    });

    it('plain types fall through to RJSF defaults (no emission)', () => {
        expect(registry.resolveWidget({ type: 'string' })).toBeUndefined();
        expect(registry.resolveWidget({ type: 'boolean' })).toBeUndefined();
        expect(registry.resolveWidget({ type: 'number' })).toBeUndefined();
    });

    it('later registrations take precedence', () => {
        const scoped = createWidgetRegistry();
        // By name: a predicate never binds a name (ruling 01 §3), so a name keyed in a predicate is unbound.
        scoped.registerWidget('citation', 'citation-v1');
        scoped.registerWidget('citation', 'citation-v2');
        expect(scoped.resolveWidget({ type: 'string', 'x-widget': 'citation' })).toBe(
            'citation-v2',
        );
    });

    it('a string key is a name: it matches x-widget and never the JSON type', () => {
        const scoped = createWidgetRegistry();
        scoped.registerWidget('citation', 'citation-widget');
        expect(scoped.resolveWidget({ type: 'string', 'x-widget': 'citation' })).toBe(
            'citation-widget',
        );
        expect(scoped.resolveWidget({ type: 'citation' })).toBeUndefined();
    });

    it('registries are isolated — the default singleton is not polluted', () => {
        const scoped = createWidgetRegistry();
        scoped.registerWidget('citation', 'scoped-only');
        const fresh = createWidgetRegistry();
        expect(fresh.resolveWidget({ 'x-widget': 'citation' })).toBeUndefined();
    });
});
