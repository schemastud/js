import { describe, expect, it, vi } from 'vitest';
import { createWidgetRegistry, type SchemaNode, type WidgetRegistry } from '@schemastud/seam';
import { FRAME_CONTEXT_KEYWORD, resolveWidgetFor } from '../src/resolveWidgetFor';
import { KNOWN_CONTEXTS, type NodeParticipation } from '../src/contexts';

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

    // --- The collection grain: overview ← summary (realm-dashboards ticket 01) ---

    const StatRow = () => null;
    const FigureCard = () => null;

    function makeCardRegistry(): WidgetRegistry {
        const r = createWidgetRegistry();
        r.registerWidget('stat-row', StatRow);
        r.registerWidget('figure-card', FigureCard);
        return r;
    }

    it('overview unbound, inheritsBinding default → inherits the summary widget name', () => {
        const r = makeCardRegistry();
        const summary = part({ widget: 'stat-row' });
        const res = resolveWidgetFor(node, 'overview', part({}), summary, r);
        expect(res.participates).toBe(true);
        expect(res.widget).toBe(StatRow);
        expect(res.unbound).toBe(false);
    });

    it('overview deep-folds its own options over the summary options', () => {
        const r = makeCardRegistry();
        let seen: SchemaNode | undefined;
        r.registerWidget((s) => {
            seen = s;
            return s['x-widget'] === 'stat-row';
        }, StatRow);
        const summary = part({ widget: 'stat-row', options: { figures: { count: true }, tone: 'muted' } });
        resolveWidgetFor(node, 'overview', part({ options: { figures: { period: 'month' } } }), summary, r);
        expect(seen?.['x-widget-options']).toEqual({ figures: { count: true, period: 'month' }, tone: 'muted' });
    });

    it('overview with its own widget name keeps it and still folds the summary options under its own', () => {
        const r = makeCardRegistry();
        let seen: SchemaNode | undefined;
        r.registerWidget((s) => {
            seen = s;
            return false;
        }, StatRow);
        const summary = part({ widget: 'stat-row', options: { tone: 'muted', figures: 3 } });
        const res = resolveWidgetFor(node, 'overview', part({ widget: 'figure-card', options: { tone: 'accent' } }), summary, r);
        expect(res.widget).toBe(FigureCard);
        expect(seen?.['x-widget']).toBe('figure-card');
        // Folded: the summary's `figures` survives, the overview's own `tone` wins.
        expect(seen?.['x-widget-options']).toEqual({ tone: 'accent', figures: 3 });
    });

    it('overview inheritsBinding:false → does NOT inherit the summary binding', () => {
        const r = makeCardRegistry();
        let seen: SchemaNode | undefined;
        r.registerWidget((s) => {
            seen = s;
            return false;
        }, StatRow);
        const summary = part({ widget: 'stat-row', options: { tone: 'muted' } });
        const res = resolveWidgetFor(node, 'overview', part({ inheritsBinding: false, options: { period: 'month' } }), summary, r);
        expect(res.participates).toBe(true);
        expect(res.widget).toBeUndefined();
        expect(res.unbound).toBe(false);
        expect(seen?.['x-widget']).toBeUndefined();
        expect(seen?.['x-widget-options']).toEqual({ period: 'month' });
    });

    it('summary never cascades: it has no parent edge, even when a parent entry is handed in', () => {
        const r = makeCardRegistry();
        const stray = part({ widget: 'figure-card' });
        const res = resolveWidgetFor(node, 'summary', part({}), stray, r);
        expect(res.participates).toBe(true);
        expect(res.widget).toBeUndefined();
    });

    it('stamps x-frame-context onto the schema the registry receives, for every context', () => {
        const r = makeRegistry();
        const resolveEntry = vi.spyOn(r, 'resolveEntry');
        for (const ctx of KNOWN_CONTEXTS) {
            resolveWidgetFor(node, ctx, part({}), undefined, r);
            const schema = resolveEntry.mock.calls.at(-1)?.[0];
            expect(schema?.[FRAME_CONTEXT_KEYWORD]).toBe(ctx);
        }
        expect(resolveEntry).toHaveBeenCalledTimes(KNOWN_CONTEXTS.length);
    });

    it('the stamp lets a context-default widget fire on a predicate for an unbound node', () => {
        const r = makeCardRegistry();
        r.registerWidget((s) => s[FRAME_CONTEXT_KEYWORD] === 'summary' && s['x-widget'] === undefined, StatRow);
        const res = resolveWidgetFor(node, 'summary', part({}), undefined, r);
        expect(res.widget).toBe(StatRow);
        expect(res.unbound).toBe(false);
        // A declared name still wins over the context default.
        const named = resolveWidgetFor(node, 'summary', part({ widget: 'figure-card' }), undefined, r);
        expect(named.widget).toBe(FigureCard);
    });

    it('the stamp rides the schema only — the resolved shape is byte-identical to before', () => {
        const r = makeRegistry();
        expect(resolveWidgetFor(node, 'summary', part({}), undefined, r)).toEqual({
            widget: undefined,
            participates: true,
            unbound: false,
        });
    });
});
