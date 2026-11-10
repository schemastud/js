import type { WidgetRegistry } from '@schemastud/seam';

/** A second kit that binds kit-a's `shared-name` to an RJSF stock name instead of a component. */
export default function widgets(registry: WidgetRegistry): void {
    registry.registerWidget('shared-name', 'textarea');
}
