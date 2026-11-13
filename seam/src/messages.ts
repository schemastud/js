import { englishStringTranslator, TranslatableString, type Registry } from '@rjsf/utils';
import { createFormValidator } from './validator';
import { useMessages } from '@schemastud/messages/react';
import { useMemo, useRef } from 'react';
import catalog from '../messages.default.json';

const keys = {
    [TranslatableString.ArrayItemTitle]: 'schemastud-seam::messages.rjsf.array_item_title',
    [TranslatableString.MissingItems]: 'schemastud-seam::messages.rjsf.missing_items',
    [TranslatableString.EmptyArray]: 'schemastud-seam::messages.rjsf.empty_array',
    [TranslatableString.YesLabel]: 'schemastud-seam::messages.rjsf.yes_label',
    [TranslatableString.NoLabel]: 'schemastud-seam::messages.rjsf.no_label',
    [TranslatableString.CloseLabel]: 'schemastud-seam::messages.rjsf.close_label',
    [TranslatableString.ErrorsLabel]: 'schemastud-seam::messages.rjsf.errors_label',
    [TranslatableString.NewStringDefault]: 'schemastud-seam::messages.rjsf.new_string_default',
    [TranslatableString.AddButton]: 'schemastud-seam::messages.rjsf.add_button',
    [TranslatableString.AddItemButton]: 'schemastud-seam::messages.rjsf.add_item_button',
    [TranslatableString.CopyButton]: 'schemastud-seam::messages.rjsf.copy_button',
    [TranslatableString.MoveDownButton]: 'schemastud-seam::messages.rjsf.move_down_button',
    [TranslatableString.MoveUpButton]: 'schemastud-seam::messages.rjsf.move_up_button',
    [TranslatableString.RemoveButton]: 'schemastud-seam::messages.rjsf.remove_button',
    [TranslatableString.NowLabel]: 'schemastud-seam::messages.rjsf.now_label',
    [TranslatableString.ClearLabel]: 'schemastud-seam::messages.rjsf.clear_label',
    [TranslatableString.AriaDateLabel]: 'schemastud-seam::messages.rjsf.aria_date_label',
    [TranslatableString.PreviewLabel]: 'schemastud-seam::messages.rjsf.preview_label',
    [TranslatableString.DecrementAriaLabel]: 'schemastud-seam::messages.rjsf.decrement_aria_label',
    [TranslatableString.IncrementAriaLabel]: 'schemastud-seam::messages.rjsf.increment_aria_label',
    [TranslatableString.OptionalObjectAdd]: 'schemastud-seam::messages.rjsf.optional_object_add',
    [TranslatableString.OptionalObjectRemove]: 'schemastud-seam::messages.rjsf.optional_object_remove',
    [TranslatableString.OptionalObjectEmptyMsg]: 'schemastud-seam::messages.rjsf.optional_object_empty_msg',
    [TranslatableString.Type]: 'schemastud-seam::messages.rjsf.type',
    [TranslatableString.Value]: 'schemastud-seam::messages.rjsf.value',
    [TranslatableString.ClearButton]: 'schemastud-seam::messages.rjsf.clear_button',
    [TranslatableString.UnknownFieldType]: 'schemastud-seam::messages.rjsf.unknown_field_type',
    [TranslatableString.OptionPrefix]: 'schemastud-seam::messages.rjsf.option_prefix',
    [TranslatableString.TitleOptionPrefix]: 'schemastud-seam::messages.rjsf.title_option_prefix',
    [TranslatableString.KeyLabel]: 'schemastud-seam::messages.rjsf.key_label',
    [TranslatableString.DeprecatedLabel]: 'schemastud-seam::messages.rjsf.deprecated_label',
    [TranslatableString.InvalidObjectField]: 'schemastud-seam::messages.rjsf.invalid_object_field',
    [TranslatableString.UnsupportedField]: 'schemastud-seam::messages.rjsf.unsupported_field',
    [TranslatableString.UnsupportedFieldWithId]: 'schemastud-seam::messages.rjsf.unsupported_field_with_id',
    [TranslatableString.UnsupportedFieldWithReason]: 'schemastud-seam::messages.rjsf.unsupported_field_with_reason',
    [TranslatableString.UnsupportedFieldWithIdAndReason]: 'schemastud-seam::messages.rjsf.unsupported_field_with_id_and_reason',
    [TranslatableString.FilesInfo]: 'schemastud-seam::messages.rjsf.files_info',
} satisfies Record<TranslatableString, keyof typeof catalog.messages>;

// Only registered AJV keywords address catalog keys. Custom diagnostic text is
// never treated as a key. Parameters are copied as scalars; RJSF owns its title
// quoting and the originals are left intact for its subsequent projection.
const validationKeys = {
    required: 'schemastud-seam::messages.validation.required',
    type: 'schemastud-seam::messages.validation.type',
    enum: 'schemastud-seam::messages.validation.enum',
    const: 'schemastud-seam::messages.validation.const',
    additionalProperties: 'schemastud-seam::messages.validation.additionalProperties',
    minLength: 'schemastud-seam::messages.validation.minLength',
    maxLength: 'schemastud-seam::messages.validation.maxLength',
    minItems: 'schemastud-seam::messages.validation.minItems',
    maxItems: 'schemastud-seam::messages.validation.maxItems',
    minProperties: 'schemastud-seam::messages.validation.minProperties',
    maxProperties: 'schemastud-seam::messages.validation.maxProperties',
    minimum: 'schemastud-seam::messages.validation.minimum',
    maximum: 'schemastud-seam::messages.validation.maximum',
    exclusiveMinimum: 'schemastud-seam::messages.validation.exclusiveMinimum',
    exclusiveMaximum: 'schemastud-seam::messages.validation.exclusiveMaximum',
    multipleOf: 'schemastud-seam::messages.validation.multipleOf',
    pattern: 'schemastud-seam::messages.validation.pattern',
    format: 'schemastud-seam::messages.validation.format',
    uniqueItems: 'schemastud-seam::messages.validation.uniqueItems',
    anyOf: 'schemastud-seam::messages.validation.anyOf',
    oneOf: 'schemastud-seam::messages.validation.oneOf',
    not: 'schemastud-seam::messages.validation.not',
    propertyNames: 'schemastud-seam::messages.validation.propertyNames',
    if: 'schemastud-seam::messages.validation.if',
    additionalItems: 'schemastud-seam::messages.validation.additionalItems',
    items: 'schemastud-seam::messages.validation.items',
    unevaluatedItems: 'schemastud-seam::messages.validation.unevaluatedItems',
    unevaluatedProperties: 'schemastud-seam::messages.validation.unevaluatedProperties',
    contains: 'schemastud-seam::messages.validation.contains',
    contains_range: 'schemastud-seam::messages.validation.contains_range',
    dependencies: 'schemastud-seam::messages.validation.dependencies',
    dependencies_many: 'schemastud-seam::messages.validation.dependencies_many',
    dependentRequired: 'schemastud-seam::messages.validation.dependentRequired',
    dependentRequired_many: 'schemastud-seam::messages.validation.dependentRequired_many',
} satisfies Record<string, keyof typeof catalog.messages>;

/** Provider values stay in the host's one message context; a form creates no provider. */
export function useFormMessages(options?: Parameters<typeof createFormValidator>[0]) {
    const messages = useMessages(catalog.messages);
    const translateString = useMemo<Registry['translateString']>(() => (string, parameters = []) => {
        const key = keys[string];
        if (!key) return englishStringTranslator(string, parameters);
        const replacements: Record<string, string> = {};
        parameters.forEach((value, index) => { replacements['p' + (index + 1)] = value; });
        return messages.t(key, replacements);
    }, [messages]);
    const validator = useMemo(() => createFormValidator(options, (errors) => {
        for (const error of errors ?? []) {
            let keyword = error.keyword;
            if (keyword === 'contains' && error.params.maxContains !== undefined) keyword = 'contains_range';
            if ((keyword === 'dependencies' || keyword === 'dependentRequired') && error.params.depsCount !== 1) keyword += '_many';
            if (!Object.hasOwn(validationKeys, keyword)) continue;
            const key = validationKeys[keyword as keyof typeof validationKeys];
            const parameters: Record<string, string | number | boolean | null> = {};
            for (const [name, value] of Object.entries(error.params)) {
                if (value === null || typeof value === 'string' || typeof value === 'boolean' || (typeof value === 'number' && Number.isFinite(value))) parameters[name] = value;
                else if (Array.isArray(value) && value.every(item => typeof item === 'string')) parameters[name] = value.join(',');
            }
            // RJSF quotes these parameters before invoking a localizer. AJV's
            // original dependency English does not quote them. Undo only that
            // wrapper on copied values; RJSF still owns/restores error.params.
            if (error.keyword === 'dependencies' || error.keyword === 'dependentRequired') {
                if (typeof parameters.property === 'string') parameters.property = parameters.property.slice(1, -1);
                if (typeof parameters.deps === 'string') parameters.deps = parameters.deps.split(', ').map(value => value.slice(1, -1)).join(', ');
            }
            const count = typeof parameters.limit === 'number' ? parameters.limit
                : typeof parameters.depsCount === 'number' ? parameters.depsCount
                : typeof parameters.minContains === 'number' ? parameters.minContains : undefined;
            error.message = count === undefined ? messages.t(key, parameters)
                : messages.choice(key, count, parameters);
        }
    }), [messages, options]);
    return { messages, translateString, validator };
}


/** A public localized validator for hosts that supply their own AJV options. */
export function useFormValidator(options?: Parameters<typeof createFormValidator>[0]) {
    return useFormMessages(options).validator;
}

export const FORM_COPY_REVISION = 'schemastud-seam:copy-revision';

/** RJSF deep-compares props but considers functions equal; change visible data too. */
export function useFormCopyRevision(...values: readonly unknown[]) {
    const previous = useRef({ values, revision: 0 });
    if (values.some((value, index) => value !== previous.current.values[index])) {
        previous.current = { values, revision: previous.current.revision + 1 };
    }
    return previous.current.revision;
}
