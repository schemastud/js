import { describe, expect, it } from 'vitest';
import { SEGMENT_PATTERN, matchSegments } from '../src/grammar';
import { because, section } from './corpus';

// The PHP kernel's pattern, copied as written (Key::SEGMENT_PATTERN, less its `/` delimiters).
// It ends in `\z`, PHP's end-of-input anchor. JavaScript has no `\z`: it reads it as a literal `z`,
// so the copied pattern asks for a z and anchors nothing at the end.
const PHP_PATTERN_TEXT = String.raw`^[a-z0-9]+(?:[-_:][a-z0-9]+)*\z`;

const cases = section('grammar');
const legal = cases.filter((testCase) => testCase.segments !== null);

function wrongCases(pattern: RegExp) {
    return cases.filter((testCase) => JSON.stringify(matchSegments(testCase.input, pattern)) !== JSON.stringify(testCase.segments));
}

describe('the PHP pattern text does not port', () => {
    it('compiles in JavaScript without an error, which is why the corpus has to catch it', () => {
        expect(() => new RegExp(PHP_PATTERN_TEXT)).not.toThrow();
    });

    it('copied as written, rejects every legal key in the corpus that has no z to stop at', () => {
        const wrong = wrongCases(new RegExp(PHP_PATTERN_TEXT));
        const legalWithoutZ = legal.filter((testCase) => !testCase.input.includes('z'));

        expect(legalWithoutZ.length).toBeGreaterThan(0);
        expect(wrong.map((testCase) => testCase.input)).toEqual(legalWithoutZ.map((testCase) => testCase.input));
    });

    it('copied as written, has no end anchor at all: anything may follow a z', () => {
        const copied = new RegExp(PHP_PATTERN_TEXT);

        expect(matchSegments('beam', copied)).toBeNull();
        expect(matchSegments('beamz', copied)).toEqual(['beamz']);
        expect(matchSegments('beamz/NOT A KEY\n', copied)).toEqual(['beamz/NOT A KEY\n']);
        expect(matchSegments('beamz/NOT A KEY\n')).toBeNull();
    });

    it('the pattern this package uses gets every grammar case right', () => {
        expect(wrongCases(SEGMENT_PATTERN).map(because)).toEqual([]);
    });

    it('the pattern this package uses has no flags, so `$` is the end of input and not the end of a line', () => {
        expect(SEGMENT_PATTERN.flags).toBe('');
        expect(matchSegments('beam.realm\n')).toBeNull();
        expect(matchSegments('beam\n.realm')).toBeNull();
    });
});
