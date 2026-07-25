import type { Meta, StoryObj } from '@storybook/react-vite';
import { Textarea } from './textarea';

/**
 * Foundation/Textarea (frame-canonical-forms ticket 02 — factored out of the app so the rehomed
 * CalendarCellForm surface can reach it from the foundation instead of `@/components/ui/textarea`).
 * A styled multi-line `<textarea>` twin of Input — no variant/size, so the sanctioned axis it
 * exposes is **states** (default / disabled). `error` is a form-field concern the field wrapper
 * owns, not this primitive, so it is absent here (not a gap). Ambient token + light⊗dark wired
 * globally.
 */
const meta = {
    title: 'Foundation/Textarea',
    component: Textarea,
    tags: ['autodocs'],
    args: { placeholder: 'e.g. Draft the weekly product digest', rows: 3 },
    decorators: [
        (Story) => (
            <div className="w-72">
                <Story />
            </div>
        ),
    ],
} satisfies Meta<typeof Textarea>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Placeholder: Story = {};
export const WithValue: Story = { args: { defaultValue: 'Weekly newsletter — behind-the-scenes recap and one shipped feature.' } };

/** states axis — disabled. */
export const Disabled: Story = { args: { disabled: true, defaultValue: 'Locked' } };
