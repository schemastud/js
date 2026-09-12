import * as DialogPrimitive from '@radix-ui/react-dialog';
import { XIcon } from 'lucide-react';
import * as React from 'react';
import { cn } from './cn';

const Dialog = DialogPrimitive.Root;
const DialogTrigger = DialogPrimitive.Trigger;
const DialogClose = DialogPrimitive.Close;
const DialogPortal = DialogPrimitive.Portal;

function DialogOverlay({
    className,
    ...props
}: React.ComponentProps<typeof DialogPrimitive.Overlay>) {
    return (
        <DialogPrimitive.Overlay
            className={cn(
                'fixed inset-0 z-50 bg-black/60 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
                className,
            )}
            {...props}
        />
    );
}

function DialogContent({
    className,
    children,
    ...props
}: React.ComponentProps<typeof DialogPrimitive.Content>) {
    return (
        <DialogPortal>
            <DialogOverlay />
            <DialogPrimitive.Content
                className={cn(
                    // ⚠️ `max-h` + `overflow-y-auto` are load-bearing, not polish. This element is
                    // `position: fixed` and centred by translate, so a dialog TALLER than the
                    // viewport hangs off both ends with nothing to scroll: the page behind it does
                    // not move the dialog, and the dialog had `max-height: none; overflow: visible`.
                    // Its footer — every dialog's confirm button — was then unreachable for a human
                    // and unclickable for a browser driver. Measured 2026-09-12 on
                    // splicewire-app's `/ui/settings/tokens`: the packaged mint dialog
                    // (@splicewire/beam-accounts, whose scope picker listed 150 permissions) came to
                    // 860px in a 720px viewport, putting "Mint token" 45px below the fold, and
                    // Playwright reported "element is outside of the viewport" for 30s. Any laptop
                    // or phone shorter than the dialog hits the same wall. `calc(100% - 2rem)`
                    // resolves against the viewport for a fixed element — the same bound shadcn's
                    // own dialog primitive carries upstream.
                    'fixed top-1/2 left-1/2 z-50 grid max-h-[calc(100%-2rem)] w-full max-w-lg -translate-x-1/2 -translate-y-1/2 gap-4 overflow-y-auto rounded-lg border bg-background p-6 shadow-lg data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95',
                    className,
                )}
                {...props}
            >
                {children}
                <DialogPrimitive.Close className="absolute top-4 right-4 rounded-xs opacity-70 transition-opacity hover:opacity-100 focus:ring-2 focus:ring-ring focus:outline-hidden">
                    <XIcon className="size-4" />
                    <span className="sr-only">Close</span>
                </DialogPrimitive.Close>
            </DialogPrimitive.Content>
        </DialogPortal>
    );
}

function DialogHeader({ className, ...props }: React.ComponentProps<'div'>) {
    return <div className={cn('flex flex-col gap-1.5', className)} {...props} />;
}

function DialogFooter({ className, ...props }: React.ComponentProps<'div'>) {
    return (
        <div
            className={cn('flex flex-col-reverse gap-2 sm:flex-row sm:justify-end', className)}
            {...props}
        />
    );
}

function DialogTitle({ className, ...props }: React.ComponentProps<typeof DialogPrimitive.Title>) {
    return (
        <DialogPrimitive.Title
            className={cn('text-lg leading-none font-semibold', className)}
            {...props}
        />
    );
}

function DialogDescription({
    className,
    ...props
}: React.ComponentProps<typeof DialogPrimitive.Description>) {
    return (
        <DialogPrimitive.Description
            className={cn('text-muted-foreground text-sm', className)}
            {...props}
        />
    );
}

export {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
};
