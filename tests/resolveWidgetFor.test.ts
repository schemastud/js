import { describe, expect, it } from 'vitest';
import { createWidgetRegistry, type SchemaNode, type WidgetRegistry } from '@schemastud/seam';
import { resolveWidgetFor } from '../src/resolveWidgetFor';
import type { NodeParticipation } from '../src/contexts';

/**
 * The context-aware resolver, proven against a REAL seam registry — the same
 * `resolveEntry` path numero binds. Two named widgets: a light `email-input` and a
 * `circuit-graph` we flag heavyweight to exercise cell suppression.
 */
const EmailInput = () => null;
const CircuitGraph = () => null;

function makeRegistry(): WidgetRegistry {
    const r = createWidgetRegistry();
    r.registerWidget('email-input', EmailInput);
    r.registerWidget('circuit-graph', CircuitGraph);
    return r;
}

const node: SchemaNode = { type: 'string' };

function part(p: Partial<NodeParticipation>): NodeParticipation {
    return { participates: true, ...p };
}

describe('resolveWidgetFor', () => {
    it('non-participating cm → { participates:false, widget:undefined }', () => {
        const r = makeRegistry();
        expect(resolveWidgetFor(node, 'edit', undefined, undefined, r)).toEqual({
            participates: false,
            widget: undefined,
        });
        expect(resolveWidgetFor(node, 'edit', part({ participates: false }), undefined, r)).toEqual({
            participates: false,
            widget: undefined,
        });
    });

    it('edit with an explicit registered widget name → resolves the component', () => {
        const r = makeRegistry();
        const res = resolveWidgetFor(node, 'edit', part({ widget: 'email-input' }), undefined, r);
        expect(res.participates).toBe(true);
        expect(res.widget).toBe(EmailInput);
        expect(res.unbound).toBe(false);
    });

    it('row-cell inheritsBinding:true, no own widget → inherits the parent edit name', () => {
        const r = makeRegistry();
        const parent = part({ widget: 'email-input' });
        const res = resolveWidgetFor(node, 'row-cell', part({ inheritsBinding: true }), parent, r);
        expect(res.participates).toBe(true);
        expect(res.widget).toBe(EmailInput);
        expect(res.unbound).toBe(false);
    });

    it('row-cell inheritsBinding:false → does NOT inherit (name undefined → miss)', () => {
        const r = makeRegistry();
        const parent = part({ widget: 'email-input' });
        const res = resolveWidgetFor(node, 'row-cell', part({ inheritsBinding: false }), parent, r);
        expect(res.participates).toBe(true);
        expect(res.widget).toBeUndefined();
        expect(res.unbound).toBe(false);
    });

    it('row-cell deep-merges options over the parent edit options', () => {
        const r = makeRegistry();
        // Capture the folded options by binding a config-less predicate that echoes
        // x-widget-options through a component; simplest is to assert via the schema the
        // registry sees — so register a predicate that stashes the seen schema.
        let seen: SchemaNode | undefined;
        r.registerWidget(
            (s) => {
                seen = s;
                return s['x-widget'] === 'email-input';
            },
            EmailInput,
        );
        const parent = part({ widget: 'email-input', options: { mask: { a: 1 } } });
        resolveWidgetFor(node, 'row-cell', part({ inheritsBinding: true, options: { mask: { b: 2 } } }), parent, r);
        expect(seen?.['x-widget-options']).toEqual({ mask: { a: 1, b: 2 } });
    });

    it('heavyweight suppression: heavyweight parent edit → row-cell does NOT inherit', () => {
        const r = makeRegistry();
        const parent = part({ widget: 'circuit-graph', heavyweight: true });
        const res = resolveWidgetFor(node, 'row-cell', part({ inheritsBinding: true }), parent, r);
        expect(res.participates).toBe(true);
        // Suppressed: falls to its own (absent) binding, never the heavyweight widget.
        expect(res.widget).toBeUndefined();
    });

    it('unbound: a name with no registry match → unbound:true', () => {
        const r = makeRegistry();
        const res = resolveWidgetFor(node, 'edit', part({ widget: 'not-registered' }), undefined, r);
        expect(res.participates).toBe(true);
        expect(res.widget).toBeUndefined();
        expect(res.unbound).toBe(true);
    });
});
