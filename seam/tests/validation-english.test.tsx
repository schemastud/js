import { cleanup, renderHook } from '@testing-library/react';
import { afterEach, expect, it } from 'vitest';
import { defaultValidator } from '../src/validator';
import { useFormMessages } from '../src/messages';
import { validationEnglishCases } from './fixtures/validation-english';

afterEach(cleanup);
// Review B2 explicitly asks for this provider-free validator parity boundary.
// defaultValidator retains the original e9b5f62 AJV factory, without a localizer.
it.each(validationEnglishCases)('provider-free validation stays byte-identical: $name', ({ schema, data, keyword }) => {
    const { result } = renderHook(() => useFormMessages());
    const before = defaultValidator.validateFormData(data, schema).errors;
    const after = result.current.validator.validateFormData(data, schema).errors;
    expect(before.some(error => error.name === keyword)).toBe(true);
    expect(after.map(error => error.stack)).toEqual(before.map(error => error.stack));
    expect(after.map(error => error.params)).toEqual(before.map(error => error.params));
});
