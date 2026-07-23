// @schemastud/ui — the portable foundation UI primitives.
//
// The generic-UI half of the rehoming contract (rehome-components §4): a rehomed
// component depends on THESE statically instead of importing app-local `@/components/*`.
// Every primitive is skinned by semantic Tailwind tokens the host owns — zero hard-coded
// colors — so the host themes them by defining `--color-*` / `--swc-*`, never by forking.

export { cn } from './cn';

// Sort vocabulary shared with the DataTable headers (byte-for-byte twin of the copy in
// @schemastud/facets — see src/sort.ts for why it is copied, not imported).
export {
    parseSort,
    serializeSort,
    toggleSortKey,
    sortStateFor,
    type SortKey,
} from './sort';

export { Button, buttonVariants } from './button';
export { Badge, badgeVariants } from './badge';
export {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from './dialog';
export { Input } from './input';
export { Label } from './label';
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
    type SimpleSelectOption,
} from './select';
export { Popover, PopoverTrigger, PopoverContent } from './popover';
export { DataTable, type ServerPagination, type DataTableSort } from './DataTable';
