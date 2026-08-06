import * as DialogPrimitive from '@radix-ui/react-dialog';
import { XIcon } from 'lucide-react';
import * as React from 'react';
import { cn } from './cn';

/**
 * SidePanel — a reusable, edit-in-place right-hand panel.
 *
 * Unlike {@link Sheet}, this is a **non-blocking** surface: the underlying page
 * stays visible and interactive (Radix `modal={false}` — no dimming overlay, no
 * scroll-lock, no focus trap), so the panel reads as side-by-side reference
 * rather than a modal that eats the page. It hosts an arbitrary editor body for
 * one entity and surfaces save/cancel that the opener acts on.
 *
 * This is the shared shell that quick-edit surfaces mount into (Context Scope
 * edit-in-place, the fragment editor). Keep the contract generic — an entity
 * label + an editor body in, save/cancel out — don't special-case a consumer.
 *
 * The motion + border classes (`motion-standard`, the `--splice-*` tokens) are
 * host-owned Tailwind utilities: the host defines them and the reduced-motion
 * guard, so the primitive stays presentational and themeable, never forking.
 */

export interface SidePanelProps {
    /** Whether the panel is open. Controlled by the opener. */
    open: boolean;
    /** Fired when Radix requests a state change (Esc, outside interaction). */
    onOpenChange: (open: boolean) => void;
    /** Panel heading — typically the entity's label/name. */
    title: React.ReactNode;
    /** Optional sub-heading under the title (entity kind, id, hint). */
    description?: React.ReactNode;
    /** The editor body for the entity — a schema-driven form or arbitrary editor. */
    children: React.ReactNode;
    /**
     * Optional action node rendered in the header, immediately left of the Close
     * button — the panel's "button bar". Any panel with a full-page counterpart
     * passes an expand-to-full-page link here; kept generic so it's not
     * special-cased to one consumer.
     */
    headerActions?: React.ReactNode;
    /**
     * Invoked when the user commits the edit. The opener persists in place and
     * decides whether to close (return/resolve, then flip `open`).
     */
    onSave?: () => void;
    /** Invoked when the user abandons the edit. Defaults to closing the panel. */
    onCancel?: () => void;
    /** Label for the primary/commit action. */
    saveLabel?: string;
    /** Label for the dismiss action. */
    cancelLabel?: string;
    /** Disable the save action (e.g. invalid form, in-flight request). */
    saveDisabled?: boolean;
    /** Show a busy state on save (in-flight persistence). */
    saving?: boolean;
    /** Hide the built-in footer to supply a custom action row inside `children`. */
    hideFooter?: boolean;
    /** Extra classes for the panel content surface (e.g. a wider `max-w-*`). */
    className?: string;
}

export function SidePanel({
    open,
    onOpenChange,
    title,
    description,
    children,
    headerActions,
    onSave,
    onCancel,
    saveLabel = 'Save',
    cancelLabel = 'Cancel',
    saveDisabled = false,
    saving = false,
    hideFooter = false,
    className,
}: SidePanelProps) {
    const handleCancel = () => {
        if (onCancel) onCancel();
        else onOpenChange(false);
    };

    return (
        <DialogPrimitive.Root open={open} onOpenChange={onOpenChange} modal={false}>
            <DialogPrimitive.Portal>
                {/* No overlay — the page underneath stays legible and interactive. */}
                <DialogPrimitive.Content
                    // Don't steal focus back to the trigger on close, and don't
                    // trap it — this is a non-blocking companion surface.
                    onInteractOutside={(e) => e.preventDefault()}
                    className={cn(
                        'fixed inset-y-0 right-0 z-50 flex h-full w-full max-w-md flex-col bg-card shadow-xl',
                        'border-l border-[var(--splice-ink-12)]',
                        // Slide in/out on the shared motion standard (UI-18) — the
                        // `motion-standard` utility binds tw-animate's duration/ease to
                        // the app tokens; the global reduced-motion guard collapses it.
                        'motion-standard transition data-[state=open]:animate-in data-[state=closed]:animate-out',
                        'data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right',
                        className,
                    )}
                >
                    <header className="flex flex-none items-start gap-3 border-b border-[var(--splice-ink-10)] px-6 py-4">
                        <div className="min-w-0 flex-1">
                            <DialogPrimitive.Title className="truncate font-semibold text-foreground">
                                {title}
                            </DialogPrimitive.Title>
                            {description && (
                                <DialogPrimitive.Description className="mt-0.5 truncate text-sm text-muted-foreground">
                                    {description}
                                </DialogPrimitive.Description>
                            )}
                        </div>
                        {headerActions && (
                            <div className="flex flex-none items-center gap-1">{headerActions}</div>
                        )}
                        <DialogPrimitive.Close
                            className="rounded-xs opacity-70 transition-opacity hover:opacity-100 focus:ring-2 focus:ring-ring focus:outline-hidden"
                            aria-label="Close panel"
                        >
                            <XIcon className="size-4" />
                        </DialogPrimitive.Close>
                    </header>

                    <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">{children}</div>

                    {!hideFooter && (
                        <footer className="flex flex-none items-center justify-end gap-2 border-t border-[var(--splice-ink-10)] px-6 py-4">
                            <button
                                type="button"
                                onClick={handleCancel}
                                className="inline-flex h-9 items-center justify-center rounded-md border border-input bg-transparent px-4 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground"
                            >
                                {cancelLabel}
                            </button>
                            <button
                                type="button"
                                onClick={onSave}
                                disabled={saveDisabled || saving}
                                className="inline-flex h-9 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground shadow-xs transition-colors hover:bg-primary/90 disabled:pointer-events-none disabled:opacity-50"
                            >
                                {saving ? 'Saving…' : saveLabel}
                            </button>
                        </footer>
                    )}
                </DialogPrimitive.Content>
            </DialogPrimitive.Portal>
        </DialogPrimitive.Root>
    );
}
