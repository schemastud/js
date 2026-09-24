import { Theme as ShadcnTheme } from '@rjsf/shadcn';
import type { WidgetProps } from '@rjsf/utils';
import { useRef, type ComponentType } from 'react';

const ThemeRadioWidget = ShadcnTheme.widgets?.RadioWidget as ComponentType<WidgetProps>;

// "Nothing emitted yet", distinct from every value the widget can hold (undefined included).
const NOT_EMITTED = Symbol('not-emitted');

/**
 * @rjsf/shadcn's RadioWidget, made to show the value it holds.
 *
 * The theme widget encodes each item's value by index ("0", "1", ...) but seeds Radix's RadioGroup
 * with the raw value ("page") as an uncontrolled `defaultValue`. The two never match, so a stored
 * enum value was never shown selected (editing a beam-ux-entry showed no Type radio; ux-demo screenshot
 * review 2026-09-24). Two corrections:
 *
 * - `optionValueFormat: 'realValue'` makes the items carry the real value, so they match the seed.
 *   The theme's decoder maps the string back to the typed enum value.
 * - `defaultValue` is read once, on mount. When the value changes from outside (a record arriving
 *   after the first render), the theme widget is remounted so it seeds from the new value. A value
 *   the widget itself just emitted does not remount it, so keyboard focus survives a click.
 */
export function RadioWidget(props: WidgetProps) {
    const emitted = useRef<unknown>(NOT_EMITTED);
    const seen = useRef<unknown>(props.value);
    const generation = useRef(0);

    if (!Object.is(props.value, seen.current)) {
        seen.current = props.value;
        if (!Object.is(props.value, emitted.current)) {
            generation.current += 1;
        }
        // Handled either way: a later outside change back to this value must remount too.
        emitted.current = NOT_EMITTED;
    }

    return (
        <ThemeRadioWidget
            key={generation.current}
            {...props}
            options={{ ...props.options, optionValueFormat: 'realValue' }}
            onChange={(value: unknown) => {
                emitted.current = value;
                props.onChange(value);
            }}
        />
    );
}
