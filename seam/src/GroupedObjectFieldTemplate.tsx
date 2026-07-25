import { Theme as ShadcnTheme } from '@rjsf/shadcn';
import type { ComponentType } from 'react';
import type { ObjectFieldTemplateProps, RJSFSchema } from '@rjsf/utils';

type PropEl = ObjectFieldTemplateProps['properties'][number];

// The vendored shadcn default — reused verbatim for objects that declare no
// `x-group`, so nested and ungrouped objects render exactly as before. The theme's
// `templates.ObjectFieldTemplate` slot is typed as a loose union across the RJSF
// version surface; narrow it to the component it actually is at runtime so it can be
// rendered as JSX (and so the package's dts build stays green).
const DefaultObjectFieldTemplate = ShadcnTheme.templates?.ObjectFieldTemplate as
    | ComponentType<ObjectFieldTemplateProps>
    | undefined;

/**
 * Partition an object's properties into titled `x-group` sections (e.g. Basics /
 * Retrieval / Targets), turning one flat stack of inputs into a legible, sectioned
 * form. Group order is first-appearance and within-group order is declaration order,
 * so the single existing ordering axis (property/`ui:order`) drives both — no second
 * primitive. An object whose properties carry no `x-group` falls straight through to
 * the shadcn default, so nested/ungrouped objects are untouched.
 *
 * Wired once through `SchemaForm` (the shared RJSF mount), never per screen.
 */
export function GroupedObjectFieldTemplate(props: ObjectFieldTemplateProps) {
    const { properties, schema, title, description } = props;
    const propSchemas = (schema as RJSFSchema).properties as
        | Record<string, { 'x-group'?: unknown } | undefined>
        | undefined;

    const groupOf = (name: string): string | null => {
        const group = propSchemas?.[name]?.['x-group'];
        return typeof group === 'string' && group.length > 0 ? group : null;
    };

    // No section markers on this object → hand back to the default template so its
    // title/description/expand-button behaviour is preserved untouched.
    if (!properties.some((element) => groupOf(element.name))) {
        return DefaultObjectFieldTemplate ? (
            <DefaultObjectFieldTemplate {...props} />
        ) : (
            <div className="flex flex-col gap-4">
                {properties.map((element) => (
                    <div key={element.name} className={element.hidden ? 'hidden' : undefined}>
                        {element.content}
                    </div>
                ))}
            </div>
        );
    }

    const order: string[] = [];
    const buckets = new Map<string, PropEl[]>();
    const ungrouped: PropEl[] = [];
    for (const element of properties) {
        const group = groupOf(element.name);
        if (!group) {
            ungrouped.push(element);
            continue;
        }
        if (!buckets.has(group)) {
            buckets.set(group, []);
            order.push(group);
        }
        buckets.get(group)!.push(element);
    }

    const renderField = (element: PropEl) => (
        <div key={element.name} className={element.hidden ? 'hidden' : undefined}>
            {element.content}
        </div>
    );

    return (
        <div className="flex flex-col gap-6">
            {title ? <div className="text-base font-semibold text-foreground">{title}</div> : null}
            {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
            {ungrouped.length > 0 ? (
                <div className="flex flex-col gap-4">{ungrouped.map(renderField)}</div>
            ) : null}
            {order.map((group) => (
                <fieldset key={group} className="flex flex-col gap-4">
                    <legend className="mb-1 w-full border-b border-border pb-1 text-sm font-semibold text-foreground">
                        {group}
                    </legend>
                    {buckets.get(group)!.map(renderField)}
                </fieldset>
            ))}
        </div>
    );
}
