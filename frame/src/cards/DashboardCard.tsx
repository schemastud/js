import type { ComponentType } from 'react';
import type { SchemaNode, WidgetRegistry } from '@schemastud/seam';
import { useFrameInjection } from '../context';
import { INHERITS, type ContextManifest, type FrameContext, type NodeParticipation } from '../contexts';
import { resolveWidgetFor, type ResolvedForContext } from '../resolveWidgetFor';
import { NavTile } from './NavTile';
import type { CardWidgetProps, DashboardRow, SummaryPayload } from './types';

const ROOT_NODE: SchemaNode = { type: 'object' };

const isComponent = (widget: ResolvedForContext['widget']): widget is ComponentType<any> =>
    widget !== undefined && typeof widget !== 'string';

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

/**
 * The fallback chain for a dashboard row against its target's manifest:
 * `overview` (when the row asks for it and the target participates) → `summary` (when the
 * target participates) → the context DEFAULT for the row's own context (the registry's
 * predicate on the stamped `x-frame-context`, for an unbound node).
 *
 * The cascade parent is derived HERE from the manifest (`byNode['']?.[INHERITS[ctx]]`) —
 * `SchemaView` passes `undefined` for every context, so an `overview` resolved through it
 * never cascades; a card is the one surface where `overview ← summary` has to. A tier whose
 * entry names a widget the registry does not know is skipped rather than rendered: the
 * declaration nominated, nothing authorized, and the next tier still answers honestly.
 */
export function resolveDashboardCard(
    row: DashboardRow,
    manifest: ContextManifest,
    registry: WidgetRegistry,
): ResolvedForContext {
    const root = manifest.byNode[''] ?? {};
    const own: Extract<FrameContext, 'summary' | 'overview'> = row.context === 'overview' ? 'overview' : 'summary';
    const chain: Extract<FrameContext, 'summary' | 'overview'>[] = own === 'overview' ? ['overview', 'summary'] : ['summary'];

    for (const ctx of chain) {
        const cm = bindingOf(root, ctx);
        if (!cm) continue;
        const resolved = resolveWidgetFor(ROOT_NODE, ctx, cm, bindingOf(root, INHERITS[ctx]), registry);
        if (isComponent(resolved.widget)) return resolved;
    }

    return resolveWidgetFor(ROOT_NODE, own, { participates: true }, undefined, registry);
}

/**
 * The `list-item` widget a `{realm}-dashboard` row binds. It dispatches on the row's
 * `context` to the TARGET resource's root entry (see {@link resolveDashboardCard}) and mounts
 * the resolved card with the row's `summary` payload; a `'nav'` row draws a {@link NavTile}
 * without any lookup.
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

    const manifest = row.resource ? manifestFor?.(row.resource) : undefined;
    if (!manifest) return null;

    const resolved = resolveDashboardCard(row, manifest, registry);
    if (!isComponent(resolved.widget)) return null;
    const Widget = resolved.widget;

    const payload: SummaryPayload = row.summary ?? {
        key: row.resource,
        label: row.label,
        icon: row.icon,
        figures: [],
    };

    return (
        <div data-frame-card="dashboard-card" data-frame-card-resource={row.resource} data-frame-card-context={row.context}>
            <Widget
                value={payload}
                formData={payload}
                schema={ROOT_NODE}
                readOnly
                disabled
                options={{ ...(options ?? {}), ...(resolved.config ?? {}) }}
                row={row}
            />
        </div>
    );
}
