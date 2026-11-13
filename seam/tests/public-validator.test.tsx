import { cleanup, renderHook } from '@testing-library/react';
import { afterEach, expect, it } from 'vitest';
import { MessageProvider } from '@schemastud/messages/react';
import * as seam from '../src/index';

afterEach(cleanup);
it('the public localized validator hook preserves custom AJV options', () => {
    const options = { customFormats: { ticket: (_value: string) => false } };
    const { result } = renderHook(() => seam.useFormValidator(options), { wrapper: ({ children }) =>
        <MessageProvider value={{ version: 1, locale: 'es', realm: null, direction: 'ltr', messages: {
            'schemastud-seam::messages.validation.format': { text: 'formato :format', sourceLocale: 'es' },
        } }}>{children}</MessageProvider>,
    });
    const errors = result.current.validateFormData('bad', { type: 'string', format: 'ticket' }).errors;
    expect(errors.map(error => error.message)).toEqual(['formato ticket']);
});
