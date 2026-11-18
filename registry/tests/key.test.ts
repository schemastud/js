import { describe, expect, it } from 'vitest';
import { InvalidRegistryKey, Key, foreignKey, keysEqual } from '../src/index';

describe('the zero-segment root', () => {
    it('comes from its own constructor, with no segments and an empty display', () => {
        const root = Key.root();

        expect(root.segments).toEqual([]);
        expect(root.display).toBe('');
        expect(root.equals(Key.root())).toBe(true);
        expect(root.parent()).toBeNull();
    });

    it('is not what an empty string parses to', () => {
        expect(Key.tryParse('')).toBeNull();
        expect(() => Key.parse('')).toThrow(InvalidRegistryKey);
        expect(() => Key.of('')).toThrow(InvalidRegistryKey);
        expect(() => Key.parse('beam').isUnder('')).toThrow(InvalidRegistryKey);
    });

    it('is not the parent of a single-segment key', () => {
        expect(Key.parse('beam').parent()).toBeNull();
    });

    it('has every other key under it, and is under nothing', () => {
        expect(Key.parse('beam').isUnder(Key.root())).toBe(true);
        expect(Key.parse('beam.realm').isUnder(Key.root())).toBe(true);
        expect(Key.root().isUnder(Key.root())).toBe(false);
        expect(Key.root().isUnder('beam')).toBe(false);
    });

    it('cannot be made as a carried key', () => {
        expect(() => foreignKey([], '')).toThrow(InvalidRegistryKey);
    });
});

describe('a key that is not in the canonical grammar', () => {
    it('is carried as the segments and display it arrived with', () => {
        const key = foreignKey(['https://example.test/ns/Thing.v1'], 'https://example.test/ns/Thing.v1');

        expect(key.segments).toEqual(['https://example.test/ns/Thing.v1']);
        expect(key.display).toBe('https://example.test/ns/Thing.v1');
        expect(Key.tryParse(key.display)).toBeNull();
    });

    it('passes through Key.of untouched, never parsed from its display', () => {
        const key = foreignKey(['Not', 'Canonical'], 'Not/Canonical');

        expect(Key.of(key)).toBe(key);
    });

    it('is compared by segments, so a display that happens to parse does not decide identity', () => {
        const slashed = foreignKey(['beam', 'realm'], 'beam/realm');
        const oneSegment = foreignKey(['beam.realm'], 'beam.realm');
        const dotted = Key.parse('beam.realm');

        expect(dotted.equals(slashed)).toBe(true);
        expect(keysEqual(slashed, dotted)).toBe(true);
        expect(dotted.equals(oneSegment)).toBe(false);
        expect(Key.parse('beam.realm.overlays').isUnder(slashed)).toBe(true);
        expect(Key.parse('beam.realm.overlays').isUnder(oneSegment)).toBe(false);
    });

    it('does not change when the array it was made from changes', () => {
        const segments = ['beam', 'realm'];
        const key = foreignKey(segments, 'beam/realm');

        segments.push('overlays');

        expect(key.segments).toEqual(['beam', 'realm']);
    });
});

describe('Key', () => {
    it('passes a key through Key.of and parses a string', () => {
        const key = Key.parse('beam.realm');

        expect(Key.of(key)).toBe(key);
        expect(Key.of('beam.realm').segments).toEqual(['beam', 'realm']);
    });

    it('cannot have its segments changed', () => {
        const key = Key.parse('beam.realm');

        expect(() => (key.segments as string[]).push('overlays')).toThrow(TypeError);
        expect(key.display).toBe('beam.realm');
    });
});

describe('underRoot', () => {
    const root = Key.parse('beam.realm');

    it('joins the root onto a key that is not at or under it', () => {
        expect(Key.parse('overlays').underRoot(root).segments).toEqual(['beam', 'realm', 'overlays']);
        expect(Key.parse('beam.realms').underRoot(root).display).toBe('beam.realm.beam.realms');
        expect(Key.parse('beam').underRoot(root).display).toBe('beam.realm.beam');
    });

    it('leaves a key at or under the root untouched, so it is idempotent', () => {
        const under = Key.parse('beam.realm.overlays');

        expect(under.underRoot(root)).toBe(under);
        expect(root.underRoot(root)).toBe(root);
        expect(Key.parse('overlays').underRoot(root).underRoot(root).display).toBe('beam.realm.overlays');
    });

    it('is a no-op under the zero-segment root, and turns the zero-segment key into the root', () => {
        const key = Key.parse('beam');

        expect(key.underRoot(Key.root())).toBe(key);
        expect(Key.root().underRoot(root).display).toBe('beam.realm');
    });
});
