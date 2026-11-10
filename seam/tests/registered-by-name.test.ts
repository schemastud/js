import { describe, expect, it } from 'vitest';
import { createWidgetRegistry } from '../src/registry';
import { ButtonGroupWidget } from '../src/widgets/button-group';
import { StarRatingWidget } from '../src/widgets/star-rating';

/**
 * Widget names are registered by name (frame-foundation ticket 07, ruling 01 slice 1). A fresh
 * registry says which names it binds and where, a misspelled name is reported as not bound even
 * where inference would still draw something, a scoped registration beats an unscoped one, and
 * the resolver hands over the entry's config with the node's declared options merged over it.
 */
describe('a fresh createWidgetRegistry()', () => {
    it('lists its eight names, each bound in every context', () => {
        expect(createWidgetRegistry().names()).toEqual(
            ['button-group', 'combobox', 'file', 'json', 'radio', 'select', 'star-rating', 'textarea'].map(
                (name) => ({ name, contexts: null }),
            ),
        );
    });

    it('resolves button-group and star-rating, which used to live on the singleton only', () => {
        const registry = createWidgetRegistry();
        expect(registry.resolveEntry({ type: 'string', enum: ['a', 'b'], 'x-widget': 'button-group' })).toEqual({
            widget: ButtonGroupWidget,
            bound: true,
        });
        expect(registry.resolveWidget({ type: 'integer', 'x-widget': 'star-rating' })).toBe(StarRatingWidget);
    });

    it('reports a misspelled name on a three-value enum as not bound', () => {
        const resolved = createWidgetRegistry().resolveEntry({
            type: 'string',
            enum: ['draft', 'live', 'archived'],
            'x-widget': 'buton-group',
        });
        expect(resolved.bound).toBe(false);
        // Rendering is unchanged in this slice: inference still draws the short enum as radio.
        expect(resolved.widget).toBe('radio');
    });

    it('lets a scoped registration beat an unscoped one in its context, whatever the order', () => {
        const registry = createWidgetRegistry();
        registry.registerWidget('date', 'list-date', undefined, { contexts: ['list-column'] });
        registry.registerWidget('date', 'form-date');

        expect(registry.resolveEntry({ 'x-widget': 'date' }, 'list-column')).toEqual({ widget: 'list-date', bound: true });
        expect(registry.resolveEntry({ 'x-widget': 'date' }, 'edit')).toEqual({ widget: 'form-date', bound: true });
        expect(registry.resolveEntry({ 'x-widget': 'date' })).toEqual({ widget: 'form-date', bound: true });

        const scopedOnly = createWidgetRegistry();
        scopedOnly.registerWidget('badge', 'badge-cell', undefined, { contexts: ['list-column'] });
        expect(scopedOnly.resolveEntry({ 'x-widget': 'badge' }, 'detail').bound).toBe(false);
        expect(scopedOnly.names().find((n) => n.name === 'badge')).toEqual({ name: 'badge', contexts: ['list-column'] });
        expect(registry.names().find((n) => n.name === 'date')).toEqual({ name: 'date', contexts: null });
    });

    it('returns a node’s declared options merged over the entry’s config', () => {
        const registry = createWidgetRegistry();
        registry.registerWidget('rich-content', 'rich-content-widget', { palette: 'full', toolbar: { bold: true } });

        expect(
            registry.resolveEntry({
                'x-widget': 'rich-content',
                'x-widget-options': { palette: 'compact', toolbar: { italic: true } },
            }).options,
        ).toEqual({ palette: 'compact', toolbar: { bold: true, italic: true } });
    });
});
