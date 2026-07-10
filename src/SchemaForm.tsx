import { withTheme, type FormProps } from '@rjsf/core';
import { Theme as ShadcnTheme } from '@rjsf/shadcn';
import type { RJSFSchema, UiSchema } from '@rjsf/utils';
import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { defaultRegistry } from './registry';
import { resolveExternalRefs } from './refs';
import { relaxNullableRequired } from './relax';
import type { SchemaFetcher, SchemaNode, WidgetRegistry } from './types';
import { buildUiSchema, mergeUiSchema } from './ui-schema';
import { defaultValidator } from './validator';

const ThemedForm = withTheme(ShadcnTheme);

/**
 * Hosts provide their own extended registry through this context (or the
 * `registry` prop); absent both, the package default singleton applies.
 */
export const WidgetRegistryContext = createContext<WidgetRegistry | null>(null);

export interface SchemaFormProps
    extends Omit<FormProps, 'schema' | 'uiSchema' | 'validator'> {
    schema: SchemaNode;
    uiSchema?: UiSchema;
    registry?: WidgetRegistry;
    /** Host-injected authed fetcher for external $refs; omit when the schema is self-contained. */
    schemaFetcher?: SchemaFetcher;
    validator?: FormProps['validator'];
}

/**
 * The base schema-form: RJSF (shadcn theme) driven by the predicate widget
 * registry, tolerant of extension keywords, with external $refs pre-resolved
 * through the injected fetcher.
 */
export function SchemaForm({
    schema,
    uiSchema,
    registry,
    schemaFetcher,
    validator,
    formData,
    formContext,
    ...rest
}: SchemaFormProps) {
    const contextRegistry = useContext(WidgetRegistryContext);
    const activeRegistry = registry ?? contextRegistry ?? defaultRegistry;

    // Some backends (PHP among them) serialize an empty associative payload as
    // [] — an array formData against an object schema silently fails
    // validation, so coerce it.
    const isObjectSchema =
        schema.type === 'object' || (Array.isArray(schema.type) && schema.type.includes('object'));
    const safeFormData = isObjectSchema && Array.isArray(formData) ? {} : formData;

    const [resolvedSchema, setResolvedSchema] = useState<SchemaNode | null>(
        schemaFetcher ? null : schema,
    );

    useEffect(() => {
        let cancelled = false;

        if (!schemaFetcher) {
            setResolvedSchema(schema);
            return;
        }

        setResolvedSchema(null);
        resolveExternalRefs(schema, schemaFetcher).then((resolved) => {
            if (!cancelled) setResolvedSchema(resolved);
        });

        return () => {
            cancelled = true;
        };
    }, [schema, schemaFetcher]);

    const relaxedSchema = useMemo(
        () => (resolvedSchema ? relaxNullableRequired(resolvedSchema) : null),
        [resolvedSchema],
    );

    const generatedUiSchema = useMemo(
        () => (relaxedSchema ? buildUiSchema(relaxedSchema, activeRegistry) : {}),
        [relaxedSchema, activeRegistry],
    );

    if (!relaxedSchema) {
        return null;
    }

    return (
        <ThemedForm
            schema={relaxedSchema as RJSFSchema}
            uiSchema={mergeUiSchema(generatedUiSchema, uiSchema) as UiSchema}
            validator={validator ?? defaultValidator}
            formData={safeFormData}
            // The injected fetcher rides formContext so fields that resolve
            // their own refs (rich-content manifests among them) share the
            // host's transport without extra plumbing.
            formContext={
                schemaFetcher
                    ? { ...(formContext as Record<string, unknown> | undefined), schemaFetcher }
                    : formContext
            }
            {...rest}
        />
    );
}
