import { describe, expect, it } from 'vitest';
import { InvalidRegistryKey, Key, createRegistry, createRegistryIndex } from '../src/index';
import { because, routingCases, section } from './corpus';

describe('routing', () => {
    const cases = routingCases();

    it('reads every entry of the section as a case or a comment', () => {
        const entries = section('routing');
        const comments = entries.filter((entry) => '$comment' in entry);

        expect(cases.length + comments.length).toBe(entries.length);

        for (const testCase of cases) {
            expect(Array.isArray(testCase.roots), because(testCase)).toBe(true);
            expect('key' in testCase && 'owner' in testCase, `${because(testCase)} (a routing case names a key and an owner)`).toBe(true);
        }
    });

    it.each(cases)('$roots routes $key to $owner', (testCase) => {
        const index = createRegistryIndex();

        for (const root of testCase.roots) {
            index.describe(createRegistry({ root }), 'tests/routing-corpus');
        }

        // A null key is the zero-segment root, which no string spells.
        const routed = index.routeTo(testCase.key ?? Key.root());

        if (testCase.owner === null) {
            expect(routed, because(testCase)).toBeNull();

            return;
        }

        if (testCase.owner === '') {
            expect(routed, because(testCase)).toBe(index);

            return;
        }

        expect(routed, because(testCase)).not.toBeNull();
        expect(routed, because(testCase)).not.toBe(index);
        expect(routed?.declaration.root.display, because(testCase)).toBe(testCase.owner);
    });

    it.each(cases.filter((testCase) => testCase.key !== null))('$key routes the same as a parsed key', (testCase) => {
        const index = createRegistryIndex();

        for (const root of testCase.roots) {
            index.describe(createRegistry({ root }), 'tests/routing-corpus');
        }

        expect(index.routeTo(Key.parse(testCase.key as string)), because(testCase)).toBe(index.routeTo(testCase.key as string));
    });

    it('refuses the empty string, which is not how the root is spelled', () => {
        const index = createRegistryIndex();

        expect(() => index.routeTo('')).toThrow(InvalidRegistryKey);
        expect(() => index.ownerOf('')).toThrow(InvalidRegistryKey);
        expect(index.routeTo(Key.root())).toBe(index);
    });
});
