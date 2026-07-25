import type { Meta, StoryObj } from '@storybook/react-vite';
import { Button } from './button';
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from './dialog';

/**
 * Foundation/Dialog (component-seams ticket 14). The centered modal mechanism (Radix-dialog
 * backed). A mechanism primitive — no variant/size; its treatment is the base overlay skin
 * (Axis-A / inherit-downward). Stories cover the two **states** that matter for a catalog:
 * closed (the trigger) and open (the content). Ambient token + light⊗dark wired globally.
 */
const meta = {
    title: 'Foundation/Dialog',
    component: Dialog,
    tags: ['autodocs'],
} satisfies Meta<typeof Dialog>;

export default meta;
type Story = StoryObj<typeof meta>;

function ConfirmDialog(props: { defaultOpen?: boolean }) {
    return (
        <Dialog defaultOpen={props.defaultOpen}>
            <DialogTrigger asChild>
                <Button variant="destructive">Delete tenant</Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Delete this tenant?</DialogTitle>
                    <DialogDescription>
                        This drops the tenant schema and every fragment in it. This cannot be undone.
                    </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                    <DialogClose asChild>
                        <Button variant="ghost">Cancel</Button>
                    </DialogClose>
                    <DialogClose asChild>
                        <Button variant="destructive">Delete</Button>
                    </DialogClose>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

/** states = closed — the trigger; click to open. */
export const Closed: Story = { render: () => <ConfirmDialog /> };

/** states = open — the content rendered, for the catalog + VR baseline. */
export const Open: Story = { render: () => <ConfirmDialog defaultOpen /> };
