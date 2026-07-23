import * as React from 'react';
import { cn } from './cn';

/**
 * A small self-contained popover — an anchored floating panel that closes on
 * outside-click and Escape. Deliberately dependency-free (no `@radix-ui/react-popover`):
 * a lightweight per-facet/per-row surface, not a full portal stack. Not a `<select>` —
 * house rules forbid native selects, and this is a generic container, not a select.
 */

interface PopoverContextValue {
    open: boolean;
    setOpen: (open: boolean) => void;
    triggerRef: React.RefObject<HTMLButtonElement | null>;
    contentRef: React.RefObject<HTMLDivElement | null>;
}

const PopoverContext = React.createContext<PopoverContextValue | null>(null);

function usePopover(): PopoverContextValue {
    const ctx = React.useContext(PopoverContext);
    if (!ctx) throw new Error('Popover subcomponents must be used within <Popover>.');
    return ctx;
}

export function Popover({
    open: controlledOpen,
    onOpenChange,
    children,
}: {
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
    children: React.ReactNode;
}) {
    const [uncontrolledOpen, setUncontrolledOpen] = React.useState(false);
    const isControlled = controlledOpen !== undefined;
    const open = isControlled ? controlledOpen : uncontrolledOpen;

    const setOpen = React.useCallback(
        (next: boolean) => {
            if (!isControlled) setUncontrolledOpen(next);
            onOpenChange?.(next);
        },
        [isControlled, onOpenChange],
    );

    const triggerRef = React.useRef<HTMLButtonElement | null>(null);
    const contentRef = React.useRef<HTMLDivElement | null>(null);

    // Close on outside-click / Escape while open.
    React.useEffect(() => {
        if (!open) return;

        const onPointerDown = (event: PointerEvent) => {
            const target = event.target as Node;
            if (triggerRef.current?.contains(target)) return;
            if (contentRef.current?.contains(target)) return;
            setOpen(false);
        };
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') setOpen(false);
        };

        document.addEventListener('pointerdown', onPointerDown);
        document.addEventListener('keydown', onKeyDown);
        return () => {
            document.removeEventListener('pointerdown', onPointerDown);
            document.removeEventListener('keydown', onKeyDown);
        };
    }, [open, setOpen]);

    return (
        <PopoverContext.Provider value={{ open, setOpen, triggerRef, contentRef }}>
            <div className="relative inline-block">{children}</div>
        </PopoverContext.Provider>
    );
}

export function PopoverTrigger({
    asChild,
    children,
}: {
    asChild?: boolean;
    children: React.ReactElement;
}) {
    const { open, setOpen, triggerRef } = usePopover();

    const props = {
        ref: triggerRef,
        'aria-expanded': open,
        'aria-haspopup': true as const,
        onClick: (event: React.MouseEvent) => {
            (children.props as { onClick?: (e: React.MouseEvent) => void }).onClick?.(event);
            setOpen(!open);
        },
    };

    if (asChild) {
        return React.cloneElement(children, props as Record<string, unknown>);
    }
    return (
        <button type="button" {...props}>
            {children}
        </button>
    );
}

export function PopoverContent({
    align = 'start',
    side = 'bottom',
    className,
    children,
}: {
    align?: 'start' | 'end';
    /** Which edge of the trigger the panel opens from. `top` opens upward. */
    side?: 'bottom' | 'top';
    className?: string;
    children: React.ReactNode;
}) {
    const { open, contentRef } = usePopover();
    if (!open) return null;

    return (
        <div
            ref={contentRef}
            role="dialog"
            className={cn(
                'absolute z-50 min-w-56 rounded-md border bg-popover p-3 text-popover-foreground shadow-md',
                'animate-in fade-in-0 zoom-in-95',
                side === 'top' ? 'bottom-full mb-1' : 'top-full mt-1',
                align === 'end' ? 'right-0' : 'left-0',
                className,
            )}
        >
            {children}
        </div>
    );
}
