export { C as CARD_WIDGETS } from './index-DgSOfXwC.js';
import { o as CardWidgetProps, p as SummaryPayload, k as Row, q as NavTilePayload, W as WelcomePayload, r as CardWidgetOptions, D as DashboardRow, M as ManifestLookup, b as ContextManifest, s as SummaryFigure } from './types-C1zrU238.js';
export { t as OverviewPayload, u as WelcomeAction } from './types-C1zrU238.js';
import * as react from 'react';
import { WidgetRegistry } from '@schemastud/seam';
import { R as ResolvedForContext } from './resolveWidgetFor-DyTPD2bA.js';
import '@rjsf/utils';
import '@schemastud/facets';
import '@schemastud/ui';

/**
 * The `summary` context default: a resource compressed to its figures, one `StatTile` per
 * figure. The header names the collection and, on a dashboard row, links to it. Zero
 * figures is an honest empty ("No figures."), never a blank card — an empty platform reads
 * honest zeroes, and a provider that answered nothing reads as exactly that.
 */
declare function StatRow({ value, options, row }: CardWidgetProps<SummaryPayload>): react.JSX.Element;

/**
 * The `overview` context default: a resource expanded to a card with a body — the overview's
 * `headline` large, every `figure` as a sub-tile beneath it, `period` as the subtitle, `note`
 * as a caption, and a "View all" link when the row carries an href (tower's billing snapshot,
 * generalized). A payload with no `headline` (a summary answered for an overview row, as the
 * `overview ← summary` cascade allows) leads with its first figure instead, so the card never
 * opens on an empty number. A resource that declared only a summary never lands here from a
 * dashboard: `dashboard-card` falls through to `stat-row` first, inside the SAME
 * {@link OverviewFrame} chrome this card is built from.
 */
declare function FigureCard({ value, options, row }: CardWidgetProps<SummaryPayload>): react.JSX.Element;

declare function RecentList({ value, options, row }: CardWidgetProps<SummaryPayload>): react.JSX.Element;

/**
 * `record-line` — frame's ONE-LINE rendering of a record whose resource binds no `list-item`
 * widget of its own. `recent-list` draws each item with it when the TARGET's root `list-item`
 * declares NO name. Measured at tower and the flagship: the Activity overview card printed
 * `5,4,3,2,1`, because `splicewire/tower`'s `CentralActivityData` carries `description` /
 * `event` / `createdAt` and no `name` / `title` / `label` — an unbound root through
 * `SchemaView` falls to its scalar default, and a display-name fallback that knows only three
 * field names falls through to the id.
 *
 * Three slots, each optional, read by field-name convention off the record the server sent:
 *   text  — the first present of `title | label | name | description | summary`
 *   badge — `event`, else `status`
 *   time  — the first present of `created_at/createdAt | occurred_at/occurredAt | updated_at/updatedAt`: short relative
 *           within a week (`2h ago`, `yesterday`), the locale date beyond it, and the RAW string
 *           when unparseable — never `Invalid Date`, never a dash for a populated-and-wrong value
 * The id is the text only when no text field exists: the last resort, not the default.
 *
 * A NAMED widget only. It is deliberately NOT registered as the `list-item` context default:
 * that predicate would make every participates-but-unbound root resolve a component, and
 * `listItemRendersCards` would flip tower's threads/compositions tables into card grids.
 * `recent-list` picks it by name, and only where no name was declared — a declared name the
 * registry does not know stays the honest unbound marker there, as it does everywhere else.
 */
declare function RecordLine({ value }: CardWidgetProps<Row>): react.JSX.Element;
/**
 * Short relative within a week, the locale date beyond it, the raw string when unparseable.
 * `now` is a parameter so a test pins it; the widget passes the wall clock.
 */
declare function formatRecordTime(raw: string, now?: number): string;

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
declare function NavTile({ value, options }: Pick<CardWidgetProps<NavTilePayload>, 'value' | 'options'>): react.JSX.Element | null;

/**
 * The dashboard's first-run / nothing-yet panel — what a `{realm}-dashboard` row of context
 * `'welcome'` draws. The server sends that row only when the dashboard has no card and no tile
 * for the viewer, so this panel stands in for frame's generic "No records." on the one surface
 * where an empty list is a person's first screen.
 *
 * Every word and every destination is the payload's: `heading`, `body`, `actions` (host-routed
 * links, the first drawn as the primary button) and an optional `hint`. The panel invents no
 * affordance — an action the host does not route never reaches it. Links go through the host's
 * injected `renderLink` like every other anchor a card draws.
 */
declare function WelcomePanel({ value, options }: {
    value: WelcomePayload;
    options?: CardWidgetOptions;
}): react.JSX.Element;

interface DashboardCardResolution extends ResolvedForContext {
    /**
     * WHICH declaration produced this widget — `'overview'` / `'summary'` for a named binding
     * (an overview that merely inherited the summary's name reports `'summary'`, because that
     * is the widget that will draw), `'default'` for the row context's registry default.
     */
    tier: 'overview' | 'summary' | 'default';
}
/**
 * The fallback chain for a dashboard row against its target's manifest:
 * `overview` (when the row asks for it and the target participates) → `summary` (when the
 * target participates) → the context DEFAULT for the row's own context (the registry's
 * predicate on the stamped `x-frame-context`, for an unbound node).
 *
 * The cascade parent is derived HERE from the manifest (`byNode['']?.[INHERITS[ctx]]`) —
 * `SchemaView` passes `undefined` for every context, so an `overview` resolved through it
 * never cascades; a card is the one surface where `overview ← summary` has to.
 *
 * ⚠️ A tier whose declared name resolves to NO component STOPS the chain (`bound === false`), it does
 * not fall through. The declaration named something; taking the next tier or the default would
 * dress a typo as a working card and there would be nothing on the screen to say so. That is
 * the same answer `registerCardWidgets` and `listItemRendersCards` give for an unknown name,
 * and all three now agree.
 */
declare function resolveDashboardCard(row: DashboardRow, manifest: ContextManifest, registry: WidgetRegistry): DashboardCardResolution;
/**
 * Will this row draw ANYTHING? The question `DefaultCards` asks before it lays out a cell, so
 * a row that drops takes its cell with it instead of leaving an empty grid track where a card
 * ought to be. A row that is not a dashboard row is not this function's business (an ordinary
 * resource's cards path renders through `SchemaView` and always draws something); a `'nav'` row
 * needs no lookup at all; an unbound tier DOES draw — its honest marker.
 */
declare function dashboardRowRenders(record: Row, manifestFor: ManifestLookup | undefined, registry: WidgetRegistry): boolean;
/**
 * The `list-item` widget a `{realm}-dashboard` row binds. It dispatches on the row's
 * `context` to the TARGET resource's root entry (see {@link resolveDashboardCard}) and mounts
 * the resolved card with the row's `summary` payload; a `'nav'` row draws a {@link NavTile}
 * without any lookup.
 *
 * An `overview` row that fell back to the target's SUMMARY binding is mounted inside the
 * {@link OverviewFrame} — heading, headline, period, note — with the summary widget as the
 * body. The row asked for an overview and the server sent an overview payload; rendering the
 * summary widget bare would drop `headline`/`period`/`note` on the floor with no trace.
 *
 * A row whose target manifest this host cannot reach (a contributed card naming a resource
 * the host does not mount, or a manifest still in flight) renders NOTHING — it drops, it
 * never throws, so a package cannot 500 a host's dashboard (nav-contribution PLAN: contributed
 * nodes drop). No log either: in-flight is the common case and would make the warning noise.
 */
declare function DashboardCard({ value, options }: CardWidgetProps<DashboardRow>): react.JSX.Element | null;

/** One period of the series, as the chart reads it. */
interface TrendPoint {
    key: string;
    label: string;
    /** The plotted number; null when the figure's value is not a plain number (a gap). */
    value: number | null;
    /** The value as the server sent it, for the text alternative. */
    display: number | string;
    forecast: boolean;
    index: number;
}
/** A run of consecutive plotted points drawn in one stroke. */
interface TrendSegment {
    forecast: boolean;
    points: TrendPoint[];
}
/** The figures of a summary as the ordered period series. */
declare function trendSeries(figures: readonly SummaryFigure[]): TrendPoint[];
/**
 * The strokes the series draws. Each step between two adjacent plotted periods is dashed when
 * EITHER end is a forecast, so the step that leaves the last measured period for the first
 * forecast one is already dashed: the line stays continuous and the change of basis falls on
 * the last measured point. Consecutive steps of one basis merge into one segment. A gap (a
 * period with no plottable value) breaks the line; a period with no plotted neighbour is a
 * segment of one point, which the chart draws as a dot.
 */
declare function trendSegments(points: readonly TrendPoint[]): TrendSegment[];
/**
 * The last measured period before the first forecast one: where the basis changes. Null when the
 * series has no forecast, or no measured period ahead of its first forecast.
 */
declare function forecastBoundary(points: readonly TrendPoint[]): TrendPoint | null;
/** The one-sentence description of the series the chart's `<title>` carries. */
declare function describeTrend(label: string, points: readonly TrendPoint[]): string;
/**
 * The `trend-card` widget: a summary's figures as a period series. Measured periods draw as a
 * solid line in the primary token; forecast periods as a dashed line in the muted token, with a
 * dashed rule at the last measured period. Basis is never carried by color alone: the dash, the
 * legend, and the text alternative each say it.
 *
 * Accessible as an image with a one-sentence `<title>`, plus a visually hidden table of every
 * period, its value as sent, and its basis. Colors are semantic tokens only (`currentColor`
 * under `text-*`), so light, dark and a satellite's re-treatment reach it.
 *
 * On a summary row it leads with the latest measured period. On an overview row that fell back
 * to this summary widget, `dashboard-card`'s overview frame already draws the declared headline,
 * so the lead is left to it.
 */
declare function TrendCard({ value, options, row }: CardWidgetProps<SummaryPayload>): react.JSX.Element;

export { CardWidgetOptions, CardWidgetProps, DashboardCard, DashboardRow, FigureCard, NavTile, NavTilePayload, RecentList, RecordLine, StatRow, SummaryFigure, SummaryPayload, TrendCard, type TrendPoint, type TrendSegment, WelcomePanel, WelcomePayload, dashboardRowRenders, describeTrend, forecastBoundary, formatRecordTime, resolveDashboardCard, trendSegments, trendSeries };
