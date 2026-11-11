import { Widget } from '@rjsf/utils';
import { WidgetRegistry } from '@schemastud/seam';
import { I as IconResolver, C as CardLinkRenderer } from './types-C1zrU238.js';

/**
 * The seven default card widgets, by the `x-widget` name a declaration binds. `trend-card`
 * (exec-board ticket 06) is a named entry only, like `record-line`: a summary draws as a series
 * only where its declaration asks for one.
 */
declare const CARD_WIDGETS: Record<'stat-row' | 'figure-card' | 'recent-list' | 'record-line' | 'nav-tile' | 'dashboard-card' | 'trend-card', Widget>;
interface RegisterCardWidgetsOptions {
    /** The host's icon-name → glyph resolver; reaches every card as `options.iconFor`. */
    iconFor?: IconResolver;
    /**
     * The host's navigation primitive; reaches every card as `options.renderLink` and is what
     * every anchor a card draws goes through. Absent, a card draws a plain `<a href>` — correct
     * markup, but a full page load under a router host.
     */
    renderLink?: CardLinkRenderer;
}
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
 *  2. NAMED widgets — the seven names a declaration (`#[WidgetIn('summary', 'stat-row')]`)
 *     binds. Registered AFTER the defaults so they sit ahead of them in the registry (later
 *     registrations are consulted first).
 *
 * `record-line` is a NAMED entry only — never a `list-item` context default. That predicate
 * would make every participates-but-unbound root resolve a component, and `listItemRendersCards`
 * would flip tower's threads/compositions tables into card grids. `recent-list` picks it by
 * name, and only where the target declared no name.
 *
 * A host replaces a named one by registering the same name again, and a context default by a
 * later predicate on the same `x-frame-context` — the seam registry's ordinary override path,
 * no hook here.
 */
declare function registerCardWidgets(registry: WidgetRegistry, options?: RegisterCardWidgetsOptions): void;

export { CARD_WIDGETS as C, type RegisterCardWidgetsOptions as R, registerCardWidgets as r };
