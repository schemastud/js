import { customizeValidator } from '@rjsf/validator-ajv8';

/**
 * The package validator: AJV8 with `strict: false` so extension keywords
 * (whatever dialect the host's vocabulary declares) never trip strict-mode
 * rejection, and `allErrors: true` so forms surface every violation at once.
 */
export function createFormValidator(
    options?: Parameters<typeof customizeValidator>[0],
) {
    return customizeValidator({
        ...options,
        ajvOptionsOverrides: {
            strict: false,
            allErrors: true,
            ...options?.ajvOptionsOverrides,
        },
    });
}

export const defaultValidator = createFormValidator();
