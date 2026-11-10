import { getDefaultRegistry, withTheme, type FormProps, type ThemeProps } from '@rjsf/core';
import { Theme as RjsfShadcnTheme } from '@rjsf/shadcn';
import type { FieldTemplateProps, ObjectFieldTemplateProps, WidgetProps } from '@rjsf/utils';
import { createContext, useContext, type ComponentType } from 'react';
import { groupedObjectFieldTemplate } from './GroupedObjectFieldTemplate';
import {
    BaseInputTemplate,
    SelectWidget,
    SubmitButton,
    TextareaWidget,
    labelledCheckboxWidget,
    labelledFieldTemplate,
} from './theme-overrides';
import { RadioWidget } from './widgets/radio';

/**
 * Seam's default theme: `@rjsf/shadcn`'s `Theme` with seam's shadcn-only corrections merged in — the flush
 * wrapper on text, select and textarea fields (its 2px inset), the readable disabled Submit (its
 * `opacity-50`), and the radio value fix (its index-encoded items). A host that wants shadcn untouched passes
 * `@rjsf/shadcn`'s own `Theme`.
 */
export const shadcnTheme: ThemeProps = {
    ...RjsfShadcnTheme,
    templates: {
        ...RjsfShadcnTheme.templates,
        BaseInputTemplate,
        ButtonTemplates: { ...RjsfShadcnTheme.templates?.ButtonTemplates, SubmitButton },
    },
    widgets: { ...RjsfShadcnTheme.widgets, RadioWidget, SelectWidget, TextareaWidget },
};

/**
 * The RJSF theme a seam form (and, later, a widget mounted outside a form) draws with, below the `theme` prop and
 * above the `shadcnTheme` default. A theme must be a stable object — a module constant or a memo — because one
 * themed form is built and cached per theme object.
 */
export const RjsfThemeContext = createContext<ThemeProps | null>(null);

/** The active theme: the prop, then the context, then `shadcnTheme`. */
export function useRjsfTheme(theme?: ThemeProps): ThemeProps {
    const fromContext = useContext(RjsfThemeContext);
    return theme ?? fromContext ?? shadcnTheme;
}

/**
 * `theme` with seam's three theme-neutral rules wrapped around its own templates: the label rule on the field
 * template and on the checkbox (which draws its own label), and the `x-group` / `x-tab` sections over the object
 * template. Where the theme supplies none, they wrap RJSF core's default.
 */
export function withNeutralRules(theme: ThemeProps): ThemeProps {
    const core = getDefaultRegistry();
    const templates = { ...core.templates, ...theme.templates };
    const widgets = { ...core.widgets, ...theme.widgets };
    return {
        ...theme,
        templates: {
            ...theme.templates,
            FieldTemplate: labelledFieldTemplate(templates.FieldTemplate as ComponentType<FieldTemplateProps>),
            ObjectFieldTemplate: groupedObjectFieldTemplate(
                templates.ObjectFieldTemplate as ComponentType<ObjectFieldTemplateProps>,
            ),
        },
        widgets: {
            ...theme.widgets,
            CheckboxWidget: labelledCheckboxWidget(widgets.CheckboxWidget as ComponentType<WidgetProps>),
        },
    };
}

const themedForms = new WeakMap<ThemeProps, ComponentType<FormProps>>();

/** The themed `Form` for `theme`, neutral rules included, built once per theme object (`withTheme` returns a new component type per call). */
export function themedForm(theme: ThemeProps): ComponentType<FormProps> {
    let form = themedForms.get(theme);
    if (!form) {
        form = withTheme(withNeutralRules(theme)) as ComponentType<FormProps>;
        themedForms.set(theme, form);
    }
    return form;
}
