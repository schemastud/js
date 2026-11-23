import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { createWidgetRegistry, type SchemaNode, type WidgetRegistry } from '@schemastud/seam';
import {
    FRAME_CONTEXT_REGISTRANT,
    createFrameContextRegistry,
    createFrameContexts,
    frameContexts,
    lenderFor,
    type KitContexts,
} from '../src/contextRegistry';
import { INHERITS, KNOWN_CONTEXTS, type ContextManifest, type NodeParticipation } from '../src/contexts';
import { resolveDashboardCard } from '../src/cards/DashboardCard';
import { EditableCell } from '../src/EditableCell';
import { createFrameKit } from '../src/kit';
import { resolveWidgetFor } from '../src/resolveWidgetFor';

afterEach(cleanup);

/**
 * frame-foundation 91 (decision 86, Amendment 2): the kit carries a context registry seeded with frame's seven; a host
 * hands it its own contexts beside its widgets; the resolver cascades by the registry, and the cascade is ONE step
 * (`lenderFor`). A host that hands in nothing gets today's behaviour.
 */

const Kanban = () => null;
const Card = () => null;
const node: SchemaNode = { type: 'string' };
const part = (p: Partial<NodeParticipation> = {}): NodeParticipation => ({ participates: true, ...p });

function widgets(): WidgetRegistry {
    const r = createWidgetRegistry();
    r.registerWidget('kanban-lane', Kanban as never, undefined, { contexts: ['kanban'] });
    r.registerWidget('record-card', Card as never);
    return r;
}

/** A host's contexts: `kanban` borrows a record's `list-item` binding when it binds none. */
const hostContexts: KitContexts = (contexts) => {
    contexts.register('kanban', { fallback: ['list-item'] }, 'host/app');
};

describe('the seeded registry is frame\'s seven, unchanged', () => {
    it('holds KNOWN_CONTEXTS in wire order, INHERITS as one-element fallbacks, and row-actions on list-column', () => {
        const contexts = frameContexts();
        expect(contexts.names()).toEqual(KNOWN_CONTEXTS);
        expect(contexts.edges()).toEqual(
            Object.fromEntries(Object.entries(INHERITS).map(([child, parent]) => [child, [parent]])),
        );
        expect(contexts.get('list-column')?.reserved).toEqual(['row-actions']);
        expect(KNOWN_CONTEXTS.flatMap((name) => contexts.get(name)!.reserved)).toEqual(['row-actions']);
        expect(contexts.registrant('edit')).toBe(FRAME_CONTEXT_REGISTRANT);
    });

    it('a built kit exposes its contexts read-only', () => {
        const kit = createFrameKit({ contexts: hostContexts, urlState: 'memory' });
        expect(kit.contexts.names()).toEqual([...KNOWN_CONTEXTS, 'kanban']);
        expect('register' in kit.contexts).toBe(false);
        expect(createFrameKit({ urlState: 'memory' }).contexts.names()).toEqual(KNOWN_CONTEXTS);
    });
});

describe('a host context resolves, and falls back along its entry', () => {
    const contexts = createFrameContexts(hostContexts);

    it('a widget registered for the host context resolves there', () => {
        const res = resolveWidgetFor(node, 'kanban', part({ widget: 'kanban-lane' }), undefined, widgets(), contexts);
        expect(res.widget).toBe(Kanban);
        expect(res.bound).toBe(true);
    });

    it('unbound there, it borrows its fallback\'s binding at the same pointer', () => {
        const byCtx = { kanban: part(), 'list-item': part({ widget: 'record-card' }) };
        const lender = lenderFor(byCtx, 'kanban', contexts);
        expect(lender?.context).toBe('list-item');
        const res = resolveWidgetFor(node, 'kanban', byCtx.kanban, lender?.entry, widgets(), contexts);
        expect(res.widget).toBe(Card);
        expect(res.name).toBe('record-card');
    });

    it('without the kit\'s registry the host context does not cascade (frame\'s seven only)', () => {
        const res = resolveWidgetFor(node, 'kanban', part(), part({ widget: 'record-card' }), widgets());
        expect(res.name).toBeUndefined();
    });
});

describe('the cascade is one step (decision 86 Q12)', () => {
    const contexts = createFrameContexts((c) => {
        c.register('a', { fallback: ['b', 'c'] });
        c.register('b', { fallback: ['c'] });
        c.register('c');
    });

    it('the first listed fallback that participates lends; an opted-out one is passed over', () => {
        expect(lenderFor({ b: part({ widget: 'x' }), c: part({ widget: 'y' }) }, 'a', contexts)?.context).toBe('b');
        expect(lenderFor({ b: part({ participates: false, widget: 'x' }), c: part({ widget: 'y' }) }, 'a', contexts)?.context).toBe('c');
    });

    it('lending never chains: a lender\'s own fallback is not consulted', () => {
        expect(lenderFor({ c: part({ widget: 'y' }) }, 'b', contexts)?.context).toBe('c');
        const only = createFrameContexts((c) => {
            c.register('a', { fallback: ['b'] });
            c.register('b', { fallback: ['c'] });
            c.register('c');
        });
        expect(lenderFor({ c: part({ widget: 'y' }) }, 'a', only)).toBeUndefined();
    });

    it('a context with no fallback never lends, and nothing at all lends to edit', () => {
        expect(lenderFor({ b: part({ widget: 'x' }) }, 'c', contexts)).toBeUndefined();
        expect(lenderFor({ detail: part({ widget: 'x' }) }, 'edit')).toBeUndefined();
    });
});

describe('a host replaces one of frame\'s seven in place (Supersede)', () => {
    it('keeps its slot and records the replaced entry; the cascade follows the new entry', () => {
        const contexts = createFrameContexts((c) => c.register('row-cell', { fallback: ['detail'] }, 'host/app'));
        expect(contexts.names()).toEqual(KNOWN_CONTEXTS);
        expect(contexts.get('row-cell')?.fallback).toEqual(['detail']);
        expect(contexts.registrant('row-cell')).toBe('host/app');
        expect(contexts.superseded('row-cell')).toEqual([
            { entry: { name: 'row-cell', fallback: ['edit'], reserved: [], grain: 'property' }, by: FRAME_CONTEXT_REGISTRANT, supersededBy: 'host/app' },
        ]);
        expect(lenderFor({ edit: part({ widget: 'x' }), detail: part({ widget: 'y' }) }, 'row-cell', contexts)?.context).toBe('detail');
    });

    it('EditableCell takes its lender from the kit\'s registry: row-cell with no fallback borrows nothing from edit', () => {
        // `edit` names a widget nothing binds: a cell that BORROWS that name draws the unbound marker; a cell whose
        // row-cell entry has no fallback borrows nothing and draws its read value.
        const edit = part({ widget: 'not-registered' });
        const draw = (contexts?: ReturnType<typeof createFrameContexts>) =>
            render(
                <EditableCell node={node} rootSchema={{}} rowCell={part()} byCtx={{ 'row-cell': part(), edit }} value="v" onCommit={() => {}} registry={createWidgetRegistry()} contexts={contexts} />,
            ).container;

        const seeded = draw();
        expect(seeded.querySelector('[data-frame-unbound="row-cell"]')?.getAttribute('data-frame-unbound-widget')).toBe('not-registered');
        cleanup();

        const noFallback = draw(createFrameContexts((c) => c.register('row-cell', {}, 'host/app')));
        expect(noFallback.querySelector('[data-frame-unbound]')).toBeNull();
        expect(screen.getByText('v')).toBeTruthy();
    });

    it('a dashboard card follows the kit\'s overview edge', () => {
        const registry = createWidgetRegistry();
        registry.registerWidget('lane-card', Card as never);
        const manifest: ContextManifest = {
            byNode: { '': { overview: part(), tiles: part({ widget: 'lane-card' }) } },
            inherits: {},
            known: KNOWN_CONTEXTS,
        };
        const row = { resource: 'things', context: 'overview' } as Parameters<typeof resolveDashboardCard>[0];
        // frame-foundation 92: a fallback shares its context's grain, so overview (collection) borrows from a host collection context.
        const contexts = createFrameContexts((c) => {
            c.register('tiles', { grain: 'collection' });
            c.register('overview', { fallback: ['tiles'] });
        });
        const resolved = resolveDashboardCard(row, manifest, registry, contexts);
        expect(resolved.widget).toBe(Card);
        expect(resolved.tier).toBe('tiles');
        expect(resolveDashboardCard(row, manifest, registry).tier).toBe('default');
    });
});

describe('refusals', () => {
    const build = (contexts: KitContexts) => () => createFrameKit({ contexts, urlState: 'memory' });

    it('a name that is not one key segment is refused when the kit is built', () => {
        for (const bad of ['Kanban', 'kan.ban', '', 'kan ban', '-kanban']) {
            expect(build((c) => c.register(bad)), bad).toThrow(/not one registry key segment/);
        }
        expect(build((c) => c.register('kanban:lane'))).not.toThrow();
    });

    it('a fallback to itself, any fallback on edit, and a fallback that is not a key segment are refused', () => {
        expect(build((c) => c.register('kanban', { fallback: ['kanban'] }))).toThrow('"kanban" falls back to itself');
        expect(build((c) => c.register('edit', { fallback: ['detail'] }))).toThrow('"edit" takes no fallback');
        expect(build((c) => c.register('kanban', { fallback: ['List-Item'] }))).toThrow(/not one registry key segment/);
    });

    it('a fallback to a context nobody registered is refused after the host\'s function, naming the registered ones', () => {
        expect(build((c) => c.register('kanban', { fallback: ['board'] }))).toThrow(
            /"kanban" falls back to "board", which is not registered \(registered: edit, detail, list-column, list-item, row-cell, summary, overview, kanban\)/,
        );
    });

    it('the order a host registers in does not matter: a fallback to a context registered later is fine', () => {
        expect(build((c) => {
            c.register('kanban', { fallback: ['board'] });
            c.register('board');
        })).not.toThrow();
    });

    it('a registry on its own checks nothing until asked', () => {
        const registry = createFrameContextRegistry();
        registry.register('kanban', { fallback: ['board'] });
        expect(() => registry.assertFallbacks()).toThrow(/"board", which is not registered/);
    });
});
