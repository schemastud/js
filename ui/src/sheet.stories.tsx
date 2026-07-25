import type { Meta, StoryObj } from '@storybook/react-vite';
import { Button } from './button';
import {
    Sheet,
    SheetClose,
    SheetContent,
    SheetDescription,
    SheetFooter,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
    type SheetSide,
} from './sheet';

/**
 * Foundation/Sheet (component-seams ticket 14). The edge-docked overlay panel (Radix-dialog
 * backed, ticket 10). Its component-defined enum axis is **side** (right/left/top/bottom) — the
 * Sheet's variant analogue — plus the closed/open **states**. Ambient token + light⊗dark wired
 * globally.
 */
const meta = {
    title: 'Foundation/Sheet',
    component: Sheet,
    tags: ['autodocs'],
} satisfies Meta<typeof Sheet>;

export default meta;
type Story = StoryObj<typeof meta>;

function DemoSheet(props: { side?: SheetSide; defaultOpen?: boolean }) {
    return (
        <Sheet defaultOpen={props.defaultOpen}>
            <SheetTrigger asChild>
                <Button variant="outline">Open {props.side ?? 'right'} sheet</Button>
            </SheetTrigger>
            <SheetContent side={props.side}>
                <SheetHeader>
                    <SheetTitle>Edit fragment</SheetTitle>
                    <SheetDescription>
                        A docked panel — distinct from the centered Dialog modal.
                    </SheetDescription>
                </SheetHeader>
                <div className="text-sm text-muted-foreground">Panel body content.</div>
                <SheetFooter>
                    <SheetClose asChild>
                        <Button variant="ghost">Cancel</Button>
                    </SheetClose>
                    <SheetClose asChild>
                        <Button>Save</Button>
                    </SheetClose>
                </SheetFooter>
            </SheetContent>
        </Sheet>
    );
}

/** states = closed — the trigger. */
export const Closed: Story = { render: () => <DemoSheet /> };

/** side axis — right (the default), open. */
export const Right: Story = { render: () => <DemoSheet side="right" defaultOpen /> };
/** side axis — left, open. */
export const Left: Story = { render: () => <DemoSheet side="left" defaultOpen /> };
/** side axis — top, open. */
export const Top: Story = { render: () => <DemoSheet side="top" defaultOpen /> };
/** side axis — bottom, open. */
export const Bottom: Story = { render: () => <DemoSheet side="bottom" defaultOpen /> };
