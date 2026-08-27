import { describe, expect, it } from 'vitest';
import type { RJSFSchema } from '@rjsf/utils';

import { createFormValidator, defaultValidator } from '../src/validator';

/**
 * The dialect the estate's schemas are actually written in.
 *
 * `schemastud/laravel-data-schemas` stamps this `$schema` onto every generated document
 * (config key `data-schemas.schema_version`, default draft 2020-12). `@rjsf/validator-ajv8`
 * defaults to an AJV instance for **draft-07**, which has no 2020-12 meta-schema registered —
 * so AJV throws on the first `compile()`.
 *
 * The failure is invisible rather than loud: RJSF converts the throw into a ROOT-LEVEL error
 * with an empty property path, which a form rendering `showErrorList={false}` displays nowhere,
 * and `onSubmit` never fires. Measured behaviour: the first submit click after every page load
 * is swallowed, the second works (AJV caches the failure). Three hosts render forms this way.
 */
const GENERATED_SCHEMA: RJSFSchema = {
    $schema: 'https://json-schema.org/draft/2020-12/schema',
    $id: 'https://app.splicewire.com/schemas/compliance/merchant-declaration/1',
    type: 'object',
    properties: { name: { type: 'string' } },
    required: ['name'],
};

describe('createFormValidator', () => {
    it('reports NO error for valid data against a draft-2020-12 schema', () => {
        // The assertion is on `errors`, not on throwing: RJSF CATCHES AJV's throw and returns it
        // as a root-level error with an empty property path. Unfixed, this is
        // `[{ stack: 'no schema with key or ref "https://json-schema.org/draft/2020-12/schema"' }]`
        // on data that is perfectly valid — which is why the form silently refuses to submit
        // rather than showing anything a user could act on.
        const { errors } = defaultValidator.validateFormData({ name: 'x' }, GENERATED_SCHEMA);

        expect(errors).toEqual([]);
    });

    it('still reports real violations on such a schema', () => {
        const { errors } = defaultValidator.validateFormData({}, GENERATED_SCHEMA);

        expect(errors.length).toBeGreaterThan(0);
    });

    /** The draft-07 documents already in the estate must keep working. */
    it('still reports no error for valid data under draft-07', () => {
        const legacy: RJSFSchema = {
            $schema: 'http://json-schema.org/draft-07/schema#',
            type: 'object',
            properties: { name: { type: 'string' } },
        };

        expect(defaultValidator.validateFormData({ name: 'x' }, legacy).errors).toEqual([]);
    });

    /** And a schema with no dialect declared at all — the shape schemastud strips to. */
    it('reports no error for a schema with no $schema keyword', () => {
        const bare: RJSFSchema = { type: 'object', properties: { name: { type: 'string' } } };

        expect(defaultValidator.validateFormData({ name: 'x' }, bare).errors).toEqual([]);
    });

    it('lets a caller still override AjvClass', () => {
        expect(() => createFormValidator({ ajvOptionsOverrides: { allErrors: false } })).not.toThrow();
    });
});
