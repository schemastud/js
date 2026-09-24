import type { ReactNode } from 'react';
import type { WidgetRegistry } from '@schemastud/seam';
import { useFrameInjection } from '../context';
import { INHERITS, type ContextManifest, type FrameContext, type NodeParticipation } from '../contexts';
import { isWidgetComponent, resolveWidgetFor, type ResolvedForContext } from '../resolveWidgetFor';
import { UnboundWidget, widgetMountProps } from '../SchemaView';
import { OverviewFrame, ROOT_NODE } from './chrome';
import { NavTile } from './NavTile';
import { WelcomePanel } from './WelcomePanel';
import type { ManifestLookup, Row } from '../types';
import type { CardWidgetOptions, CardWidgetProps, DashboardRow, SummaryPayload } from './types';

/**
 * A root entry counts as a binding only when it PARTICIPATES. A `#[Summary(false)]` opt-out
 * still travels the wire as an entry (`participates: false`, possibly still naming a widget)
 * and must not lend that name to a cascading `overview` — an opted-out summary is no summary.
 */
function bindingOf(
    root: Partial<Record<FrameContext, NodeParticipation>>,
    ctx: FrameContext | undefined,
): NodeParticipation | undefined {
    if (!ctx) return undefined;
    const cm = root[ctx];
    return cm?.participates ? cm : undefined;
}

export interface DashboardCardResolution extends ResolvedForContext {
    /**
     * WHICH declaration produced this widget — `'overview'` / `'summary'` for a named binding
     * (an overview that merely inherited the summary's name reports `'summary'`, because that
     * is the widget that will draw), `'default'` for the row context's registry default.
     */
    tier: 'overview' | 'summary' | 'default';
    /** The widget name the declaration asked for, when it asked for one. */
    declared?: string;
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
 * ⚠️ A tier whose declared name resolves to NO component STOPS the chain (`unbound`), it does
 * not fall through. The declaration named something; taking the next tier or the default would
 * dress a typo as a working card and there would be nothing on the screen to say so. That is
 * the same answer `registerCardWidgets` and `listItemRendersCards` give for an unknown name,
 * and all three now agree.
 */
export function resolveDashboardCard(
    row: DashboardRow,
    manifest: ContextManifest,
    registry: WidgetRegistry,
): DashboardCardResolution {
    const root = manifest.byNode[''] ?? {};
    const own: Extract<FrameContext, 'summary' | 'overview'> = row.context === 'overview' ? 'overview' : 'summary';
    const chain: Extract<FrameContext, 'summary' | 'overview'>[] = own === 'overview' ? ['overview', 'summary'] : ['summary'];

    for (const ctx of chain) {
        const cm = bindingOf(root, ctx);
        if (!cm) continue;
        const lender = bindingOf(root, INHERITS[ctx]);
        const resolved = resolveWidgetFor(ROOT_NODE, ctx, cm, lender, registry);
        // The name actually in play: the tier's own, else the one it inherited across the
        // cascade edge. It is what the unbound marker has to be able to say.
        const inherited = cm.widget === undefined && cm.inheritsBinding !== false ? lender?.widget : undefined;
        const declared = cm.widget ?? inherited;
        if (resolved.unbound || isWidgetComponent(resolved.widget)) {
            // A widget the tier only INHERITED is the lender's widget, and it draws the lender's
            // rendering — so the overview chrome is still this row's to supply.
            return { ...resolved, tier: inherited !== undefined ? (INHERITS[ctx] as 'summary') : ctx, declared };
        }
    }

    return {
        ...resolveWidgetFor(ROOT_NODE, own, { participates: true }, undefined, registry),
        tier: 'default',
    };
}

/**
 * Will this row draw ANYTHING? The question `DefaultCards` asks before it lays out a cell, so
 * a row that drops takes its cell with it instead of leaving an empty grid track where a card
 * ought to be. A row that is not a dashboard row is not this function's business (an ordinary
 * resource's cards path renders through `SchemaView` and always draws something); a `'nav'` row
 * needs no lookup at all; an unbound tier DOES draw — its honest marker.
 */
export function dashboardRowRenders(
    record: Row,
    manifestFor: ManifestLookup | undefined,
    registry: WidgetRegistry,
): boolean {
    const row = record as Partial<DashboardRow>;
    // A welcome row draws exactly when it carries its panel — checked BEFORE the resource test,
    // because it has no resource and that test would otherwise wave it through as "not ours".
    if (row.context === 'welcome') return typeof row.welcome === 'object' && row.welcome !== null;
    if (typeof row.context !== 'string' || typeof row.resource !== 'string') return true;
    if (row.context === 'nav') return true;

    const manifest = manifestFor?.(row.resource);
    if (!manifest) return false;

    const resolved = resolveDashboardCard(row as DashboardRow, manifest, registry);
    return resolved.unbound === true || isWidgetComponent(resolved.widget);
}

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
export function DashboardCard({ value, options }: CardWidgetProps<DashboardRow>) {
    const { manifestFor, registry } = useFrameInjection();
    const row = value;
    if (!row || typeof row !== 'object') return null;

    if (row.context === 'nav') {
        return (
            <NavTile
                value={{ label: row.label, icon: row.icon, href: row.href, description: row.description }}
                options={options}
            />
        );
    }

    // The dashboard's only row when it has nothing else for the viewer: no target, no lookup.
    if (row.context === 'welcome') {
        return row.welcome ? <WelcomePanel value={row.welcome} options={options} /> : null;
    }

    const resource = row.resource;
    const manifest = resource ? manifestFor?.(resource) : undefined;
    if (!manifest || !resource) return null;

    const resolved = resolveDashboardCard(row, manifest, registry);
    const cell = (body: ReactNode) => (
        <div data-frame-card="dashboard-card" data-frame-card-resource={resource} data-frame-card-context={row.context}>
            {body}
        </div>
    );

    if (resolved.unbound) {
        return cell(<UnboundWidget kind="unbound" label={row.label} widget={resolved.declared} />);
    }
    if (!isWidgetComponent(resolved.widget)) return null;
    const Widget = resolved.widget;

    const payload: SummaryPayload = row.summary ?? {
        key: resource,
        label: row.label,
        icon: row.icon,
        figures: [],
    };
    const merged: CardWidgetOptions = { ...(options ?? {}), ...(resolved.config ?? {}) };
    const body = <Widget {...widgetMountProps(payload, ROOT_NODE, merged)} row={row} />;

    if (row.context !== 'overview' || resolved.tier !== 'summary') return cell(body);

    return cell(
        <OverviewFrame
            card="overview-frame"
            label={payload.label ?? row.label}
            Icon={merged.iconFor?.(payload.icon ?? row.icon)}
            href={row.href}
            period={payload.overview?.period ?? undefined}
            note={payload.overview?.note ?? undefined}
            headline={payload.overview?.headline ?? undefined}
            options={merged}
        >
            {body}
        </OverviewFrame>,
    );
}
