import type * as React from 'react';
import { cn } from './cn';

// Skeleton — a pulsing placeholder block for loading states. Foundation primitive
// rehomed off the app-local `@/components/ui/skeleton`; skinned by the host `bg-primary`
// token. Consumed on its own and by the `Sidebar` block's menu skeleton.
function Skeleton({ className, ...props }: React.ComponentProps<'div'>) {
    return (
        <div
            data-slot="skeleton"
            className={cn('bg-primary/10 animate-pulse rounded-md', className)}
            {...props}
        />
    );
}

export { Skeleton };
