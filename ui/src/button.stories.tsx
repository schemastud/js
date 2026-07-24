import type { Meta, StoryObj } from '@storybook/react-vite';
import { Button } from './button';

/**
 * Smoke story for the pilot workbench (component-seams ticket 08). Proves the aggregation glob,
 * the dev server, the production build, and — via the workbench token layer — skinned rendering.
 * The first real catalog wave replaces/expands this with the full foundation set + treatment axes.
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
