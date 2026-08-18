import type { CSSProperties } from 'react';
import type { SchemaNode } from '../types';

// A generic RJSF widget: a plain text input backed by a <datalist> of suggestions —
// pick one or type your own, never hard-restricted to the list (unlike an enum
// select). Opt in per-attr with `x-widget: 'combobox'` + `x-widget-options:
// {suggestions: [...]}`; the widget itself is context-free (no frame/PM knowledge).

interface ComboboxWidgetProps {
    id?: string;
    value?: unknown;
    disabled?: boolean;
    readonly?: boolean;
    schema?: SchemaNode;
    options?: { suggestions?: unknown[] };
    onChange: (value: unknown) => void;
}

const INPUT_STYLE: CSSProperties = {
    width: '100%',
    padding: '8px 10px',
    borderRadius: 8,
    border: '1px solid var(--stud-line-strong)',
    background: 'var(--stud-surface)',
    color: 'var(--stud-ink)',
    fontSize: 13,
};

function suggestions(props: ComboboxWidgetProps): string[] {
    const list = props.options?.suggestions;

    return Array.isArray(list) ? list.map(String) : [];
}

export function ComboboxWidget(props: ComboboxWidgetProps) {
    const { id, value, disabled, readonly, onChange } = props;
    const locked = Boolean(disabled || readonly);
    const listId = id ? `${id}-suggestions` : undefined;
    const opts = suggestions(props);

    return (
        <>
            <input
                id={id}
                type="text"
                data-widget="combobox"
                list={listId}
                value={value == null ? '' : String(value)}
                disabled={locked}
                onChange={(e) => onChange(e.target.value === '' ? undefined : e.target.value)}
                style={INPUT_STYLE}
            />
            {listId && opts.length > 0 && (
                <datalist id={listId}>
                    {opts.map((opt) => (
                        <option key={opt} value={opt} />
                    ))}
                </datalist>
            )}
        </>
    );
}
