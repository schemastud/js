import { expectTypeOf, it } from 'vitest';
import type { FrameContext, KnownFrameContext } from '../src/contexts';
import type { FrameContextRegistry, KitContexts } from '../src/contextRegistry';
import type { FrameKitOptions } from '../src/kit';

/**
 * frame-foundation 91 (decision 86, ruling item 6): `FrameContext` admits a host context with no cast, while frame's
 * seven stay a closed union of their own (`KnownFrameContext`), so an editor still completes them.
 */

const hostContext: FrameContext = 'kanban'; // no cast
const frameOwn: FrameContext = 'overview';
void hostContext;
void frameOwn;

// @ts-expect-error a host context is not one of frame's seven
const notKnown: KnownFrameContext = 'kanban';
void notKnown;

const contexts: KitContexts = (registry: FrameContextRegistry) => {
    registry.register('kanban', { fallback: ['list-item'] });
    // @ts-expect-error a fallback is a list of contexts, not one
    registry.register('lane', { fallback: 'list-item' });
};
const options: FrameKitOptions = { contexts };
void options;

it('keeps the seven as literals inside an open union', () => {
    expectTypeOf<KnownFrameContext>().toEqualTypeOf<
        'edit' | 'detail' | 'list-column' | 'list-item' | 'row-cell' | 'summary' | 'overview'
    >();
    expectTypeOf<KnownFrameContext>().toMatchTypeOf<FrameContext>();
    expectTypeOf<'kanban'>().toMatchTypeOf<FrameContext>();
    // `string & {}` keeps the literal members from collapsing into plain `string` (which would lose completion).
    expectTypeOf<FrameContext>().not.toEqualTypeOf<string>();
});
