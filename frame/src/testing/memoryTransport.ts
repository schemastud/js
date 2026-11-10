import type { SchemaNode } from '@schemastud/seam';
import { FrameActionError } from '../actions';
import type { FrameTransport, ResourcePage, Row } from '../types';

/**
 * What an in-memory transport serves. Keyed maps are keyed by resource (or action key); the
 * key `'*'` answers for any resource the map does not name.
 */
export interface MemoryTransportFixtures {
    /** Rows `list` pages and `get` finds by id. Default: none. */
    rows?: Record<string, Row[]>;
    /** The form schema `getFormSchema` answers. Default: an object with no properties. */
    formSchema?: Record<string, SchemaNode>;
    /** Force `list` to resolve empty (the ListShell Empty state). */
    empty?: boolean;
    /** Never-resolving reads, so a shell parks on its Loading state (deterministic). */
    loading?: boolean;
    /** Cursor pages `list` answers instead of rows, keyed by the request's `cursor` (empty string is the first page). */
    cursorPages?: Record<string, { data: Row[]; perPage: number; nextCursor: string | null }>;
    /** A declared action's form schema, keyed by action key. Default: an object with no properties. */
    actionSchema?: Record<string, SchemaNode>;
    /** The message an action's `invoke` answers with. Default: "<label> done.". */
    actionMessage?: string;
    /** Make every action's `invoke` fail with this message. */
    actionRefusal?: string;
}

const NEVER = new Promise<never>(() => {});
const EMPTY_OBJECT_SCHEMA = { type: 'object', properties: {} } as SchemaNode;

function lookup<T>(map: Record<string, T> | undefined, key: string): T | undefined {
    return map?.[key] ?? map?.['*'];
}

/**
 * A `FrameTransport` served from memory, for tests and stories: `list` and `get` read `rows`,
 * the schema reads answer from their fixtures, writes echo what they were given, and a missing
 * record rejects with a 404 `FrameActionError`, as a real transport does. `overrides` replaces
 * any method, usually with a spy (`{ get: vi.fn(…) }`).
 *
 * Mount the real kit or `FrameProvider` over it; nothing here talks to a network.
 */
export function createMemoryTransport(
    fixtures: MemoryTransportFixtures = {},
    overrides: Partial<FrameTransport> = {},
): FrameTransport {
    const rowsFor = (resource: string): Row[] => (fixtures.empty ? [] : (lookup(fixtures.rows, resource) ?? []));

    const transport: FrameTransport = {
        list: async <Result,>(resource: string, params: Record<string, string>): Promise<ResourcePage<Result>> => {
            if (fixtures.loading) return NEVER;
            if (fixtures.cursorPages) {
                return fixtures.cursorPages[params.cursor ?? ''] as unknown as ResourcePage<Result>;
            }
            const data = rowsFor(resource);
            return { data, total: data.length, page: 1, perPage: 25 } as unknown as ResourcePage<Result>;
        },
        summary: async () => {
            throw new Error('No summary fixture was configured.');
        },
        get: async (resource, id) => {
            if (fixtures.loading) return NEVER;
            const row = rowsFor(resource).find((r) => String(r.id) === String(id));
            if (!row) throw new FrameActionError(404, { message: `No ${resource} record ${String(id)}.` });
            return row;
        },
        getFormSchema: async (resource) => {
            if (fixtures.loading) return NEVER;
            return lookup(fixtures.formSchema, resource) ?? EMPTY_OBJECT_SCHEMA;
        },
        create: async <Result,>(_resource: string, data: unknown) =>
            ({ id: 'new', ...(data as object) }) as unknown as Result,
        save: async (_resource, id, data) => ({ id, ...(data as Row) }),
        remove: async () => undefined,
        // The facets seam: minimal valid shapes, so the filter bar mounts.
        getFilterSchema: async () => ({ properties: {} }),
        getFilterVariants: async (resource) => ({ resource, variants: [] }),
        getFilterOptions: async () => [],
        getSavedFilters: async () => [],
        saveFilter: async (resource, payload) => ({
            id: 'saved-1',
            name: payload.name,
            resource,
            queryParameters: payload.queryParameters,
            visibility: 'private',
            isDefault: false,
        }),
        deleteSavedFilter: async () => undefined,
        // Declared actions: a form schema per action key, and an invoke that answers with the
        // fixture's message, or refuses when the fixture says so.
        getActionSchema: async (_resource, action) => {
            if (fixtures.loading) return NEVER;
            return lookup(fixtures.actionSchema, action) ?? EMPTY_OBJECT_SCHEMA;
        },
        invoke: async (action) => {
            if (fixtures.actionRefusal) throw new Error(fixtures.actionRefusal);
            return { message: fixtures.actionMessage ?? `${action.label} done.`, data: null };
        },
    };

    return { ...transport, ...overrides };
}
