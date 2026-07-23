import * as SelectPrimitive from '@radix-ui/react-select';
import { Check, ChevronDown, ChevronUp } from 'lucide-react';
import * as React from 'react';
import { cn } from './cn';

const Select = SelectPrimitive.Root;
const SelectGroup = SelectPrimitive.Group;
const SelectValue = SelectPrimitive.Value;

function SelectTrigger({
    className,
    children,
    ...props
}: React.ComponentProps<typeof SelectPrimitive.Trigger>) {
    return (
        <SelectPrimitive.Trigger
            className={cn(
                'flex h-9 w-full items-center justify-between gap-2 rounded-md border border-input bg-card px-3 py-1 text-sm whitespace-nowrap shadow-xs transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 data-[placeholder]:text-muted-foreground [&>span]:truncate',
                className,
            )}
            {...props}
        >
            {children}
            <SelectPrimitive.Icon asChild>
                <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
            </SelectPrimitive.Icon>
        </SelectPrimitive.Trigger>
    );
}

function SelectContent({
    className,
    children,
    position = 'popper',
    ...props
}: React.ComponentProps<typeof SelectPrimitive.Content>) {
    return (
        <SelectPrimitive.Portal>
            <SelectPrimitive.Content
                position={position}
                className={cn(
                    'relative z-50 max-h-[min(24rem,var(--radix-select-content-available-height))] min-w-[8rem] overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-md data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95',
                    position === 'popper' &&
                        'data-[side=bottom]:translate-y-1 data-[side=top]:-translate-y-1',
                    className,
                )}
                {...props}
            >
                <SelectPrimitive.ScrollUpButton className="flex items-center justify-center py-1">
                    <ChevronUp className="size-4" />
                </SelectPrimitive.ScrollUpButton>
                <SelectPrimitive.Viewport
                    className={cn(
                        'p-1',
                        position === 'popper' &&
                            'h-[var(--radix-select-trigger-height)] w-full min-w-[var(--radix-select-trigger-width)]',
                    )}
                >
                    {children}
                </SelectPrimitive.Viewport>
                <SelectPrimitive.ScrollDownButton className="flex items-center justify-center py-1">
                    <ChevronDown className="size-4" />
                </SelectPrimitive.ScrollDownButton>
            </SelectPrimitive.Content>
        </SelectPrimitive.Portal>
    );
}

function SelectItem({
    className,
    children,
    ...props
}: React.ComponentProps<typeof SelectPrimitive.Item>) {
    return (
        <SelectPrimitive.Item
            className={cn(
                'relative flex w-full cursor-default items-center gap-2 rounded-sm py-1.5 pr-8 pl-2 text-sm outline-hidden select-none focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
                className,
            )}
            {...props}
        >
            <span className="absolute right-2 flex size-3.5 items-center justify-center">
                <SelectPrimitive.ItemIndicator>
                    <Check className="size-4 text-primary" />
                </SelectPrimitive.ItemIndicator>
            </span>
            <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
        </SelectPrimitive.Item>
    );
}

function SelectLabel({ className, ...props }: React.ComponentProps<typeof SelectPrimitive.Label>) {
    return (
        <SelectPrimitive.Label
            className={cn('px-2 py-1.5 font-mono text-xs text-muted-foreground', className)}
            {...props}
        />
    );
}

function SelectSeparator({
    className,
    ...props
}: React.ComponentProps<typeof SelectPrimitive.Separator>) {
    return (
        <SelectPrimitive.Separator
            className={cn('-mx-1 my-1 h-px bg-border', className)}
            {...props}
        />
    );
}

export interface SimpleSelectOption {
    value: string;
    label: string;
}

// Radix forbids empty-string item values, but "All"-style options are common —
// translate '' through a sentinel at this seam.
const EMPTY_SENTINEL = '__empty__';

/**
 * Flat-list convenience over the Radix Select: `{ value, label }` options with
 * plain `value`/`onValueChange` strings, empty-string values allowed.
 */
function SimpleSelect({
    value,
    onValueChange,
    options,
    placeholder,
    disabled,
    className,
    id,
    'aria-label': ariaLabel,
}: {
    value: string;
    onValueChange: (value: string) => void;
    options: SimpleSelectOption[];
    placeholder?: string;
    disabled?: boolean;
    className?: string;
    id?: string;
    'aria-label'?: string;
}) {
    // '' maps to the sentinel ONLY when there's an empty-value option to select
    // (an "All"-style row). With no such option, '' means "nothing selected" →
    // pass undefined so Radix shows the placeholder instead of a blank trigger.
    const hasEmptyOption = options.some((option) => option.value === '');
    const selectValue = value === '' ? (hasEmptyOption ? EMPTY_SENTINEL : undefined) : value;

    return (
        <Select
            value={selectValue}
            onValueChange={(next) => onValueChange(next === EMPTY_SENTINEL ? '' : next)}
            disabled={disabled}
        >
            <SelectTrigger className={className} id={id} aria-label={ariaLabel}>
                <SelectValue placeholder={placeholder} />
            </SelectTrigger>
            <SelectContent>
                {options.map((option) => (
                    <SelectItem
                        key={option.value || EMPTY_SENTINEL}
                        value={option.value === '' ? EMPTY_SENTINEL : option.value}
                    >
                        {option.label}
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
    );
}

export {
    Select,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectLabel,
    SelectSeparator,
    SelectTrigger,
    SelectValue,
    SimpleSelect,
};
