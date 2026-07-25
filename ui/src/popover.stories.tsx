import type { Meta, StoryObj } from '@storybook/react-vite';
import { Button } from './button';
import { Popover, PopoverContent, PopoverTrigger } from './popover';

/**
 * Foundation/Popover (component-seams ticket 14). The dependency-free anchored panel — a
 * lightweight per-facet/per-row surface (not a portal stack). Its component-defined enum axes are
 * **align** (start/end) and **side** (bottom/top); plus the closed/open **states**. Ambient token +
 * light⊗dark wired globally.
 */
// Render-based stories (the FrameLayout pilot idiom): the composed overlay has required props,
// so the meta is untyped-by-component and each story renders explicitly rather than from args.
const meta = {
    title: 'Foundation/Popover',
    tags: ['autodocs'],
    parameters: { layout: 'centered' },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

function DemoPopover(props: { open?: boolean; align?: 'start' | 'end'; side?: 'bottom' | 'top' }) {
    return (
        <div className="p-16">
            <Popover open={props.open}>
                <PopoverTrigger asChild>
                    <Button variant="outline">Filter</Button>
                </PopoverTrigger>
                <PopoverContent align={props.align} side={props.side}>
                    <div className="grid gap-1 text-sm">
                        <div className="font-medium">Filter by source</div>
                        <p className="text-muted-foreground">
                            A small anchored panel; closes on outside-click or Escape.
                        </p>
                    </div>
                </PopoverContent>
            </Popover>
        </div>
    );
}

/** states = closed — the trigger; click to open. */
export const Closed: Story = { render: () => <DemoPopover /> };

/** states = open — anchored bottom-start (the default). */
export const Open: Story = { render: () => <DemoPopover open /> };

/** align/side axes — end-aligned, opening upward. */
export const EndTop: Story = { render: () => <DemoPopover open align="end" side="top" /> };
