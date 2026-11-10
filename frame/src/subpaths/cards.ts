// =============================================================================
// @schemastud/frame/cards — the dashboard card components, trend helpers and payload types (ruling 02 §8).
//
// A host registers the card set with the root's `registerCardWidgets` (or a kit does it for it) and reaches for this
// entry only to draw a card itself or to type a dashboard row.
// =============================================================================

export {
    resolveDashboardCard,
    CARD_WIDGETS,
    StatRow,
    FigureCard,
    RecentList,
    RecordLine,
    formatRecordTime,
    NavTile,
    WelcomePanel,
    DashboardCard,
    dashboardRowRenders,
    TrendCard,
    trendSeries,
    trendSegments,
    forecastBoundary,
    describeTrend,
    type TrendPoint,
    type TrendSegment,
    type SummaryFigure,
    type SummaryPayload,
    type OverviewPayload,
    type DashboardRow,
    type WelcomePayload,
    type WelcomeAction,
    type NavTilePayload,
    type CardWidgetOptions,
    type CardWidgetProps,
} from '../cards';
