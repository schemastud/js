import type { CSSProperties } from 'react';
import type { SchemaNode } from '../types';

// A generic RJSF widget: render an enum as a segmented button row (Badge-style),
// two-way against formData. Opt in per-attr with `x-widget: 'button-group'`; the
// widget itself is context-free (no frame/PM knowledge).

interface EnumOption {
    value: unknown;
    label: string;
}

// The RJSF WidgetProps subset this widget reads — kept loose so it mounts across
// an RJSF version bump without binding a version-specific prop shape.
interface ButtonGroupWidgetProps {
    id?: string;
    value?: unknown;
    disabled?: boolean;
    readonly?: boolean;
    schema?: SchemaNode;
    options?: { enumOptions?: EnumOption[] };
    onChange: (value: unknown) => void;
}

const ROW_STYLE: CSSProperties = { display: 'inline-flex', gap: 4, flexWrap: 'wrap' };

const BUTTON_STYLE: CSSProperties = {
    padding: '4px 12px',
    borderRadius: 999,
    border: '1px solid var(--stud-line-strong)',
    background: 'var(--stud-surface)',
    color: 'var(--stud-ink)',
    fontSize: 13,
    cursor: 'pointer',
};

const SELECTED_STYLE: CSSProperties = {
    ...BUTTON_STYLE,
    background: 'var(--stud-accent)',
    borderColor: 'var(--stud-accent)',
    color: 'var(--stud-surface)',
};

function enumOptions(props: ButtonGroupWidgetProps): EnumOption[] {
    if (props.options?.enumOptions?.length) {
        return props.options.enumOptions;
    }

    const values = props.schema?.enum;

    return Array.isArray(values) ? values.map((value) => ({ value, label: String(value) })) : [];
}

export function ButtonGroupWidget(props: ButtonGroupWidgetProps) {
    const { id, value, disabled, readonly, onChange } = props;
    const locked = Boolean(disabled || readonly);

    return (
        <div id={id} role="group" data-widget="button-group" style={ROW_STYLE}>
            {enumOptions(props).map((option) => {
                const selected = value === option.value;

                return (
                    <button
                        key={String(option.value)}
                        type="button"
                        data-value={String(option.value)}
                        aria-pressed={selected}
                        disabled={locked}
                        onClick={() => onChange(option.value)}
                        style={selected ? SELECTED_STYLE : BUTTON_STYLE}
                    >
                        {option.label}
                    </button>
                );
            })}
        </div>
    );
}
