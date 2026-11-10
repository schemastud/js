import type { ReactNode } from 'react';
import {
    Badge,
    Button,
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    Input,
    Label,
    Popover,
    PopoverContent,
    PopoverTrigger,
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SimpleSelect,
    Skeleton,
} from '@schemastud/ui';
import type { FramePrimitives } from './types';

interface OverlayProps {
    /** Absent, the overlay shows: a shell that mounts a container without `open` means it to be seen. */
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
    title?: ReactNode;
    children?: ReactNode;
}

/** The side panel: a right-hand `@schemastud/ui` Sheet, with the title as its heading. */
function DefaultSidePanel({ open = true, onOpenChange, title, children, ...rest }: OverlayProps) {
    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-lg" {...rest}>
                {title ? (
                    <SheetHeader>
                        <SheetTitle>{title}</SheetTitle>
                    </SheetHeader>
                ) : null}
                {children}
            </SheetContent>
        </Sheet>
    );
}

/** The dialog an action's form opens in: a `@schemastud/ui` Dialog, with the title as its heading. */
function DefaultDialog({ open = true, onOpenChange, title, children }: OverlayProps) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                {title ? (
                    <DialogHeader>
                        <DialogTitle>{title}</DialogTitle>
                    </DialogHeader>
                ) : null}
                {children}
            </DialogContent>
        </Dialog>
    );
}

/**
 * Frame's default primitives: every member a shell reads, built from `@schemastud/ui`. A host
 * sets only the members that differ (`{ ...defaultPrimitives, SidePanel: MySheet }`).
 *
 * `Table` is not set: no shell reads it (the list's table is a slot). `Page` is not set either;
 * an `EditShell` with `container="page"` then renders a plain block.
 */
export const defaultPrimitives: FramePrimitives = {
    Button,
    Input,
    Label,
    Badge,
    Popover,
    PopoverTrigger,
    PopoverContent,
    SimpleSelect,
    Skeleton,
    SidePanel: DefaultSidePanel,
    Dialog: DefaultDialog,
};
