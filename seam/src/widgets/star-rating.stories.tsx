import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { StarRatingWidget } from './star-rating';

/**
 * Seam/Widgets/StarRating (component-seams ticket 17). A generic RJSF widget: render a
 * numeric/enum rating as a row of clickable ★ stars, two-way against formData. Opt in
 * per-attr with `x-widget: 'star-rating'`; context-free. Catalogued in isolation here;
 * also seen inside a real form under Seam/SchemaForm → CustomWidgets.
 *
 * TREATMENT axes (treatment-axes.md): the **states** axis — Default (interactive) /
 * Empty (no value) / Disabled / Readonly. The star-count resolves from `schema.maximum`,
 * else the enum length, else 5. No variant/size/density props ⇒ absent-not-a-gap.
 * Ambient token + light⊗dark wired globally.
 */
const meta = {
    title: 'Seam/Widgets/StarRating',
    parameters: { layout: 'centered' },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

/** Interactive — click to set the rating (two-way against value). */
export const Default: Story = {
    render: () => {
        function Demo() {
            const [value, setValue] = useState<unknown>(3);
            return (
                <StarRatingWidget
                    id="rt"
                    value={value}
                    schema={{ type: 'number', maximum: 5 }}
                    onChange={setValue}
                />
            );
        }
        return <Demo />;
    },
};

/** states = empty — no value: all stars unfilled. */
export const Empty: Story = {
    render: () => (
        <StarRatingWidget id="rt" schema={{ type: 'number', maximum: 5 }} onChange={() => {}} />
    ),
};

/** states = disabled — locked at a filled value. */
export const Disabled: Story = {
    render: () => (
        <StarRatingWidget
            id="rt"
            value={4}
            schema={{ type: 'number', maximum: 5 }}
            disabled
            onChange={() => {}}
        />
    ),
};

/** states = readonly — the second lock path. */
export const Readonly: Story = {
    render: () => (
        <StarRatingWidget
            id="rt"
            value={2}
            schema={{ type: 'number', maximum: 5 }}
            readonly
            onChange={() => {}}
        />
    ),
};
