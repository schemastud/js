import type { Meta, StoryObj } from '@storybook/react-vite';
import { Button } from './button';

/**
 * Foundation/Button — the first catalog wave (component-seams ticket 14), grown from the
 * ticket-08 pilot smoke story into the real entry.
 *
 * Sanctioned axes it exposes (treatment-axes.md): **variant** (6-value set) + **size**
 * (sm/default/lg/icon) + **states** (disabled). Ambient token + light⊗dark are wired globally
 * in .storybook/preview. No density (a leaf control, not a collection) — absent, not a gap.
 */
const meta = {
    title: 'Foundation/Button',
    component: Button,
    tags: ['autodocs'],
    argTypes: {
        variant: {
            control: 'select',
            options: ['default', 'destructive', 'outline', 'secondary', 'ghost', 'link'],
        },
        size: { control: 'select', options: ['default', 'sm', 'lg', 'icon'] },
        disabled: { control: 'boolean' },
    },
    args: { children: 'Button' },
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Destructive: Story = { args: { variant: 'destructive' } };
export const Outline: Story = { args: { variant: 'outline' } };
export const Secondary: Story = { args: { variant: 'secondary' } };
export const Ghost: Story = { args: { variant: 'ghost' } };
export const Link: Story = { args: { variant: 'link' } };

/** states axis — disabled. */
export const Disabled: Story = { args: { disabled: true } };

/** variant axis — the full enum in one matrix (the pilot precedent every wave copies). */
export const AllVariants: Story = {
    render: () => (
        <div className="flex flex-wrap items-center gap-3">
            <Button>Default</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="destructive">Destructive</Button>
            <Button variant="outline">Outline</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="link">Link</Button>
        </div>
    ),
};

/** size axis — the scale enum in one matrix. */
export const AllSizes: Story = {
    render: () => (
        <div className="flex flex-wrap items-center gap-3">
            <Button size="sm">Small</Button>
            <Button size="default">Default</Button>
            <Button size="lg">Large</Button>
            <Button size="icon" aria-label="Icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 5v14M5 12h14" strokeLinecap="round" />
                </svg>
            </Button>
        </div>
    ),
};
