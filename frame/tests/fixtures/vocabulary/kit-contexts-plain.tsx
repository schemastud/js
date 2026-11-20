import type { WidgetRegistry } from '@schemastud/seam';
import type { FrameContextRegistry } from '../../../src/contextRegistry';

/** A kit that adds a context with NO fallback: frame's edges are untouched, so the file writes no `inherits`. */
export default function widgets(_registry: WidgetRegistry): void {}

export function contexts(registry: FrameContextRegistry): void {
    registry.register('timeline', {}, 'host/app');
}
