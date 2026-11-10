// frame-foundation 34 (ruling 04 slice 5): the widget type is RJSF's. Compiled by seam's own typecheck (its tsconfig
// includes tests); a failing expectation here is a tsc error, so this file is the proof program.
import type { Field, FieldProps, Widget, WidgetProps } from '@rjsf/utils';
import type { FunctionComponent } from 'react';
import { asWidget, createRjsfRegistry, createWidgetRegistry, widgetProps } from '../src';
import type { WidgetResolution } from '../src/types';

const AWidget: Widget = (props: WidgetProps) => <span>{String(props.value)}</span>;
const AField: Field = (props: FieldProps) => <span>{String(props.formData)}</span>;
/** A component written to a prop no RJSF contract supplies. */
const NotRjsf = (props: { mustHave: string }) => <span>{props.mustHave}</span>;

const registry = createWidgetRegistry();

// A widget and a field are accepted, by registration and as a resolution.
registry.registerWidget('a-widget', AWidget);
registry.registerWidget('a-field', AField);
export const resolutions: WidgetResolution[] = [AWidget, AField, 'textarea', undefined];

// A component written to EITHER contract (blockdoc's rich content, 34's edit A) is both a Widget and a Field, and
// registers with no cast.
const Both: FunctionComponent<Partial<FieldProps> | Partial<WidgetProps>> = (props) => <span>{String(props.value ?? props.formData)}</span>;
registry.registerWidget('both', Both);
export const bothAsWidget: Widget = Both;
export const bothAsField: Field = Both;

// A component requiring a non-RJSF prop is rejected.
// @ts-expect-error `mustHave` is not a WidgetProps or FieldProps member
registry.registerWidget('not-rjsf', NotRjsf);
// @ts-expect-error nor is it a WidgetResolution
export const notAResolution: WidgetResolution = NotRjsf;

// `asWidget` keeps `(resolved: WidgetResolution) => Widget | undefined`; a Field passed to it compiles (20).
export const fromWidget: Widget | undefined = asWidget(AWidget);
export const fromField: Widget | undefined = asWidget(AField);

// `widgetProps()` is assignable to `WidgetProps`.
export const built: WidgetProps = widgetProps({
    registry: createRjsfRegistry({ rootSchema: { type: 'object' } }),
    schema: { type: 'string' },
    value: 'Ada',
    name: 'name',
    id: 'name',
});
