import type { ComponentType, ReactNode } from 'react';
import { cn } from './cn';

/**
 * The tone a figure carries — the enum tower-ux's private `StatTile` had, lifted verbatim
 * so `@splicewire/tower-ux` and frame's `stat-row` card draw the same tile. Each tone maps
 * to ONE semantic token the host owns (`signal` / `info` / `warning` / `destructive`);
 * nothing here names a hue, so a satellite re-treats a tile by re-declaring the token at
 * its root, never by forking the component.
 */
export type StatTone = 'default' | 'active' | 'busy' | 'warn' | 'danger';

export const STAT_TONES: readonly StatTone[] = ['default', 'active', 'busy', 'warn', 'danger'];

const TONE_CLASS: Record<StatTone, string> = {
    default: 'text-muted-foreground',
    active: 'text-signal',
    busy: 'text-info',
    warn: 'text-warning',
    danger: 'text-destructive',
};

export interface StatTileProps {
    label: string;
    value: number | string | ReactNode;
    /** An optional glyph beside the figure — a lucide-style component taking `className`. */
    icon?: ComponentType<{ className?: string }>;
    tone?: StatTone;
    className?: string;
}

/**
 * One figure with its label — the at-a-glance tile a dashboard row is made of. Lifted from
 * `tower-ux/src/operator/OperatorDashboardPage.tsx` (realm-dashboards ticket 03) with the
 * brand-tier var fallbacks and the `text-amber-600` literal replaced by semantic tokens.
 *
 * Toneless by default: `tone` colours only the glyph well, never the figure, so a row of
 * tiles reads as one system with the status colour as the accent.
 */
export function StatTile({ label, value, icon: Icon, tone = 'default', className }: StatTileProps) {
    return (
        <div
            data-stat-tile
            data-tone={tone}
            className={cn(
                'flex items-center gap-3 rounded-lg border bg-card p-4 text-card-foreground shadow-sm',
                className,
            )}
        >
            {Icon ? (
                <div
                    className={cn(
                        'grid size-9 flex-none place-items-center rounded-md bg-muted/60',
                        TONE_CLASS[tone],
                    )}
                >
                    <Icon className="size-4" />
                </div>
            ) : null}
            <div className="min-w-0">
                <div className="text-2xl font-semibold leading-none tabular-nums">{value}</div>
                <div className="mt-1 truncate text-xs text-muted-foreground">{label}</div>
            </div>
        </div>
    );
}
