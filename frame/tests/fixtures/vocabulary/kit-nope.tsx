import type { WidgetRegistry } from '@schemastud/seam';

/** A kit that scopes a name to a context frame does not know. */
export default function widgets(registry: WidgetRegistry): void {
    registry.registerWidget('lost', 'textarea', undefined, { contexts: ['nope'] });
}
