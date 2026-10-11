import { cva, type VariantProps } from 'class-variance-authority';
import * as React from 'react';
import { cn } from './cn';

const buttonVariants = cva(
    "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0",
    {
        variants: {
            variant: {
                // Disabled takes a foreground tint of whatever it sits on, not the base `opacity-50`:
                // halving a bright dark-scheme primary AND its dark label over a dark canvas left dark
                // text on muted green, unreadable (beam VR pass 2: Save / Connect / Install while
                // pending). A tint rather than `bg-muted`, which matched the light page and lost the
                // button's shape there.
                default:
                    'bg-primary text-primary-foreground shadow-xs hover:bg-primary/90 disabled:opacity-100 disabled:bg-foreground/10 disabled:text-foreground/55 disabled:shadow-none',
                destructive:
                    'bg-destructive text-destructive-foreground shadow-xs hover:bg-destructive/90',
                // Outline and secondary follow the same rule, adapted: a disabled outline keeps its
                // frame as a faint foreground hairline with a dimmed label (half opacity greyed the
                // hairline into the page), and a disabled secondary takes the primary's tint so the
                // pair reads as one disabled treatment in both schemes.
                outline:
                    'border border-input bg-transparent shadow-xs hover:bg-accent hover:text-accent-foreground disabled:opacity-100 disabled:border-foreground/15 disabled:text-foreground/55 disabled:shadow-none',
                secondary:
                    'bg-secondary text-secondary-foreground shadow-xs hover:bg-secondary/80 disabled:opacity-100 disabled:bg-foreground/10 disabled:text-foreground/55 disabled:shadow-none',
                ghost: 'hover:bg-accent hover:text-accent-foreground',
                link: 'text-primary underline-offset-4 hover:underline',
            },
            size: {
                default: 'h-9 px-4 py-2',
                sm: 'h-8 rounded-md px-3 text-xs',
                lg: 'h-10 rounded-md px-6',
                // C40 (UX04): the 36px visual icon control keeps its exact desktop footprint, but below
                // the 768px breakpoint an invisible centered ::before overlay expands the INTERACTIVE
                // target to 44×44 (the mobile hit-target floor). It is `absolute`, so it adds no layout
                // box (surrounding layout unchanged), carries no paint (visual density unchanged), and
                // `md:before:hidden` removes it entirely at desktop width. Keyboard/focus/accessible-name
                // stay on the native <button>; the pseudo only widens where a finger lands.
                icon: 'size-9 relative before:absolute before:left-1/2 before:top-1/2 before:size-11 before:-translate-x-1/2 before:-translate-y-1/2 before:content-[""] md:before:hidden',
            },
        },
        defaultVariants: {
            variant: 'default',
            size: 'default',
        },
    },
);

function Button({
    className,
    variant,
    size,
    ...props
}: React.ComponentProps<'button'> & VariantProps<typeof buttonVariants>) {
    return <button className={cn(buttonVariants({ variant, size, className }))} {...props} />;
}

export { Button, buttonVariants };
