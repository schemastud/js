import type { Meta, StoryObj } from '@storybook/react-vite';
import { SlidersHorizontal } from 'lucide-react';
import { Badge } from '../badge';
import { Button } from '../button';
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '../dialog';
import { Input } from '../input';
import { Label } from '../label';
import { Popover, PopoverContent, PopoverTrigger } from '../popover';
import {
    Sheet,
    SheetClose,
    SheetContent,
    SheetDescription,
    SheetFooter,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from '../sheet';

/**
 * Motion/A2 Overlays (owner-review 18, ruled 2026-11-02). Sheet, Dialog and Popover on the shipped
 * `motion.css`: enter 200 ms ease-out, exit 140 ms ease-in; the sheet arrives 32 px from its own
 * edge with a fade instead of crossing its width, the dialog scales from 97 %, the popover is
 * feedback-tier (120 in, 90 out) and drops 4 px from its trigger — and now has an exit.
 * Reduced motion (DevTools → Rendering → `prefers-reduced-motion: reduce`): every one is a fade.
 */
const meta = {
    title: 'Motion/A2 Overlays',
    parameters: { layout: 'fullscreen' },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

function Gallery() {
    return (
        <div className="grid max-w-[1120px] gap-4 p-4 sm:grid-cols-3 sm:p-8">
            <section className="rounded-lg border border-border bg-card p-4">
                <h2 className="text-[15px] font-semibold">Edit a fragment</h2>
                <p className="mt-1 mb-4 text-sm text-muted-foreground">Docked sheet, right edge.</p>
                <Sheet>
                    <SheetTrigger asChild>
                        <Button variant="outline" data-demo="open-sheet">
                            Open sheet
                        </Button>
                    </SheetTrigger>
                    <SheetContent side="right">
                        <SheetHeader>
                            <SheetTitle>Retention policy</SheetTitle>
                            <SheetDescription>Fragment · knowledge / compliance</SheetDescription>
                        </SheetHeader>
                        <div className="grid gap-1.5">
                            <Label htmlFor="a2-name">Name</Label>
                            <Input id="a2-name" defaultValue="Retention policy" />
                        </div>
                        <SheetFooter>
                            <SheetClose asChild>
                                <Button variant="ghost" data-demo="close-sheet">
                                    Cancel
                                </Button>
                            </SheetClose>
                            <SheetClose asChild>
                                <Button>Save</Button>
                            </SheetClose>
                        </SheetFooter>
                    </SheetContent>
                </Sheet>
            </section>

            <section className="rounded-lg border border-border bg-card p-4">
                <h2 className="text-[15px] font-semibold">Archive a concept</h2>
                <p className="mt-1 mb-4 text-sm text-muted-foreground">Centred dialog, protected focus.</p>
                <Dialog>
                    <DialogTrigger asChild>
                        <Button variant="outline" data-demo="open-dialog">
                            Open dialog
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Archive “Data residency”?</DialogTitle>
                            <DialogDescription>
                                Its 14 fragments stay readable; agents stop citing it until it is restored.
                            </DialogDescription>
                        </DialogHeader>
                        <DialogFooter>
                            <DialogClose asChild>
                                <Button variant="ghost" data-demo="close-dialog">
                                    Keep it
                                </Button>
                            </DialogClose>
                            <DialogClose asChild>
                                <Button variant="destructive">Archive</Button>
                            </DialogClose>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </section>

            <section className="rounded-lg border border-border bg-card p-4">
                <h2 className="text-[15px] font-semibold">Filter runs</h2>
                <p className="mt-1 mb-4 text-sm text-muted-foreground">Anchored popover, in place.</p>
                <Popover>
                    <PopoverTrigger asChild>
                        <Button variant="outline" data-demo="open-popover">
                            <SlidersHorizontal className="size-4" /> Filters
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-64">
                        <div className="grid gap-2 text-sm" data-demo="popover">
                            <p className="font-medium">Show runs that are</p>
                            {['generating', 'failed', 'complete'].map((s) => (
                                <label key={s} className="flex items-center gap-2">
                                    <input type="checkbox" defaultChecked={s !== 'complete'} />
                                    <Badge variant="outline" className="font-mono">
                                        {s}
                                    </Badge>
                                </label>
                            ))}
                        </div>
                    </PopoverContent>
                </Popover>
            </section>
        </div>
    );
}

export const Overlays: Story = { name: 'Sheet, dialog, popover', render: () => <Gallery /> };
