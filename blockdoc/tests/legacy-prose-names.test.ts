import { describe, expect, it } from 'vitest';
import { LEGACY_PROSE_RENAME, legacyHeadingTag, normalizeLegacyNodeNames } from '../src/core/legacy-prose-names';

/**
 * EP-07c shared rename table + the normalize-on-load used for read-compat. This table
 * is the byte-identical mirror of laravel-blockdoc's `LegacyProseNodes` (PHP) and of
 * EP-07c B's migration; all three assert the same values (the PROOF shows they match).
 */
describe('the shared pre-07c -> post-07c rename table', () => {
    it('maps every level-independent prose node name to its JSX tag', () => {
        expect(LEGACY_PROSE_RENAME).toEqual({
            paragraph: 'p',
            bullet_list: 'ul',
            ordered_list: 'ol',
            list_item: 'li',
            code_block: 'pre',
            horizontal_rule: 'hr',
            hard_break: 'br',
        });
    });

    it('maps a heading level to h2..h6 (h2 floor, h6 ceiling, default 3)', () => {
        expect(legacyHeadingTag(1)).toBe('h2'); // floor: the page title owns the one h1
        expect(legacyHeadingTag(2)).toBe('h2');
        expect(legacyHeadingTag(3)).toBe('h3');
        expect(legacyHeadingTag(4)).toBe('h4');
        expect(legacyHeadingTag(5)).toBe('h5');
        expect(legacyHeadingTag(6)).toBe('h6');
        expect(legacyHeadingTag(7)).toBe('h6'); // ceiling
        expect(legacyHeadingTag(undefined)).toBe('h3'); // default
    });
});

describe('normalizeLegacyNodeNames', () => {
    it('renames nodes deep, drops the heading level attr, and leaves new names + components untouched', () => {
        const stored = {
            type: 'doc',
            content: [
                {
                    type: 'contentSection',
                    attrs: { id: 's1', heading: 'Intro' },
                    content: [
                        { type: 'heading', attrs: { id: 'h', level: 1 }, content: [{ type: 'text', text: 'T' }] },
                        { type: 'paragraph', attrs: { id: 'p' }, content: [{ type: 'text', text: 'x' }] },
                        { type: 'bullet_list', content: [{ type: 'list_item', content: [{ type: 'paragraph', content: [] }] }] },
                    ],
                },
            ],
        };

        expect(normalizeLegacyNodeNames(stored)).toEqual({
            type: 'doc',
            content: [
                {
                    type: 'contentSection',
                    attrs: { id: 's1', heading: 'Intro' },
                    content: [
                        { type: 'h2', attrs: { id: 'h' }, content: [{ type: 'text', text: 'T' }] },
                        { type: 'p', attrs: { id: 'p' }, content: [{ type: 'text', text: 'x' }] },
                        { type: 'ul', content: [{ type: 'li', content: [{ type: 'p', content: [] }] }] },
                    ],
                },
            ],
        });
    });

    it('does not mutate its input', () => {
        const input = { type: 'paragraph', content: [{ type: 'hard_break' }] };
        normalizeLegacyNodeNames(input);

        expect(input).toEqual({ type: 'paragraph', content: [{ type: 'hard_break' }] });
    });
});
