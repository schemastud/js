import type { ComponentType } from 'react';
import type { WidgetRegistry } from '@schemastud/seam';
import { FRAME_CONTEXT_KEYWORD } from '../resolveWidgetFor';
import { StatRow } from './StatRow';
import { FigureCard } from './FigureCard';
import { RecentList } from './RecentList';
import { NavTile } from './NavTile';
import { DashboardCard } from './DashboardCard';
import type { IconResolver } from './types';

export { StatRow, CardHeading } from './StatRow';
export { FigureCard } from './FigureCard';
export { RecentList } from './RecentList';
export { NavTile } from './NavTile';
export { DashboardCard, resolveDashboardCard } from './DashboardCard';
export type {
    SummaryFigure,
    SummaryPayload,
    OverviewPayload,
    DashboardRow,
    NavTilePayload,
    IconResolver,
    CardWidgetOptions,
    CardWidgetProps,
} from './types';

/** The five default card widgets, by the `x-widget` name a declaration binds. */
export const CARD_WIDGETS: Record<
    'stat-row' | 'figure-card' | 'recent-list' | 'nav-tile' | 'dashboard-card',
    ComponentType<any>
> = {
    'stat-row': StatRow,
    'figure-card': FigureCard,
    'recent-list': RecentList,
    'nav-tile': NavTile,
    'dashboard-card': DashboardCard,
};

export interface RegisterCardWidgetsOptions {
    /** The host's icon-name → glyph resolver; reaches every card as `options.iconFor`. */
    iconFor?: IconResolver;
}

// Registries already carrying the card set — a WeakSet so a registry that goes out of scope
// is not retained, and a strict-mode double call (or two providers over one registry) does
// not stack a second copy of every entry.
const installed = new WeakSet<WidgetRegistry>();

/**
 * Register the default card widgets into a seam registry — the ONE call a host provider
 * makes (realm-dashboards ticket 03).
 *
 * Two kinds of entry, and their order is the contract:
 *
 *  1. Context DEFAULTS — `stat-row` fires for any node the resolver stamped as context
 *     `summary`, `figure-card` for `overview`. They match only an UNBOUND node
 *     (`!s['x-widget']`), so a declared name always wins: one registered by the host before
 *     this call is not shadowed, and one the registry does not know stays honestly unbound
 *     (`ResolvedForContext.unbound`) rather than silently taking the default.
 *  2. NAMED widgets — the five names a declaration (`#[WidgetIn('summary', 'stat-row')]`)
 *     binds. Registered AFTER the defaults so they sit ahead of them in the registry (later
 *     registrations are consulted first).
 *
 * A host replaces any of them by registering a later predicate on the same name or the same
 * `x-frame-context` — the seam registry's ordinary override path, no hook here.
 */
export function registerCardWidgets(registry: WidgetRegistry, options: RegisterCardWidgetsOptions = {}): void {
    if (installed.has(registry)) return;
    const config = { iconFor: options.iconFor };

    registry.registerWidget(
        (s) => s[FRAME_CONTEXT_KEYWORD] === 'summary' && !s['x-widget'],
        StatRow,
        config,
    );
    registry.registerWidget(
        (s) => s[FRAME_CONTEXT_KEYWORD] === 'overview' && !s['x-widget'],
        FigureCard,
        config,
    );
    for (const [name, widget] of Object.entries(CARD_WIDGETS)) {
        registry.registerWidget((s) => s['x-widget'] === name, widget, config);
    }

    installed.add(registry);
}
