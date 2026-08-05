import * as SeparatorPrimitive from '@radix-ui/react-separator';
import type * as React from 'react';
import { cn } from './cn';

// Separator — a thin Radix-backed divider. Foundation primitive rehomed off the
// app-local `@/components/ui/separator` it replaces; skinned by the host `bg-border`
// token, zero hard-coded color. Consumed on its own and by the `Sidebar` block.
function Separator({
    className,
    orientation = 'horizontal',
    decorative = true,
    ...props
}: React.ComponentProps<typeof SeparatorPrimitive.Root>) {
    return (
        <SeparatorPrimitive.Root
            data-slot="separator-root"
            decorative={decorative}
            orientation={orientation}
            className={cn(
                'bg-border shrink-0 data-[orientation=horizontal]:h-px data-[orientation=horizontal]:w-full data-[orientation=vertical]:h-full data-[orientation=vertical]:w-px',
                className,
            )}
            {...props}
        />
    );
}

export { Separator };
