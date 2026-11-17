import type { ReactNode } from 'react';
import { renderHook } from '@testing-library/react';
import { englishStringTranslator, TranslatableString } from '@rjsf/utils';
import { describe, expect, it } from 'vitest';
import { MessageProvider } from '@schemastud/messages/react';
import catalog from '../messages.default.json';
import { rjsf67Keys, useFormTranslation } from '../src/messages';

// frame-foundation 63: seam covers the TranslatableString members RJSF 6.7.x added, and keeps covering every 6.6.2
// member. The suite runs against the 6.6.2 @rjsf/utils seam builds with; RJSF 6.7 hands translateString the member's
// value, so a 6.7 call is reproduced here by passing that value.

// The two members RJSF 6.7.1 adds (its @rjsf/utils lib/enums.js), by value.
const EXPAND_BUTTON = 'Expand Cycle';
const CYCLE_DETECTED =
    'Circular reference ($ref cycle) detected for field "%1". You may choose to expand to the next cycle break';

const spanish = (messages: Record<string, string>) => ({ children }: { children: ReactNode }) => (
    <MessageProvider
        value={{
            version: 1,
            locale: 'es',
            realm: null,
            direction: 'ltr',
            messages: Object.fromEntries(Object.entries(messages).map(([k, text]) => [k, { text, sourceLocale: 'es' }])),
        }}
    >
        {children}
    </MessageProvider>
);

describe('RJSF 6.7.x message keys', () => {
    it('resolve through seam: the active catalog localizes both, parameters included', () => {
        const { result } = renderHook(() => useFormTranslation(), {
            wrapper: spanish({
                'schemastud-seam::messages.rjsf.expand_button': 'Expandir ciclo',
                'schemastud-seam::messages.rjsf.cycle_detected': 'Referencia circular en el campo ":p1".',
            }),
        });
        const t = result.current.translateString as (s: string, p?: string[]) => string;
        expect(t(EXPAND_BUTTON)).toBe('Expandir ciclo');
        expect(t(CYCLE_DETECTED, ['nombre'])).toBe('Referencia circular en el campo "nombre".');
    });

    it('fall back to the source English, the same text RJSF 6.7 renders, when no catalog overrides them', () => {
        const { result } = renderHook(() => useFormTranslation());
        const t = result.current.translateString as (s: string, p?: string[]) => string;
        expect(t(EXPAND_BUTTON)).toBe('Expand Cycle');
        expect(t(CYCLE_DETECTED, ['name'])).toBe(
            'Circular reference ($ref cycle) detected for field "name". You may choose to expand to the next cycle break',
        );
    });

    it('are keyed by exactly the 6.7.1 values, each to a catalog key that exists', () => {
        expect(Object.keys(rjsf67Keys).sort()).toEqual([CYCLE_DETECTED, EXPAND_BUTTON].sort());
        for (const key of Object.values(rjsf67Keys)) expect(Object.hasOwn(catalog.messages, key)).toBe(true);
    });
});

describe('RJSF 6.6.2 behaviour stays covered', () => {
    const members = Object.values(TranslatableString) as string[];

    it('every member of the installed 6.6.2 enum resolves through the active catalog, not the English fallback', () => {
        expect(members).toHaveLength(37);
        const marked = Object.fromEntries(
            Object.keys(catalog.messages)
                .filter((k) => k.startsWith('schemastud-seam::messages.rjsf.'))
                .map((k) => [k, `[es] ${k}`]),
        );
        const { result } = renderHook(() => useFormTranslation(), { wrapper: spanish(marked) });
        for (const member of members) {
            expect(result.current.translateString(member as TranslatableString, ['a', 'b', 'c'])).toMatch(/^\[es\] schemastud-seam::messages\.rjsf\./);
        }
    });

    it('none of the 6.6.2 members collides with a 6.7 value key', () => {
        for (const value of Object.keys(rjsf67Keys)) expect(members).not.toContain(value);
    });

    it('a string seam has no key for still falls back to RJSF English', () => {
        const { result } = renderHook(() => useFormTranslation());
        const t = result.current.translateString as (s: string, p?: string[]) => string;
        expect(t('Some future %1 label', ['x'])).toBe(englishStringTranslator('Some future %1 label' as TranslatableString, ['x']));
    });
});
