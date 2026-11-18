import { describe, expect, it } from 'vitest';
import { InvalidRegistryKey, Key } from '../src/index';
import { because, section } from './corpus';

describe('grammar', () => {
    const cases = section('grammar');

    it.each(cases)('tryParse($input)', (testCase) => {
        const parsed = Key.tryParse(testCase.input);

        if (testCase.segments === null) {
            expect(parsed, because(testCase)).toBeNull();

            return;
        }

        expect(parsed?.segments, because(testCase)).toEqual(testCase.segments);
        expect(String(parsed), because(testCase)).toBe(testCase.input);
        expect(parsed?.display, because(testCase)).toBe(testCase.input);
    });

    it.each(cases)('parse($input) throws on an illegal key and never repairs it', (testCase) => {
        if (testCase.segments === null) {
            expect(() => Key.parse(testCase.input), because(testCase)).toThrow(InvalidRegistryKey);

            return;
        }

        expect(Key.parse(testCase.input).segments, because(testCase)).toEqual(testCase.segments);
    });

    it.each(cases.filter((testCase) => testCase.segments !== null))('$input survives a second parse of its own rendering', (testCase) => {
        expect(String(Key.parse(String(Key.parse(testCase.input)))), because(testCase)).toBe(testCase.input);
    });
});

describe('equality', () => {
    it.each(section('equality'))('$a equals $b: $equal', (testCase) => {
        const a = Key.parse(testCase.a);
        const b = Key.parse(testCase.b);

        expect(a.equals(b), because(testCase)).toBe(testCase.equal);
        expect(b.equals(a), because(testCase)).toBe(testCase.equal);
    });
});

describe('hierarchy', () => {
    it.each(section('hierarchy'))('%j', (testCase) => {
        const key = Key.parse(testCase.key);
        const asksParent = 'parent' in testCase;
        const asksUnder = 'isUnder' in testCase;

        // A case in a shape this driver does not read would otherwise pass without asserting.
        expect(asksParent || asksUnder, `${because(testCase)} (neither a parent case nor an isUnder case)`).toBe(true);

        if (asksParent) {
            expect(key.parent()?.display ?? null, because(testCase)).toBe(testCase.parent);
        }

        if (asksUnder) {
            expect(testCase.under, `${because(testCase)} (an isUnder case names no \`under\`)`).toBeTypeOf('string');
            expect(key.isUnder(testCase.under as string), because(testCase)).toBe(testCase.isUnder);
            expect(key.isUnder(Key.parse(testCase.under as string)), because(testCase)).toBe(testCase.isUnder);
        }
    });
});
