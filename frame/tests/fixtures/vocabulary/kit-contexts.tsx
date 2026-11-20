import type { WidgetRegistry } from '@schemastud/seam';
import type { FrameContextRegistry } from '../../../src/contextRegistry';

/** A host kit with its own context (frame-foundation 91): a lane widget scoped to `kanban`, which borrows `list-item`. */
const Lane = () => <span>lane</span>;

export default function widgets(registry: WidgetRegistry): void {
    registry.registerWidget('kanban-lane', Lane as never, undefined, { contexts: ['kanban'] });
}

export function contexts(registry: FrameContextRegistry): void {
    registry.register('kanban', { fallback: ['list-item'], reserved: [] }, 'host/app');
}
