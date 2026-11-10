import type { FormProps, ThemeProps } from '@rjsf/core';
import type { RJSFSchema, UiSchema } from '@rjsf/utils';
import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { defaultRegistry } from './registry';
import { resolveExternalRefs } from './refs';
import { normalizeNullableRefs } from './nullable-refs';
import type { SchemaFetcher, SchemaNode, WidgetRegistry } from './types';
import { buildUiSchema, mergeUiSchema } from './ui-schema';
import { themedForm, useRjsfTheme } from './theme';
import { defaultValidator } from './validator';

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
    /**
     * The RJSF theme to draw with: any `ThemeProps` (what `withTheme` takes; `@rjsf/shadcn` exports one as
     * `Theme`). Absent, `RjsfThemeContext`, then seam's `shadcnTheme`. It must be a stable object (a module
     * constant or a memo). Seam's theme-neutral rules (field labels, `x-group` sections) wrap whichever theme
     * is active; the caller's `templates` and `widgets` still win over it.
     */
    theme?: ThemeProps;
}

/**
 * The base schema-form: RJSF on a theme (shadcn by default) driven by the widget
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
    templates,
    widgets,
    theme,
    ...rest
}: SchemaFormProps) {
    const ThemedForm = themedForm(useRjsfTheme(theme));
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

    // Only the nullable-`$ref` notation is bridged; the server's `required` reaches RJSF
    // verbatim, so the form blocks on exactly what the write path rejects.
    const formSchema = useMemo(
        () => (resolvedSchema ? normalizeNullableRefs(resolvedSchema) : null),
        [resolvedSchema],
    );

    const generatedUiSchema = useMemo(
        () => (formSchema ? buildUiSchema(formSchema, activeRegistry) : {}),
        [formSchema, activeRegistry],
    );

    if (!formSchema) {
        return null;
    }

    return (
        <ThemedForm
            schema={formSchema as RJSFSchema}
            uiSchema={mergeUiSchema(generatedUiSchema, uiSchema) as UiSchema}
            validator={validator ?? defaultValidator}
            // The theme (with seam's neutral rules wrapped round it) supplies templates and widgets;
            // `withTheme` merges these caller overrides over it, so they win.
            templates={templates}
            widgets={widgets}
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
