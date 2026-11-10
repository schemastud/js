import type { WidgetRegistry } from '@schemastud/seam';

/** A host kit's own name: a component, registered by name for every context. */
const HostRating = () => <span>rating</span>;

export default function widgets(registry: WidgetRegistry): void {
    registry.registerWidget('host-rating', HostRating as never);
    registry.registerWidget('shared-name', HostRating as never);
}
