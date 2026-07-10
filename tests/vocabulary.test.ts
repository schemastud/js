import { describe, expect, it } from 'vitest';
import type { RJSFSchema } from '@rjsf/utils';
import { createKeywordVocabulary } from '../src/vocabulary';
import { createFormValidator } from '../src/validator';

describe('keyword vocabulary', () => {
    it('always knows the form vocabulary this package consumes', () => {
        const vocabulary = createKeywordVocabulary();
        expect(vocabulary.isKnownKeyword('x-widget')).toBe(true);
        expect(vocabulary.isKnownKeyword('x-placeholder')).toBe(true);
        expect(vocabulary.isKnownKeyword('x-anything-else')).toBe(false);
    });

    it('accepts caller-supplied exact keywords and patterns — no hardcoded vendor dialect', () => {
        const vocabulary = createKeywordVocabulary({
            keywords: ['x-fragment'],
            patterns: [/^x-acme-/],
        });

        expect(vocabulary.isKnownKeyword('x-fragment')).toBe(true);
        expect(vocabulary.isKnownKeyword('x-acme-beat')).toBe(true);
        expect(vocabulary.isKnownKeyword('x-other-beat')).toBe(false);
    });
});

describe('form validator', () => {
    it('tolerates arbitrary extension keywords (strict mode off, all errors on)', () => {
        const validator = createFormValidator();
        const schema = {
            type: 'object',
            'x-kind': 'form',
            properties: {
                headline: {
                    type: 'string',
                    'x-widget': 'textarea',
                    'x-placeholder': 'Write…',
                    'x-acme-generate': true,
                },
                approved: { type: 'boolean', 'x-acme-pause': true },
            },
            required: ['headline'],
        };

        expect(validator.isValid(schema as RJSFSchema, { headline: 'hi' }, schema as RJSFSchema)).toBe(true);

        const result = validator.validateFormData({ approved: 'nope' }, schema as RJSFSchema);
        expect(result.errors.length).toBeGreaterThan(0);
    });
});
