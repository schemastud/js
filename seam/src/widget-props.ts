import Form, { type ThemeProps } from '@rjsf/core';
import {
    TranslatableString,
    createSchemaUtils,
    getSchemaType,
    getUiOptions,
    isObject,
    optionsList,
    type EnumOptionsType,
    type Registry,
    type RJSFSchema,
    type UiSchema,
    type ValidatorType,
    type Widget,
    type WidgetProps,
} from '@rjsf/utils';
import { useMemo } from 'react';
import { fieldLabel } from './theme-overrides';
import { liftEnumNames } from './ui-schema';
import { shadcnTheme, useRjsfTheme, withNeutralRules } from './theme';
import type { SchemaNode, WidgetResolution } from './types';
import { defaultValidator } from './validator';
import { FORM_COPY_REVISION, useFormCopyRevision, useFormMessages } from './messages';

export interface RjsfRegistryOptions {
    /** The resource's root schema — the document a `$ref` points into — never the node alone. */
    rootSchema: SchemaNode;
    /** Default: seam's `shadcnTheme`, as `SchemaForm`'s. Seam's theme-neutral rules wrap it, as in the form. */
    theme?: ThemeProps;
    /** Default: seam's `defaultValidator`. */
    validator?: ValidatorType;
    formContext?: Record<string, unknown>;
    /** Explicit translator for a pure registry; the hook supplies the active catalog. */
    translateString?: Registry['translateString'];
}

/**
 * An RJSF registry built from RJSF's own exports, never by mounting a form (ruling 04 §2): `Form.getRegistry`
 * over the theme's fields, widgets and templates (with seam's neutral rules), and schema utilities over the root.
 */
export function createRjsfRegistry({ rootSchema, theme = shadcnTheme, validator, formContext, translateString }: RjsfRegistryOptions): Registry {
    const themed = withNeutralRules(theme);
    const schemaUtils = createSchemaUtils(validator ?? defaultValidator, rootSchema as RJSFSchema);
    return Form.getRegistry(
        { schema: rootSchema as RJSFSchema, validator: validator ?? defaultValidator, fields: themed.fields, widgets: themed.widgets, templates: themed.templates, formContext, translateString },
        rootSchema as RJSFSchema,
        schemaUtils,
    );
}

/**
 * The registry a surface shares across its fields or cells: the theme read as `SchemaForm` reads it
 * (`RjsfThemeContext`, else `shadcnTheme`), memoized on its inputs.
 */
export function useRjsfRegistry(rootSchema: SchemaNode, formContext?: Record<string, unknown>): Registry {
    const theme = useRjsfTheme();
    const { messages, translateString, validator } = useFormMessages();
    const copyRevision = useFormCopyRevision(messages, validator, translateString);
    return useMemo(() => createRjsfRegistry({ rootSchema, theme, validator, translateString,
        formContext: { ...formContext, [FORM_COPY_REVISION]: copyRevision },
    }), [rootSchema, theme, formContext, validator, translateString, copyRevision]);
}

/** Ruling 04 §1: what a mount site hands `widgetProps`. */
export interface WidgetMountInput {
    /** From `useRjsfRegistry` / `createRjsfRegistry`, built over the resource's root schema. */
    registry: Registry;
    /** The node as the schema carries it; the builder resolves it as RJSF's `SchemaField` does. */
    schema: SchemaNode;
    value: unknown;
    /** The property key; `''` at the root. */
    name: string;
    /** Unique per mount; the mount site calls React's `useId`. */
    id: string;
    /** What the resolver hands over for this node (ticket 07's `ResolvedWidget.options`). */
    options?: Record<string, unknown>;
    /** Default: seam's label rule — a declared title, else the key humanized. */
    label?: string;
    /** Default `true`: outside a form a widget is read-only unless the site says so. */
    readonly?: boolean;
    disabled?: boolean;
    required?: boolean;
    autofocus?: boolean;
    placeholder?: string;
    uiSchema?: UiSchema;
    onChange?: (value: unknown) => void;
    onBlur?: (id: string, value: unknown) => void;
    onFocus?: (id: string, value: unknown) => void;
}

const noop = () => {};

/** The choices RJSF's leaf field for the resolved type would compute (`BooleanField`, `StringField`). */
function choicesFor(schema: RJSFSchema, uiSchema: UiSchema, registry: Registry): EnumOptionsType<RJSFSchema>[] | undefined {
    const type = getSchemaType(schema);
    const types = Array.isArray(type) ? type.filter((t) => t !== 'null') : [type];
    if (types.length !== 1) return undefined;

    if (types[0] === 'boolean') {
        const yes = registry.translateString(TranslatableString.YesLabel);
        const no = registry.translateString(TranslatableString.NoLabel);
        if (Array.isArray(schema.oneOf)) {
            return optionsList(
                {
                    oneOf: schema.oneOf
                        .filter((option): option is RJSFSchema => isObject(option))
                        .map((option) => ({ ...option, title: option.title || (option.const === true ? yes : no) })),
                } as RJSFSchema,
                uiSchema,
            );
        }
        const enums = schema.enum ?? [true, false];
        // As BooleanField reads it: through the uiSchema's options, with the registry's global options.
        const { enumNames } = getUiOptions(uiSchema, registry.globalUiOptions);
        if (!enumNames && enums.length === 2 && enums.every((v) => typeof v === 'boolean')) {
            return enums.map((value) => ({ value, label: value ? yes : no }));
        }
        return optionsList({ enum: enums } as RJSFSchema, uiSchema);
    }

    if (types[0] === 'string' || types[0] === 'number' || types[0] === 'integer') {
        return registry.schemaUtils.isSelect(schema) ? optionsList(schema, uiSchema) : undefined;
    }

    return undefined;
}

/**
 * RJSF `WidgetProps` for a widget mounted outside a form (ruling 04 §1). The node is resolved as `SchemaField`
 * resolves it (`$ref`, `allOf`), and its choices are built as the leaf field builds them, so a stock widget
 * shows the choices and the selection the form would. `hideLabel` is true: the surface draws the label.
 */
export function widgetProps(input: WidgetMountInput): WidgetProps {
    const { registry, value, name, id } = input;
    const schema = registry.schemaUtils.retrieveSchema(input.schema as RJSFSchema, value);
    // Ticket 44's rule on the resolved node (no read surface holds a uiSchema): a schema `enumNames` becomes
    // `ui:enumNames` unless the caller set its own, and the widget receives the lifted uiSchema.
    const uiSchema = liftEnumNames(schema as SchemaNode, input.uiSchema ?? {}) as UiSchema;
    const enumOptions = choicesFor(schema, uiSchema, registry);
    const readonly = input.readonly ?? true;
    const disabled = input.disabled ?? false;
    const options = {
        ...input.options,
        ...(enumOptions ? { enumOptions } : {}),
        // A locked widget offers no action that writes. RJSF's alt-date widgets draw their Now and Clear buttons
        // whatever `readonly` says, and hide them only through these two options of their own.
        ...(readonly || disabled ? { hideNowButton: true, hideClearButton: true } : {}),
    };

    return {
        id,
        name,
        value,
        schema,
        uiSchema,
        registry,
        options,
        label: input.label ?? fieldLabel(name, schema, uiSchema) ?? '',
        hideLabel: true,
        readonly,
        disabled,
        required: input.required ?? false,
        autofocus: input.autofocus ?? false,
        placeholder: input.placeholder ?? '',
        rawErrors: [],
        onChange: input.onChange ?? noop,
        onBlur: input.onBlur ?? noop,
        onFocus: input.onFocus ?? noop,
    } as WidgetProps;
}

/**
 * Narrow a resolved widget to RJSF's `Widget` for a mount site that takes the widget contract. A name (an RJSF
 * stock name) or a miss is `undefined`: whether a read surface mounts a stock name is ticket 01's call, through
 * RJSF's `getWidget`.
 */
export function asWidget(resolved: WidgetResolution): Widget | undefined {
    return resolved === undefined || typeof resolved === 'string' ? undefined : (resolved as Widget);
}
