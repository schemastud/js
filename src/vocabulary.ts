import type { KeywordVocabulary, KeywordVocabularyConfig } from './types';

/**
 * Extension keywords this package itself consumes — the unprefixed form
 * vocabulary. Everything beyond these is caller territory: hosts declare
 * their own dialects through `createKeywordVocabulary`.
 */
export const FORM_KEYWORDS = ['x-widget', 'x-placeholder', 'x-widget-options'] as const;

/**
 * Build a keyword vocabulary from caller-supplied exact names and patterns.
 * The package hardcodes no vendor dialect; tolerance for a host's `x-*`
 * grammar is configured, not assumed.
 */
export function createKeywordVocabulary(config: KeywordVocabularyConfig = {}): KeywordVocabulary {
    const keywords = [...FORM_KEYWORDS, ...(config.keywords ?? [])];
    const patterns = [...(config.patterns ?? [])];

    function isKnownKeyword(keyword: string): boolean {
        return keywords.includes(keyword) || patterns.some((pattern) => pattern.test(keyword));
    }

    return { isKnownKeyword, keywords, patterns };
}
