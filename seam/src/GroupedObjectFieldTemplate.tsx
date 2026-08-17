import { Theme as ShadcnTheme } from '@rjsf/shadcn';
import { useState, type ComponentType, type ReactNode } from 'react';
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
 * A second, orthogonal keyword, `x-tab`, additionally partitions the resulting
 * `x-group` sections into tabs (e.g. a "Style" tab holding Classes + Style, an
 * "Advanced" tab holding Access + Attributes) — for forms dense enough that stacked
 * sections alone read as a technical settings dump rather than a legible surface. A
 * group's tab is its first property's `x-tab`; groups whose properties carry no
 * `x-tab` render above the tab strip, always visible. An object with `x-group` but no
 * `x-tab` anywhere renders exactly as before (stacked sections, no tabs) — fully
 * backward compatible.
 *
 * Wired once through `SchemaForm` (the shared RJSF mount), never per screen.
 */
export function GroupedObjectFieldTemplate(props: ObjectFieldTemplateProps) {
    const { properties, schema, title, description } = props;
    const propSchemas = (schema as RJSFSchema).properties as
        | Record<string, { 'x-group'?: unknown; 'x-tab'?: unknown } | undefined>
        | undefined;

    const groupOf = (name: string): string | null => {
        const group = propSchemas?.[name]?.['x-group'];
        return typeof group === 'string' && group.length > 0 ? group : null;
    };
    const tabOf = (name: string): string | null => {
        const tab = propSchemas?.[name]?.['x-tab'];
        return typeof tab === 'string' && tab.length > 0 ? tab : null;
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

    const renderGroup = (group: string) => (
        // `<fieldset>` carries a UA-stylesheet `min-width: min-content` that `flex`/`flex-col`
        // alone don't reset — inside a narrow panel (e.g. a fixed-width Inspector), that intrinsic
        // minimum forces wide children (a two-input key/value row) to overflow instead of shrink.
        // `min-w-0` on the fieldset itself is the actual fix (verified: without it, a 415px-wide
        // row blew out a 268px content box).
        <fieldset key={group} className="flex min-w-0 flex-col gap-4">
            <legend className="mb-1 w-full border-b border-border pb-1 text-sm font-semibold text-foreground">
                {group}
            </legend>
            {buckets.get(group)!.map(renderField)}
        </fieldset>
    );

    const header = (
        <>
            {title ? <div className="text-base font-semibold text-foreground">{title}</div> : null}
            {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
            {ungrouped.length > 0 ? (
                <div className="flex flex-col gap-4">{ungrouped.map(renderField)}</div>
            ) : null}
        </>
    );

    const tabOfGroup = new Map<string, string | null>();
    for (const group of order) tabOfGroup.set(group, tabOf(buckets.get(group)![0].name));
    const hasTabs = order.some((group) => tabOfGroup.get(group));

    if (!hasTabs) {
        return (
            <div className="flex flex-col gap-6">
                {header}
                {order.map(renderGroup)}
            </div>
        );
    }

    return (
        <TabbedGroups
            header={header}
            order={order}
            tabOfGroup={tabOfGroup}
            renderGroup={renderGroup}
        />
    );
}

function TabbedGroups({
    header,
    order,
    tabOfGroup,
    renderGroup,
}: {
    header: ReactNode;
    order: string[];
    tabOfGroup: Map<string, string | null>;
    renderGroup: (group: string) => ReactNode;
}) {
    const untabbed = order.filter((group) => !tabOfGroup.get(group));
    const tabOrder: string[] = [];
    const tabbedGroups = new Map<string, string[]>();
    for (const group of order) {
        const tab = tabOfGroup.get(group);
        if (!tab) continue;
        if (!tabbedGroups.has(tab)) {
            tabbedGroups.set(tab, []);
            tabOrder.push(tab);
        }
        tabbedGroups.get(tab)!.push(group);
    }

    const [active, setActive] = useState(tabOrder[0]);

    return (
        <div className="flex flex-col gap-6">
            {header}
            {untabbed.map(renderGroup)}
            <div role="tablist" className="flex gap-1 border-b border-border">
                {tabOrder.map((tab) => (
                    <button
                        key={tab}
                        type="button"
                        role="tab"
                        aria-selected={active === tab}
                        data-state={active === tab ? 'active' : 'inactive'}
                        className={
                            active === tab
                                ? 'border-b-2 border-primary px-3 py-2 text-sm font-medium text-foreground'
                                : 'border-b-2 border-transparent px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground'
                        }
                        onClick={() => setActive(tab)}
                    >
                        {tab}
                    </button>
                ))}
            </div>
            {tabOrder.map((tab) => (
                <div key={tab} role="tabpanel" hidden={active !== tab} className="flex flex-col gap-6">
                    {tabbedGroups.get(tab)!.map(renderGroup)}
                </div>
            ))}
        </div>
    );
}
