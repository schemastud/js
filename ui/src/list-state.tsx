import type { ReactNode } from 'react';
import { cn } from './cn';

/**
 * The keep-previous cross-fade + skeleton primitive for **non-table** list
 * surfaces (card grids, stacked lists) — the same two-phase loading the
 * DataTable already gives tabular lists (UI-01), generalized so no card list
 * flashes a bare "Loading…" anywhere (UI-18).
 *
 * Two phases, decided from whether content already exists:
 * - **First load** (pending, nothing to show yet) → shaped skeleton rows via
 *   {@link ListSkeleton}, never a bare "Loading…".
 * - **Re-filter / refetch** (pending but previous content is on screen) → keep
 *   the previous content, dimmed, and cross-fade to the new set.
 *
 * Feed it the query's `isPending` and whether it currently `hasItems`. Motion is
 * the shared standard (`list-cross-fade`, the `--splice-motion-*` tokens) — a
 * host-owned Tailwind utility, so the host owns the timing and the
 * `prefers-reduced-motion` guard; the primitive only names the class.
 */
export function ListState({
    isPending,
    hasItems,
    skeleton,
    children,
    className,
}: {
    /** The list query is in flight with no cached data. */
    isPending: boolean;
    /** Whether the list currently has any items to show. */
    hasItems: boolean;
    /** The skeleton to show on first load. Defaults to shaped rows. */
    skeleton?: ReactNode;
    /** The rendered list (and empty state) when content is available. */
    children: ReactNode;
    className?: string;
}) {
    // First load = pending with nothing yet → skeleton. Refetch = pending but we
    // already have previous content → keep it, dimmed, and cross-fade.
    const showSkeleton = isPending && !hasItems;
    const refetching = isPending && hasItems;

    if (showSkeleton) {
        return (
            <div className={className} aria-busy>
                {skeleton ?? <ListSkeleton />}
            </div>
        );
    }

    return (
        <div
            className={cn('list-cross-fade', refetching && 'opacity-40', className)}
            aria-busy={refetching || undefined}
        >
            {children}
        </div>
    );
}

/**
 * Shaped placeholder rows for a card/stacked list's first load — the card-list
 * analogue of the DataTable's skeleton rows. `variant="grid"` lays the
 * placeholders out in the same responsive grid the card lists use.
 */
export function ListSkeleton({
    rows = 6,
    variant = 'grid',
    className,
}: {
    rows?: number;
    variant?: 'grid' | 'stack';
    className?: string;
}) {
    return (
        <div
            className={cn(
                variant === 'grid' ? 'grid gap-3 sm:grid-cols-2 lg:grid-cols-3' : 'space-y-2',
                className,
            )}
            data-testid="list-skeleton"
        >
            {Array.from({ length: rows }).map((_, i) => (
                <div
                    key={i}
                    className="space-y-3 rounded-md border bg-card p-4"
                    data-testid="skeleton-card"
                >
                    <div
                        className="h-4 animate-pulse rounded bg-muted"
                        style={{ width: `${[70, 55, 62, 48][i % 4]}%` }}
                    />
                    <div className="h-3 w-2/5 animate-pulse rounded bg-muted" />
                </div>
            ))}
        </div>
    );
}
