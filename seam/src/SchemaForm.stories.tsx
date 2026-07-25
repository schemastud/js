import type { Meta, StoryObj } from '@storybook/react-vite';
import { userEvent, within } from 'storybook/test';
import { SchemaForm } from './SchemaForm';
import {
    CUSTOM_WIDGET_SCHEMA,
    CUSTOM_WIDGET_VALUE,
    FIELD_KINDS_SCHEMA,
    FIELD_KINDS_VALUE,
    GROUPED_SCHEMA,
} from './story-fixtures';

/**
 * Seam/SchemaForm (component-seams ticket 17). The headline surface of the seam: an
 * RJSF (shadcn theme) form driven entirely by a JSON schema, wired to the predicate
 * widget registry, tolerant of `x-*` extension keywords, and installing the
 * `GroupedObjectFieldTemplate` for `x-group` objects. It renders standalone off a
 * fixture schema — the exact shape the rushing-prototype convention graduates to Frame
 * `EditShell` (a form is the real `SchemaForm` off a fixture schema).
 *
 * TREATMENT axes (treatment-axes.md): the **states** axis dominates — validation
 * errors are the natural states here (Populated / Empty-required / Invalid-on-submit),
 * plus Disabled (read-only) and the grouped-vs-flat object rendering. Ambient token +
 * light⊗dark are wired globally; interactive stories `play`-await settled content so a
 * VR baseline captures the resolved form, never a transient.
 */
const meta = {
    title: 'Seam/SchemaForm',
    parameters: { layout: 'padded' },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

const awaitField =
    (label: string): Story['play'] =>
    async ({ canvasElement }) => {
        await within(canvasElement).findByText(label);
    };

/**
 * The representative field-kind vocabulary — string / email / bio / number / boolean /
 * enum / date / string-array — rendered in one form, seeded with a valid value (the
 * populated `states` baseline).
 */
export const FieldKinds: Story = {
    render: () => (
        <div style={{ maxWidth: 520 }}>
            <SchemaForm schema={FIELD_KINDS_SCHEMA} formData={FIELD_KINDS_VALUE} />
        </div>
    ),
    play: awaitField('Name'),
};

/** states = empty — the same schema with no formData: every field renders in its blank state. */
export const Empty: Story = {
    render: () => (
        <div style={{ maxWidth: 520 }}>
            <SchemaForm schema={FIELD_KINDS_SCHEMA} />
        </div>
    ),
    play: awaitField('Name'),
};

/**
 * states = error — submit an empty form so the AJV validator surfaces the `required`
 * (name / email) and `minLength` violations inline. `play` clicks Submit and awaits the
 * first error so the VR baseline captures the settled error state, not the pristine form.
 */
export const ValidationErrors: Story = {
    render: () => (
        <div style={{ maxWidth: 520 }}>
            <SchemaForm schema={FIELD_KINDS_SCHEMA} formData={{ name: 'A' }}>
                <button type="submit" data-testid="submit">
                    Submit
                </button>
            </SchemaForm>
        </div>
    ),
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await canvas.findByText('Name');
        await userEvent.click(await canvas.findByTestId('submit'));
        // AJV surfaces the required-email + minLength(name) messages; await one so the
        // snapshot is the settled error state.
        await canvas.findByText(/must NOT have fewer than|is a required property|required/i);
    },
};

/**
 * states = disabled — the whole form read-only. RJSF disables every control; the seam’s
 * widgets honour `disabled`/`readonly` (see the widget stories).
 */
export const Disabled: Story = {
    render: () => (
        <div style={{ maxWidth: 520 }}>
            <SchemaForm schema={FIELD_KINDS_SCHEMA} formData={FIELD_KINDS_VALUE} disabled />
        </div>
    ),
    play: awaitField('Name'),
};

/**
 * The `GroupedObjectFieldTemplate` in action — every property carries `x-group`, so the
 * flat stack partitions into titled Basics / Retrieval / Targets fieldsets. Cataloguing
 * the grouped template is a SchemaForm story: the template is the object renderer the
 * form installs, not a standalone surface.
 */
export const GroupedSections: Story = {
    render: () => (
        <div style={{ maxWidth: 520 }}>
            <SchemaForm schema={GROUPED_SCHEMA} />
        </div>
    ),
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await canvas.findByText('Basics');
        await canvas.findByText('Retrieval');
        await canvas.findByText('Targets');
    },
};

/**
 * The seam’s own custom widgets resolving inside a real form — `button-group` and
 * `star-rating` opt in via `x-widget` and are picked up by the default predicate
 * registry (the same widgets catalogued in isolation under Seam/Widgets/*).
 */
export const CustomWidgets: Story = {
    render: () => (
        <div style={{ maxWidth: 520 }}>
            <SchemaForm schema={CUSTOM_WIDGET_SCHEMA} formData={CUSTOM_WIDGET_VALUE} />
        </div>
    ),
    play: awaitField('Priority'),
};
