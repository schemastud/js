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

            // First three stars filled (amber), last two empty.
            const filled = [...stars].filter((s) => (s as HTMLElement).style.color === 'rgb(245, 158, 11)');
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
