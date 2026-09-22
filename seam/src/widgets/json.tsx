import type { FieldProps } from '@rjsf/utils';
import { useEffect, useRef, useState } from 'react';

/** Plain JSON data entry for open objects, shared by raw and enriched forms. */
export function JsonField({
    formData,
    onChange,
    fieldPathId,
    schema,
    name,
    disabled,
    readonly,
}: FieldProps<unknown>) {
    const display = (value: unknown) =>
        typeof value === 'string' ? value : JSON.stringify(value ?? {}, null, 2);
    const [text, setText] = useState(() => display(formData));
    const [error, setError] = useState<string>();
    const lastValue = useRef(formData);
    useEffect(() => {
        if (formData !== lastValue.current) {
            lastValue.current = formData;
            setText(display(formData));
            setError(undefined);
        }
    }, [formData]);
    const id = fieldPathId.$id;
    return (
        <div>
            <label htmlFor={id}>{schema.title ?? name}</label>
            <textarea
                id={id}
                data-widget="json"
                value={text}
                disabled={disabled}
                readOnly={readonly}
                aria-invalid={Boolean(error)}
                aria-describedby={error ? `${id}-error` : undefined}
                rows={12}
                style={{
                    width: '100%',
                    padding: 10,
                    border: '1px solid var(--stud-line-strong)',
                    borderRadius: 8,
                    background: 'var(--stud-surface)',
                    color: 'var(--stud-ink)',
                    fontFamily: 'monospace',
                }}
                onChange={(event) => {
                    const draft = event.target.value;
                    setText(draft);
                    try {
                        const value: unknown = JSON.parse(draft);
                        if (value === null || Array.isArray(value) || typeof value !== 'object') {
                            throw new Error('Enter a JSON object.');
                        }
                        lastValue.current = value;
                        setError(undefined);
                        onChange(value, fieldPathId.path);
                    } catch {
                        const message = 'Enter a valid JSON object.';
                        lastValue.current = draft;
                        setError(message);
                        // Keep invalid text in form state: AJV must not submit the last valid object.
                        onChange(draft, fieldPathId.path, { __errors: [message] });
                    }
                }}
            />
            {error && (
                <p id={`${id}-error`} role="alert">
                    {error}
                </p>
            )}
        </div>
    );
}
