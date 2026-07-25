import { describe, expect, it } from 'vitest';
import type { SchemaNode } from '@schemastud/seam';
import { createFormResolver, kindOfSchema } from '../src/FormResolver';

/**
 * The canonical whole-object form resolver: pick a bespoke form by the object's schema
 * IDENTITY (kind = terminal `$id` segment) + a predicate escape hatch, resolved with order
 * **root x-widget > form-by-kind > generic**. Proven here in isolation; the DefaultFormBody
 * wiring consults it before falling through to SchemaForm.
 */
const Series = () => null;
const Release = () => null;

const schemaFor = (kind: string): SchemaNode => ({ $id: `https://x/schemas/calendar/kind/${kind}`, type: 'object' });

describe('kindOfSchema', () => {
    it('is the terminal segment of the $id (host-independent)', () => {
        expect(kindOfSchema(schemaFor('series'))).toBe('series');
        expect(kindOfSchema({ type: 'object' })).toBe(''); // no $id → empty kind
    });
});

describe('createFormResolver — order: root x-widget > form-by-kind > generic', () => {
    it('resolves a form by the schema $id kind token', () => {
        const r = createFormResolver();
        r.registerFormForSchema('series', Series);
        const res = r.resolveFormForSchema(schemaFor('series'));
        expect(res.reason).toBe('by-kind');
        expect(res.form).toBe(Series);
    });

    it('matches a predicate escape hatch when no kind key matches', () => {
        const r = createFormResolver();
        r.registerFormForSchema((s) => String(s.$id).endsWith('/kind/release'), Release);
        const res = r.resolveFormForSchema(schemaFor('release'));
        expect(res.reason).toBe('by-predicate');
        expect(res.form).toBe(Release);
    });

    it('an explicit root x-widget WINS over a kind registration (heavyweight editors unaffected)', () => {
        const r = createFormResolver();
        r.registerFormForSchema('series', Series);
        const res = r.resolveFormForSchema({ ...schemaFor('series'), 'x-widget': 'circuit-graph' });
        expect(res.reason).toBe('x-widget');
        expect(res.form).toBeNull();
    });

    it('falls through to generic when nothing matches', () => {
        const r = createFormResolver();
        const res = r.resolveFormForSchema(schemaFor('unknown'));
        expect(res.reason).toBe('generic');
        expect(res.form).toBeNull();
    });

    it('the latest predicate registration wins', () => {
        const r = createFormResolver();
        const A = () => null;
        const B = () => null;
        const p = (s: SchemaNode) => String(s.$id).includes('series');
        r.registerFormForSchema(p, A);
        r.registerFormForSchema(p, B);
        expect(r.resolveFormForSchema(schemaFor('series')).form).toBe(B);
    });

    it('an id-less schema never matches an empty-kind registration', () => {
        const r = createFormResolver();
        r.registerFormForSchema('', () => null); // pathological; must not catch id-less schemas
        expect(r.resolveFormForSchema({ type: 'object' }).reason).toBe('generic');
    });
});
