import type { CSSProperties } from 'react';
import type { SchemaNode } from '../types';

// A generic RJSF widget: render a numeric/enum rating as a row of clickable ★
// stars, two-way against formData. Opt in per-attr with `x-widget: 'star-rating'`.
// Context-free (no frame/PM knowledge).

interface StarRatingWidgetProps {
    id?: string;
    value?: unknown;
    disabled?: boolean;
    readonly?: boolean;
    schema?: SchemaNode;
    options?: { enumOptions?: unknown[] };
    onChange: (value: unknown) => void;
}

const ROW_STYLE: CSSProperties = { display: 'inline-flex', gap: 2, fontSize: 20, lineHeight: 1 };

const STAR_STYLE: CSSProperties = {
    background: 'none',
    border: 'none',
    padding: 0,
    cursor: 'pointer',
};

// The number of stars: an explicit `maximum`, else the enum/enumOptions length,
// else the conventional 5.
function maxStars(props: StarRatingWidgetProps): number {
    const schema = props.schema;

    if (typeof schema?.maximum === 'number') {
        return schema.maximum;
    }

    if (Array.isArray(schema?.enum)) {
        return schema.enum.length;
    }

    if (props.options?.enumOptions?.length) {
        return props.options.enumOptions.length;
    }

    return 5;
}

export function StarRatingWidget(props: StarRatingWidgetProps) {
    const { id, value, disabled, readonly, onChange } = props;
    const locked = Boolean(disabled || readonly);
    const current = Number(value) || 0;
    const max = maxStars(props);

    return (
        <div id={id} role="radiogroup" data-widget="star-rating" style={ROW_STYLE}>
            {Array.from({ length: max }, (_, index) => index + 1).map((star) => {
                const filled = star <= current;

                return (
                    <button
                        key={star}
                        type="button"
                        data-star={star}
                        role="radio"
                        aria-checked={star === current}
                        aria-label={`${star} star${star > 1 ? 's' : ''}`}
                        disabled={locked}
                        onClick={() => onChange(star)}
                        style={{ ...STAR_STYLE, color: filled ? 'var(--stud-star)' : 'var(--stud-line-strong)' }}
                    >
                        ★
                    </button>
                );
            })}
        </div>
    );
}
