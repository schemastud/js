import { describe, expect, it } from 'vitest';
import { getPath } from '../src/getPath';

/**
 * The dotted field pointer. A column's `field` may name a node inside a sub-projection
 * a producer above frame folded onto the row (`commerce.plan`), and `byNode` keys it by
 * the full dotted string — so the only place depth matters is where the VALUE is read.
 */
describe('getPath', () => {
    it('reads a bare property exactly as a flat index would', () => {
        expect(getPath({ title: 'Alpha' }, 'title')).toBe('Alpha');
    });

    it('walks a dotted pointer into a folded slice', () => {
        expect(getPath({ commerce: { plan: { name: 'Pro' } } }, 'commerce.plan')).toEqual({ name: 'Pro' });
        expect(getPath({ commerce: { plan: { name: 'Pro' } } }, 'commerce.plan.name')).toBe('Pro');
    });

    it('a present-and-null slice yields undefined rather than throwing', () => {
        // The seam distinguishes "the contributor is not installed" (key absent) from "it ran
        // and returned null" (key present, null). Both must render empty, never crash.
        expect(getPath({ commerce: null }, 'commerce.plan')).toBeUndefined();
        expect(getPath({}, 'commerce.plan')).toBeUndefined();
    });

    it('a null value at the leaf is preserved, not coerced', () => {
        expect(getPath({ commerce: { plan: null } }, 'commerce.plan')).toBeNull();
    });

    it('refuses to traverse through a non-object', () => {
        expect(getPath({ commerce: 'not-an-object' }, 'commerce.plan')).toBeUndefined();
    });

    it('a null or undefined record yields undefined for either pointer shape', () => {
        expect(getPath(null, 'title')).toBeUndefined();
        expect(getPath(undefined, 'commerce.plan')).toBeUndefined();
    });

    it('a literal dotted KEY is not found by traversal — depth is the contract', () => {
        // Deliberate: `byNode` is the map keyed by the literal dotted string; a RECORD is
        // nested. If a producer ever flattened a row, this is the line that would say so.
        expect(getPath({ 'commerce.plan': 'Pro' }, 'commerce.plan')).toBeUndefined();
    });
});
