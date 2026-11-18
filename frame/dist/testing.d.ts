import { SchemaNode } from '@schemastud/seam';
import { g as Row, h as FrameManifest, i as FrameTransport } from './types-CZdx1s-c.js';
export { c as createMemoryUrlState } from './memoryUrlState-nl0PO9Wm.js';
import '@schemastud/facets';
import 'react';
import '@rjsf/utils';
import '@schemastud/ui';

/**
 * What an in-memory transport serves. Keyed maps are keyed by resource (or action key); the
 * key `'*'` answers for any resource the map does not name.
 */
interface MemoryTransportFixtures {
    /** Rows `list` pages and `get` finds by id. Default: none. */
    rows?: Record<string, Row[]>;
    /** The form schema `getFormSchema` answers. Default: an object with no properties. */
    formSchema?: Record<string, SchemaNode>;
    /** Force `list` to resolve empty (the ListShell Empty state). */
    empty?: boolean;
    /** Never-resolving reads, so a shell parks on its Loading state (deterministic). */
    loading?: boolean;
    /** Cursor pages `list` answers instead of rows, keyed by the request's `cursor` (empty string is the first page). */
    cursorPages?: Record<string, {
        data: Row[];
        perPage: number;
        nextCursor: string | null;
    }>;
    /** A declared action's form schema, keyed by action key. Default: an object with no properties. */
    actionSchema?: Record<string, SchemaNode>;
    /** The message an action's `invoke` answers with. Default: "<label> done.". */
    actionMessage?: string;
    /** Make every action's `invoke` fail with this message. */
    actionRefusal?: string;
    /** The manifest `getManifest` answers. Default: no resources and no contexts. */
    manifest?: FrameManifest;
}
/**
 * A `FrameTransport` served from memory, for tests and stories: `list` and `get` read `rows`,
 * the schema reads answer from their fixtures, writes echo what they were given, and a missing
 * record rejects with a 404 `FrameActionError`, as a real transport does. `overrides` replaces
 * any method, usually with a spy (`{ get: vi.fn(…) }`).
 *
 * Mount the real kit or `FrameProvider` over it; nothing here talks to a network.
 */
declare function createMemoryTransport(fixtures?: MemoryTransportFixtures, overrides?: Partial<FrameTransport>): FrameTransport;

export { type MemoryTransportFixtures, createMemoryTransport };
