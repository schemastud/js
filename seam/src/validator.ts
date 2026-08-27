import { customizeValidator } from '@rjsf/validator-ajv8';
import Ajv2020 from 'ajv/dist/2020';
import draft07MetaSchema from 'ajv/dist/refs/json-schema-draft-07.json';

/**
 * The package validator: AJV with `strict: false` so extension keywords
 * (whatever dialect the host's vocabulary declares) never trip strict-mode
 * rejection, and `allErrors: true` so forms surface every violation at once.
 *
 * ## Why `AjvClass` is set, and why a version bump is NOT the fix
 *
 * `@rjsf/validator-ajv8`'s default export is an AJV instance for **draft-07**. Having AJV v8
 * installed does not help: v8's default export is *also* the draft-07 dialect. Only
 * `ajv/dist/2020` speaks 2020-12, so the class swap is what does the work — the dependency
 * version merely decides whether that subpath resolves. Do not "simplify" this to a bump.
 *
 * It matters because `schemastud/laravel-data-schemas` stamps
 * `"$schema": "https://json-schema.org/draft/2020-12/schema"` onto every generated document
 * (`data-schemas.schema_version`), and a generated schema is what these forms are handed.
 *
 * The failure mode is silent, which is why it survived. AJV throws on the first `compile()`;
 * RJSF catches that and returns it as a **root-level** error with an empty property path, so a
 * form rendering `showErrorList={false}` shows nothing and `onSubmit` never fires. Measured:
 * the first submit click after every page load is swallowed and the second works, because AJV
 * caches the failure. `strict: false` does **not** suppress it — the meta-schema is genuinely
 * absent, not merely unrecognised.
 *
 * ## Why draft-07 is registered alongside it
 *
 * Swapping the class is not a superset move — `Ajv2020` does not know draft-07's meta-schema, so
 * the swap alone turns the same silent failure around on every hand-authored draft-07 document,
 * and the estate has both kinds. A regression test caught this; it is not theoretical.
 * `additionalMetaSchemas` teaches the 2020-12 instance the older dialect so both validate.
 *
 * `AjvClass` sits before the caller's spread, so a consumer can still override it.
 */
export function createFormValidator(
    options?: Parameters<typeof customizeValidator>[0],
) {
    return customizeValidator({
        AjvClass: Ajv2020,
        ...options,
        additionalMetaSchemas: [
            draft07MetaSchema as object,
            ...(options?.additionalMetaSchemas ?? []),
        ],
        ajvOptionsOverrides: {
            strict: false,
            allErrors: true,
            ...options?.ajvOptionsOverrides,
        },
    });
}

export const defaultValidator = createFormValidator();
