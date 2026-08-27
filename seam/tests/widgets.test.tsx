import { fireEvent, render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { defaultRegistry } from '../src/registry';
import { ButtonGroupWidget } from '../src/widgets/button-group';
import { StarRatingWidget } from '../src/widgets/star-rating';

describe('x-widget presentation widgets', () => {
    it('resolves button-group / star-rating by x-widget on the default registry', () => {
        expect(
            defaultRegistry.resolveWidget({ type: 'string', enum: ['a', 'b'], 'x-widget': 'button-group' }),
        ).toBe(ButtonGroupWidget);
        expect(
            defaultRegistry.resolveWidget({ type: 'integer', maximum: 5, 'x-widget': 'star-rating' }),
        ).toBe(StarRatingWidget);
    });

    it('does not disturb the cardinality default when x-widget is absent', () => {
        // A small enum with no x-widget still falls to the existing radio default.
        expect(defaultRegistry.resolveWidget({ type: 'string', enum: ['a', 'b'] })).toBe('radio');
    });

    describe('button-group', () => {
        it('renders one button per enum option and is two-way', () => {
            const onChange = vi.fn();
            const { container, getByText } = render(
                <ButtonGroupWidget
                    schema={{ type: 'string', enum: ['low', 'high'] }}
                    options={{ enumOptions: [{ value: 'low', label: 'Low' }, { value: 'high', label: 'High' }] }}
                    value="low"
                    onChange={onChange}
                />,
            );

            const buttons = container.querySelectorAll('[data-widget="button-group"] button');
            expect(buttons).toHaveLength(2);
            expect(container.querySelector('[data-value="low"]')?.getAttribute('aria-pressed')).toBe('true');

            fireEvent.click(getByText('High'));
            expect(onChange).toHaveBeenCalledWith('high');
        });
    });

    describe('star-rating', () => {
        it('renders `maximum` stars, fills to the current value, and is two-way', () => {
            const onChange = vi.fn();
            const { container } = render(
                <StarRatingWidget schema={{ type: 'integer', maximum: 5 }} value={3} onChange={onChange} />,
            );

            const stars = container.querySelectorAll('[data-star]');
            expect(stars).toHaveLength(5);

            // First three stars filled, last two empty. Asserted on the TOKEN, not on a resolved
            // colour: `23ffcf4` moved this widget's inline colour from the literal `#f59e0b` to
            // `var(--stud-star)` and left this line asserting `rgb(245, 158, 11)`. jsdom does not
            // resolve custom properties in `style.color`, so the filter matched nothing and the
            // test read as "no stars are filled" — a stale assertion, not a regression. The token
            // still resolves to that same amber (.storybook/preview.css:98).
            const filled = [...stars].filter((s) => (s as HTMLElement).style.color === 'var(--stud-star)');
            expect(filled).toHaveLength(3);

            fireEvent.click(container.querySelector('[data-star="4"]')!);
            expect(onChange).toHaveBeenCalledWith(4);
        });

        it('defaults to 5 stars when no maximum/enum is given', () => {
            const { container } = render(<StarRatingWidget schema={{ type: 'integer' }} onChange={() => {}} />);
            expect(container.querySelectorAll('[data-star]')).toHaveLength(5);
        });
    });
});
