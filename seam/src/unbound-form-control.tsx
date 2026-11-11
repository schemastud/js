import type { FieldPathId, Widget, WidgetProps } from '@rjsf/utils';
import { UnboundWidget } from './UnboundWidget';

const controls = new Map<string, Widget>();

/**
 * The form's control for an unbound name: the marker, as an RJSF widget (a primitive node) or field (a composite
 * node). One component per (name, context), so the form's uiSchema keeps its identity across renders. It draws no
 * label (the form's field template already does) and never calls `onChange`, so the value saves unchanged.
 */
export function unboundFormControl(name: string, context: string): Widget {
    const key = `${context}\u0000${name}`;
    let control = controls.get(key);
    if (!control) {
        // As a widget RJSF passes `id`; as a field (a composite node) RJSF 6 passes `fieldPathId` instead.
        const UnboundControl = (props: WidgetProps) => (
            <UnboundWidget
                context={context}
                name={name}
                pointer={props.id ?? (props as { fieldPathId?: FieldPathId }).fieldPathId?.$id}
            />
        );
        UnboundControl.displayName = `UnboundControl(${name})`;
        control = UnboundControl;
        controls.set(key, control);
    }
    return control;
}
