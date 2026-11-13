import { useFrameMessages } from './messages';
import { useState, type ReactNode } from 'react';
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
    /**
     * Controlled when passed: the overlay follows it and reports through `onOpenChange`. Absent, the
     * overlay is uncontrolled: it opens shown (a shell that mounts a container without `open` means
     * it to be seen) and its own Close button closes it.
     */
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
    /** The heading, and the overlay's accessible name. Absent, a visually hidden fallback names it. */
    title?: ReactNode;
    children?: ReactNode;
}

/** `open` when controlled, else the overlay's own state, which starts shown. */
function useOverlayOpen(open: boolean | undefined, onOpenChange: ((open: boolean) => void) | undefined) {
    const [own, setOwn] = useState(true);
    const controlled = open !== undefined;
    return [
        controlled ? open : own,
        (next: boolean) => {
            if (!controlled) setOwn(next);
            onOpenChange?.(next);
        },
    ] as const;
}

/** The side panel: a right-hand `@schemastud/ui` Sheet, with the title as its heading. */
function DefaultSidePanel({ open, onOpenChange, title, children, ...rest }: OverlayProps) {
    const { t } = useFrameMessages();
    const [shown, setShown] = useOverlayOpen(open, onOpenChange);
    return (
        <Sheet open={shown} onOpenChange={setShown}>
            <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-lg" {...rest}>
                <SheetHeader className={title ? undefined : 'sr-only'}>
                    <SheetTitle>{title ?? t("schemastud-frame::messages.panel")}</SheetTitle>
                </SheetHeader>
                {children}
            </SheetContent>
        </Sheet>
    );
}

/** The dialog an action's form opens in: a `@schemastud/ui` Dialog, with the title as its heading. */
function DefaultDialog({ open, onOpenChange, title, children }: OverlayProps) {
    const { t } = useFrameMessages();
    const [shown, setShown] = useOverlayOpen(open, onOpenChange);
    return (
        <Dialog open={shown} onOpenChange={setShown}>
            <DialogContent>
                <DialogHeader className={title ? undefined : 'sr-only'}>
                    <DialogTitle>{title ?? t("schemastud-frame::messages.dialog")}</DialogTitle>
                </DialogHeader>
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
