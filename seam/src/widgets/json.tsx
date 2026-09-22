import type { FieldProps } from '@rjsf/utils';
import { useEffect, useRef, useState } from 'react';

const invalidObjectMessage = 'Enter a valid JSON object.';

function parseObject(draft: string): object {
    const value: unknown = JSON.parse(draft);
    if (value === null || Array.isArray(value) || typeof value !== 'object') {
        throw new Error(invalidObjectMessage);
    }
    return value;
}

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
    // A controlled replay can replace the draft without an input event. Derive validation
    // from the displayed text so its accessible error cannot diverge from that text.
    let error: string | undefined;
    try {
        parseObject(text);
    } catch {
        error = invalidObjectMessage;
    }
    const lastValue = useRef(formData);
    useEffect(() => {
        if (formData !== lastValue.current) {
            lastValue.current = formData;
            setText(display(formData));
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
                    let value: object;
                    try {
                        value = parseObject(draft);
                    } catch {
                        lastValue.current = draft;
                        // Keep invalid text in form state: AJV must not submit the last valid object.
                        onChange(draft, fieldPathId.path, { __errors: [invalidObjectMessage] });
                        return;
                    }
                    lastValue.current = value;
                    onChange(value, fieldPathId.path);
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
