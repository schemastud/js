import { describe, expect, it } from 'vitest';

import { scopeHeadingSelector } from './headings';

describe('scopeHeadingSelector', () => {
    it('distributes a container prefix across a comma-list', () => {
        expect(scopeHeadingSelector('.site-prose', 'h2[id], h3[id]')).toBe(
            '.site-prose h2[id], .site-prose h3[id]',
        );
    });

    it('returns the selector unchanged with no container', () => {
        expect(scopeHeadingSelector(undefined, 'h2[id], h3[id]')).toBe(
            'h2[id], h3[id]',
        );
    });

    it('trims whitespace around each comma part', () => {
        expect(scopeHeadingSelector('main', 'h2[id] ,  h3[id]')).toBe(
            'main h2[id], main h3[id]',
        );
    });
});
