import type { SchemaNode, WidgetRegistry } from '@schemastud/seam';
import type { ContextManifest } from './contexts';
import { isWidgetComponent, resolveWidgetFor } from './resolveWidgetFor';

/**
 * Does this resource's list render as CARDS (realm-dashboards ticket 03)? True when the root
 * `list-item` entry participates AND resolves a COMPONENT through the registry — a declared
 * widget name the registry knows, or a host-registered `list-item` context default.
 *
 * ⚠️ Participation alone is deliberately NOT the gate, and the reason is measured, not
 * cautious: `splicewire/tower`'s `ThreadData` and `CompositionData` both declare a class-level
 * `#[WidgetIn('list-item')]` with no widget name AND `#[Column]` columns, and both mount as
 * `mounts: 'list'` leaves through the manifest router today. Under a participation gate each
 * would flip from its working table to a grid of `JSON.stringify(record)` — `SchemaView`'s
 * unbound scalar default is the only thing an unbound root can render (`SchemaView.tsx`'s
 * `scalar()`), and a dashboard must never show it for a real record. "Participates but nothing
 * can draw it" therefore keeps the table, byte-identically; the moment a renderer resolves,
 * cards win. The gate asks the same question the card will: can frame draw this row?
 *
 * It lives in its own module rather than in `ListShell` because `recent-list` asks it too —
 * of the TARGET resource, to decide whether to render an item through its own `list-item`
 * binding — and a card importing the shell would close an import cycle.
 */
export function listItemRendersCards(
    manifest: ContextManifest,
    schema: SchemaNode,
    registry: WidgetRegistry,
): boolean {
    const cm = manifest.byNode['']?.['list-item'];
    if (!cm?.participates) return false;
    return isWidgetComponent(resolveWidgetFor(schema, 'list-item', cm, undefined, registry).widget);
}
