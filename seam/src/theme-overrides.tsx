import { Theme as ShadcnTheme } from '@rjsf/shadcn';
import { getSubmitButtonOptions } from '@rjsf/utils';
import type { BaseInputTemplateProps, FieldTemplateProps, SubmitButtonProps, WidgetProps } from '@rjsf/utils';
import type { ComponentType } from 'react';
import { humanizeKey } from './display-label';

/**
 * Two corrections to @rjsf/shadcn's chrome, applied by `SchemaForm` as caller-overridable defaults.
 *
 * 1. FLUSH FIELDS. The theme wraps its text input, textarea and select in a `p-0.5` box, so every
 *    field sat 2px right of its own label and of the Submit button (beam VR pass 2: intake,
 *    regioninspector). A `-mx-0.5` wrapper cancels the horizontal inset and keeps the theme's
 *    markup, focus ring room above and below, and behaviour untouched.
 * 2. READABLE DISABLED SUBMIT. The theme's Button dims a disabled button with `opacity-50`. On a dark
 *    canvas that blends the bright primary AND its dark label into the backdrop: dark text on muted
 *    green, unreadable (intake `disabled` / `loading`). A disabled Submit instead takes a foreground
 *    tint of its surface and a dimmed foreground label, which read in both schemes and on page or
 *    card alike — the same treatment `@schemastud/ui`'s Button uses.
 */

/** Classes a disabled primary action takes instead of fading to half opacity. */
export const DISABLED_PRIMARY =
    'disabled:opacity-100 disabled:bg-foreground/10 disabled:text-foreground/55 disabled:shadow-none';

/** Cancels the theme's 2px horizontal field inset so a field shares its label's left edge. */
export const FLUSH_FIELD = '-mx-0.5';

function flush<P extends object>(Inner: ComponentType<P>, name: string): ComponentType<P> {
    const Flush = (props: P) => (
        <div className={FLUSH_FIELD} data-seam-flush="">
            <Inner {...props} />
        </div>
    );
    Flush.displayName = name;
    return Flush;
}

const theme = ShadcnTheme.templates!;

export const BaseInputTemplate = flush(
    theme.BaseInputTemplate as ComponentType<BaseInputTemplateProps>,
    'SeamBaseInputTemplate',
);
export const SelectWidget = flush(
    ShadcnTheme.widgets!.SelectWidget as ComponentType<WidgetProps>,
    'SeamSelectWidget',
);
export const TextareaWidget = flush(
    ShadcnTheme.widgets!.TextareaWidget as ComponentType<WidgetProps>,
    'SeamTextareaWidget',
);

const ThemeSubmitButton = theme.ButtonTemplates!.SubmitButton as ComponentType<SubmitButtonProps>;

/** The theme's Submit with {@link DISABLED_PRIMARY} ahead of any caller-supplied class. */
export function SubmitButton(props: SubmitButtonProps) {
    // Form hands Submit its options as `ui:options.submitButtonOptions` (with `disabled` folded in).
    const options = getSubmitButtonOptions(props.uiSchema);
    const className = [DISABLED_PRIMARY, options.props?.className].filter(Boolean).join(' ');
    return (
        <ThemeSubmitButton
            {...props}
            uiSchema={{
                'ui:options': { submitButtonOptions: { ...options, props: { ...options.props, className } } },
            }}
        />
    );
}

/** The label rule both a field template and a self-labelling widget apply: a declared title, else the key humanized. */
export function fieldLabel(label: string | undefined, schema: { title?: unknown } | undefined, uiSchema: unknown): string | undefined {
    const ui = (uiSchema ?? {}) as Record<string, unknown>;
    const declared = [ui['ui:title'], (ui['ui:options'] as Record<string, unknown> | undefined)?.title, schema?.title].find(
        (t): t is string => typeof t === 'string' && t.trim() !== '',
    );
    return declared ?? (label ? humanizeKey(label) : label);
}

/**
 * A field's label by displayLabel's property rule (app-walkthrough APP-09b, APP-21; owner-36), over `Inner`, the active
 * theme's field template. RJSF resolves a label as `ui:title`, then `schema.title`, then the raw property key, so an
 * untitled property was labelled "name", "model", "parent_tenant_id". A declared title still wins; the key fallback is
 * humanized. A theme-neutral rule: it wraps any theme. Caller templates win over it.
 */
export function labelledFieldTemplate(Inner: ComponentType<FieldTemplateProps>): ComponentType<FieldTemplateProps> {
    function SeamFieldTemplate(props: FieldTemplateProps) {
        return <Inner {...props} label={fieldLabel(props.label, props.schema, props.uiSchema) ?? ''} />;
    }
    return SeamFieldTemplate;
}

/**
 * The checkbox draws its OWN label from the raw key RJSF hands a widget (build.qa), so an untitled boolean read
 * "is_active" past the field template. Same rule, applied where the checkbox reads it, over the active theme's widget.
 */
export function labelledCheckboxWidget(Inner: ComponentType<WidgetProps>): ComponentType<WidgetProps> {
    function SeamCheckboxWidget(props: WidgetProps) {
        return <Inner {...props} label={fieldLabel(props.label, props.schema, props.uiSchema) ?? ''} />;
    }
    return SeamCheckboxWidget;
}
