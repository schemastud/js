import type { WidgetRegistry } from '@schemastud/seam';
import type { FrameContextRegistry } from '../../../src/contextRegistry';

/** A second kit that registers `kanban` with a DIFFERENT fallback than kit-contexts.tsx: the two cannot share a file. */
export default function widgets(_registry: WidgetRegistry): void {}

export function contexts(registry: FrameContextRegistry): void {
    registry.register('kanban', { fallback: ['detail'] }, 'host/other');
}
