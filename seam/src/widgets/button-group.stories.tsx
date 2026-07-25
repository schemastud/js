import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { ButtonGroupWidget } from './button-group';

/**
 * Seam/Widgets/ButtonGroup (component-seams ticket 17). A generic RJSF widget: render
 * an enum as a segmented, pill-shaped button row, two-way against formData. Opt in
 * per-attr with `x-widget: 'button-group'`; the widget is context-free (no frame/PM
 * knowledge). Catalogued in isolation here; also seen inside a real form under
 * Seam/SchemaForm → CustomWidgets.
 *
 * TREATMENT axes (treatment-axes.md): the **states** axis — Default (interactive) /
 * Selected / Disabled / Readonly (the two lock paths the widget honours). No
 * variant/size/density props ⇒ those axes are absent-not-a-gap. Ambient token +
 * light⊗dark wired globally.
 */
const meta = {
    title: 'Seam/Widgets/ButtonGroup',
    parameters: { layout: 'centered' },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

const OPTIONS = {
    enumOptions: [
        { value: 'low', label: 'Low' },
        { value: 'normal', label: 'Normal' },
        { value: 'high', label: 'High' },
    ],
};

/** Interactive — two-way selection over the enum row. */
export const Default: Story = {
    render: () => {
        function Demo() {
            const [value, setValue] = useState<unknown>('normal');
            return <ButtonGroupWidget id="pg" value={value} options={OPTIONS} onChange={setValue} />;
        }
        return <Demo />;
    },
};

/** states = disabled — every option locked (the RJSF `disabled` path). */
export const Disabled: Story = {
    render: () => (
        <ButtonGroupWidget id="pg" value="high" options={OPTIONS} disabled onChange={() => {}} />
    ),
};

/** states = readonly — the second lock path (`readonly`), same locked presentation. */
export const Readonly: Story = {
    render: () => (
        <ButtonGroupWidget id="pg" value="low" options={OPTIONS} readonly onChange={() => {}} />
    ),
};

/** Resolving options from `schema.enum` (no explicit enumOptions) — the fallback path. */
export const FromSchemaEnum: Story = {
    render: () => (
        <ButtonGroupWidget
            id="pg"
            value="member"
            schema={{ type: 'string', enum: ['owner', 'admin', 'member'] }}
            onChange={() => {}}
        />
    ),
};
