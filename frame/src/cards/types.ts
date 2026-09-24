import type { ComponentType, ReactNode } from 'react';
import type { SchemaNode } from '@schemastud/seam';
import type { StatTone } from '@schemastud/ui';
import type { FrameContext } from '../contexts';
import type { Row } from '../types';

// =============================================================================
// The payloads a card widget receives (realm-dashboards ticket 03). These mirror the
// PHP summary response Data class and the dashboard row Data class on the wire; the
// client never invents a field the server did not send.
// =============================================================================

/** One figure of a summary: `{ key, label, value, tone? }`. */
export interface SummaryFigure {
    key: string;
    label: string;
    value: number | string;
    tone?: StatTone | null;
}

/**
 * The `resources/{resource}/summary` response, and the `summary` payload on a dashboard
 * row. `key` is the resource key. No `href` — the socket is realm-blind; hrefs are stamped
 * onto the dashboard row by the realm-aware backing.
 */
export interface SummaryPayload {
    key: string;
    label: string;
    icon?: string | null;
    figures: SummaryFigure[];
    overview?: OverviewPayload | null;
}

/**
 * The expanded body of a summary — the PHP `OverviewData`. `headline` is the one figure an
 * overview leads with; `items` are the top-N records of the resource (what `recent-list`
 * renders through the resource's own `list-item` binding); `period` names the window the
 * figures cover; `note` is a one-line caption.
 */
export interface OverviewPayload {
    headline?: SummaryFigure | null;
    items: Row[];
    period?: string | null;
    note?: string | null;
}

/** One next step on a {@link WelcomePayload}: a host-routed destination, addressed by `key`. */
export interface WelcomeAction {
    key: string;
    label: string;
    href: string;
}

/**
 * The panel a dashboard draws when it has nothing else for the viewer — the PHP
 * `DashboardWelcomeData`. `first-run`: the viewer is on no team; `empty`: nothing to show yet.
 * The copy is the server's; `actions` are only destinations the host routes, and `hint` is a
 * line with no destination of its own (null when it would promise a flow the host lacks).
 */
export interface WelcomePayload {
    state: 'first-run' | 'empty';
    heading: string;
    body: string;
    actions: WelcomeAction[];
    hint?: string | null;
}

/**
 * A row of a `{realm}-dashboard` resource. `context` says which rendering of the TARGET
 * resource this card is (`overview` when the target declares one, else `summary`); a
 * jump-to tile appended from the realm's nav contribution carries `'nav'` and no summary.
 * A `'welcome'` row is the dashboard's ONLY row when it has no card and no tile for the
 * viewer: no `resource`, no `summary`, its panel in `welcome`.
 */
export interface DashboardRow {
    resource?: string | null;
    context: Extract<FrameContext, 'summary' | 'overview'> | 'nav' | 'welcome';
    navOrder?: number | null;
    label: string;
    icon?: string | null;
    href: string;
    description?: string | null;
    summary?: SummaryPayload | null;
    welcome?: WelcomePayload | null;
}

/** What `nav-tile` draws — a nav leaf. */
export interface NavTilePayload {
    label: string;
    icon?: string | null;
    href: string;
    description?: string | null;
}

/**
 * A host's icon-name → glyph resolver (`frameIcon` at beam-inertia). Frame ships no icon
 * vocabulary; the host passes one to {@link registerCardWidgets} and every card reads it
 * off its registry config as `options.iconFor`. Absent, cards draw no glyph.
 */
export type IconResolver = (name: string | null | undefined) => ComponentType<{ className?: string }> | undefined;

/**
 * A host's navigation primitive, the same seam `@schemastud/nav`'s `ExpandableNav` takes as
 * `renderLink`. Frame ships none: a raw `<a href>` full-page-reloads an Inertia or router
 * host. The host passes one to {@link registerCardWidgets} and every anchor a card draws —
 * the heading link, "View all", the whole nav tile — goes through it. Absent, cards render a
 * plain anchor carrying frame's own `data-frame-*` marker.
 */
export type CardLinkRenderer = (props: {
    href: string;
    className?: string;
    children: ReactNode;
    'aria-label'?: string;
}) => ReactNode;

/** The registry config every card entry carries — reaches a widget as `options`. */
export interface CardWidgetOptions {
    iconFor?: IconResolver;
    renderLink?: CardLinkRenderer;
    [key: string]: unknown;
}

/**
 * The props `SchemaView` mounts a resolved widget with (`value` + read-only hints + the
 * matched registry config as `options`), plus the dashboard `row` when `dashboard-card`
 * is the one mounting it — that is how `recent-list` learns its "View all" href.
 */
export interface CardWidgetProps<T = unknown> {
    value: T;
    formData?: T;
    schema?: SchemaNode;
    options?: CardWidgetOptions;
    readOnly?: boolean;
    disabled?: boolean;
    row?: DashboardRow;
}
