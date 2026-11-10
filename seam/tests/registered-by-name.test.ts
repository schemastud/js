import { describe, expect, it } from 'vitest';
import { RJSF_STOCK_NAMES, createWidgetRegistry } from '../src/registry';
import { ButtonGroupWidget } from '../src/widgets/button-group';
import { ComboboxWidget } from '../src/widgets/combobox';
import { JsonField } from '../src/widgets/json';
import { StarRatingWidget } from '../src/widgets/star-rating';

/**
 * Widget names are registered by name (frame-foundation ticket 07, ruling 01 slice 1). A fresh
 * registry says which names it binds and where, a misspelled name is reported as not bound even
 * where inference would still draw something, a scoped registration beats an unscoped one, and
 * the resolver hands over the entry's config with the node's declared options merged over it.
 */
describe('a fresh createWidgetRegistry()', () => {
    it('lists its 29 names (RJSF’s 25 stock names and seam’s four widgets), each with one unscoped registration', () => {
        const builtins: Array<[string, unknown]> = [
            ...RJSF_STOCK_NAMES.map((name): [string, unknown] => [name, name]),
            ['button-group', ButtonGroupWidget],
            ['combobox', ComboboxWidget],
            ['json', JsonField],
            ['star-rating', StarRatingWidget],
        ];
        expect(createWidgetRegistry().names()).toEqual(
            builtins
                .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
                .map(([name, widget]) => ({ name, registrations: [{ contexts: null, widget }] })),
        );
        expect(createWidgetRegistry().names()).toHaveLength(29);
    });

    it('resolves button-group and star-rating, which used to live on the singleton only', () => {
        const registry = createWidgetRegistry();
        expect(registry.resolveEntry({ type: 'string', enum: ['a', 'b'], 'x-widget': 'button-group' })).toEqual({
            widget: ButtonGroupWidget,
            bound: true,
            name: 'button-group',
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

        expect(registry.resolveEntry({ 'x-widget': 'date' }, 'list-column')).toEqual({ widget: 'list-date', bound: true, name: 'date' });
        expect(registry.resolveEntry({ 'x-widget': 'date' }, 'edit')).toEqual({ widget: 'form-date', bound: true, name: 'date' });
        expect(registry.resolveEntry({ 'x-widget': 'date' })).toEqual({ widget: 'form-date', bound: true, name: 'date' });

        const scopedOnly = createWidgetRegistry();
        scopedOnly.registerWidget('badge', 'badge-cell', undefined, { contexts: ['list-column'] });
        expect(scopedOnly.resolveEntry({ 'x-widget': 'badge' }, 'detail').bound).toBe(false);
        expect(scopedOnly.names().find((n) => n.name === 'badge')).toEqual({
            name: 'badge',
            registrations: [{ contexts: ['list-column'], widget: 'badge-cell' }],
        });
        // The list-column registration answers ahead of the unscoped one, as resolveEntry does.
        expect(registry.names().find((n) => n.name === 'date')).toEqual({
            name: 'date',
            registrations: [
                { contexts: ['list-column'], widget: 'list-date' },
                { contexts: null, widget: 'form-date' },
            ],
        });
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
