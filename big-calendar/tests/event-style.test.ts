import { describe, expect, it } from 'vitest';
import { eventStyle } from '../src/BigCalendarSurface';

/**
 * beam VR pass 2: a virtual (dashed) event's label sat in the bare hue on the surface, ~2.5:1 in dark.
 * The label now mixes the hue toward the surface ink so it follows the scheme; the fill and border
 * of a resident bar, and the dashed border of a virtual one, keep the pure hue.
 */
describe('eventStyle', () => {
    const hue = 'var(--stud-hue-violet, var(--stud-hue-default))';

    it('fills a resident bar with the hue and labels it in the on-hue ink', () => {
        expect(eventStyle('violet', true)).toEqual({
            backgroundColor: hue,
            borderColor: hue,
            color: 'var(--rbc-on-hue, var(--stud-on-hue))',
        });
    });

    it('dashes a virtual event in the pure hue and mixes its label toward the surface ink', () => {
        const style = eventStyle('violet', false);
        expect(style.backgroundColor).toBe('transparent');
        expect(style.border).toBe(`1.5px dashed ${hue}`);
        expect(style.color).toBe(`color-mix(in oklab, ${hue} 60%, var(--rbc-fg))`);
    });
});
