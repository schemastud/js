import { CardLink } from './chrome';
import type { CardWidgetProps, NavTilePayload } from './types';

/**
 * A jump-to tile — the realm's nav manifest drawn as a door. `{ label, icon, href,
 * description? }`, nothing else: the tile is realm-blind and reads only what the nav
 * contribution stamped. With no icon resolver (or an unknown name) it draws the label's
 * initial in the glyph well rather than nothing, so a row of tiles keeps its rhythm.
 *
 * The whole tile IS the link, so it goes through the host's injected `renderLink` like every
 * other anchor a card draws — a nav tile that full-page-reloads is the worst offender of the
 * five, since navigation is the only thing it does.
 */
export function NavTile({ value, options }: CardWidgetProps<NavTilePayload>) {
    if (!value?.href) return null;
    const Icon = options?.iconFor?.(value.icon);

    return (
        <CardLink
            href={value.href}
            className="group flex items-center gap-3 rounded-md border bg-card p-3 text-card-foreground transition-colors hover:border-primary/40 hover:bg-muted/40"
            marker={{ 'data-frame-card': 'nav-tile' }}
            options={options}
        >
            <span
                aria-hidden
                className="grid size-8 flex-none place-items-center rounded-md bg-muted/60 text-muted-foreground group-hover:text-foreground"
            >
                {Icon ? (
                    <Icon className="size-4" />
                ) : (
                    <span className="text-xs font-semibold uppercase">{value.label.slice(0, 1)}</span>
                )}
            </span>
            <span className="min-w-0">
                <span className="block truncate text-sm font-medium">{value.label}</span>
                {value.description ? (
                    <span className="block truncate text-[11px] text-muted-foreground">
                        {value.description}
                    </span>
                ) : null}
            </span>
        </CardLink>
    );
}
