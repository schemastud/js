/* eslint-disable */
// =============================================================================
// ResourcePicker fixtures — shared by the stories and the tests. NOT part of the
// shipped package: nothing in the `index.ts` graph imports this file, so tsup never
// bundles it.
//
// Record kinds are shaped after the flagship prototype's transcription of tower's
// `ThreadData` / `AgentData` (`#[Column]` list-column participation) and the
// `ThreadFilterData` `x-filter` / `x-sort` vocabulary. Rows are generated, behind a
// transport that really pages, filters and sorts — so "selection survives paging" is
// tested against server paging, never against a client-side slice.
// =============================================================================
import { KNOWN_CONTEXTS, type ContextManifest } from '../contexts';
import type { FilterSchema } from '@schemastud/facets';
import type { FrameTransport, Paginated, Row } from '../types';
import type { ResourceKindOption, ResourceKindSection } from './KindPicker';

// ── stage 1: a catalogue of declared resource kinds ─────────────────────────────

export const PICKER_SECTIONS: ResourceKindSection[] = [
    { key: 'knowledge', label: 'Knowledge', icon: 'book-open' },
    { key: 'threads', label: 'Threads', icon: 'messages-square' },
    { key: 'circuits', label: 'Circuits', icon: 'workflow' },
    { key: 'calendars', label: 'Calendars', icon: 'calendar' },
    { key: 'platform', label: 'Platform', icon: 'server' },
];

const kind = (
    key: string,
    label: string,
    section: string | null,
    facts: ResourceKindOption['facts'],
    extra: Partial<ResourceKindOption> = {},
): ResourceKindOption => ({ key, label, section, facts, ...extra });

export const PICKER_KINDS: ResourceKindOption[] = [
    kind('fragments', 'Fragments', 'knowledge', { framed: true, writable: true, filterable: true }, { detail: 'FragmentData' }),
    kind('silos', 'Silos', 'knowledge', { framed: true, writable: true, filterable: false }, { detail: 'SiloData' }),
    kind('tags', 'Tags', 'knowledge', { framed: false, writable: true, filterable: true }, { detail: 'TagData' }),
    kind('context-scopes', 'Context scopes', 'knowledge', { framed: true, writable: true, filterable: true }, { detail: 'ContextScopeData' }),
    kind('threads', 'Threads', 'threads', { framed: true, writable: true, filterable: true }, { detail: 'ThreadData' }),
    kind('agents', 'Agents', 'threads', { framed: true, writable: true, filterable: true }, { detail: 'AgentData' }),
    kind('messages', 'Messages', 'threads', { framed: false, writable: false, filterable: true }, { detail: 'MessageData', badges: ['read-only'] }),
    kind('circuits', 'Circuits', 'circuits', { framed: true, writable: true, filterable: true }, { detail: 'CircuitData' }),
    kind('circuit-runs', 'Circuit runs', 'circuits', { framed: true, writable: false, filterable: true }, { detail: 'CircuitRunData', badges: ['read-only'] }),
    kind('calendars', 'Calendars', 'calendars', { framed: true, writable: true, filterable: false }, { detail: 'CalendarData' }),
    kind('calendar-events', 'Calendar events', 'calendars', { framed: true, writable: true, filterable: true }, { detail: 'CalendarEventData' }),
    kind('tenants', 'Tenants', 'platform', { framed: true, writable: true, filterable: true }, { detail: 'TenantData' }),
    kind('plans', 'Plans', 'platform', { framed: true, writable: true, filterable: false }, { detail: 'PlanData' }),
    kind('api-tokens', 'API tokens', 'platform', { framed: false, writable: true, filterable: false }, { detail: 'ApiTokenData' }),
    // Unsectioned kinds fall back to their package as a sub-heading (the 29-of-58 tail).
    kind('products', 'Products', null, { framed: true, writable: true, filterable: true }, { group: 'Market', detail: 'ProductData' }),
    kind('orders', 'Orders', null, { framed: true, writable: false, filterable: true }, { group: 'Market', detail: 'OrderData', badges: ['read-only'] }),
    kind('invitations', 'Invitations', null, { framed: true, writable: true, filterable: false }, { group: 'Accounts', detail: 'InvitationData' }),
    kind('members', 'Members', null, { framed: true, writable: true, filterable: true }, { group: 'Accounts', detail: 'MemberData' }),
    kind('scaffold-packs', 'Scaffold packs', null, { framed: true, writable: true, filterable: false }, { group: 'Tower', detail: 'ScaffoldPackData' }),
];

// ── stage 2: record kinds ────────────────────────────────────────────────────────

const AGENTS = ['Atlas', 'Briar', 'Cobalt', 'Delta', 'Ember', 'Fable'];
const STATUSES = ['open', 'waiting', 'closed'] as const;
const TOPICS = [
    'Invoice dispute',
    'Onboarding checklist',
    'Refund request',
    'Shipping delay',
    'API rate limits',
    'Password reset',
    'Plan upgrade',
    'Data export',
    'Webhook retries',
    'Calendar sync',
    'Tax settings',
    'Team invite',
];

/** Deterministic thread rows: `count` of them, newest first by `updatedAt`. */
export function makeThreads(count: number): Row[] {
    const base = Date.UTC(2026, 10, 4, 12, 0, 0);
    return Array.from({ length: count }, (_, i) => {
        const n = i + 1;
        return {
            id: `t-${n}`,
            title: `${TOPICS[i % TOPICS.length]} #${String(n).padStart(4, '0')}`,
            status: STATUSES[i % STATUSES.length],
            agentName: AGENTS[i % AGENTS.length],
            messages: (i * 7) % 41,
            updatedAt: new Date(base - i * 3_600_000 * 5).toISOString(),
        };
    });
}

export const AGENT_ROWS: Row[] = AGENTS.map((name, i) => ({
    id: `a-${i + 1}`,
    name,
    model: ['claude-opus-4', 'claude-sonnet-4', 'claude-haiku-4'][i % 3],
    threads: 120 + i * 37,
}));

export const THREADS_MANIFEST: ContextManifest = {
    byNode: {
        title: { 'list-column': { participates: true, sort: 1, label: 'Title' } },
        status: { 'list-column': { participates: true, sort: 2, label: 'Status', widget: 'badge' } },
        agentName: { 'list-column': { participates: true, sort: 3, label: 'Agent' } },
        messages: { 'list-column': { participates: true, sort: 4, label: 'Messages', widget: 'number' } },
        updatedAt: { 'list-column': { participates: true, sort: 5, label: 'Updated', widget: 'date' } },
    },
    inherits: {},
    known: KNOWN_CONTEXTS,
    singularLabel: 'thread',
};

export const AGENTS_MANIFEST: ContextManifest = {
    byNode: {
        name: { 'list-column': { participates: true, sort: 1, label: 'Name' } },
        model: { 'list-column': { participates: true, sort: 2, label: 'Model' } },
        threads: { 'list-column': { participates: true, sort: 3, label: 'Threads', widget: 'number' } },
    },
    inherits: {},
    known: KNOWN_CONTEXTS,
    singularLabel: 'agent',
};

export const THREADS_FILTER_SCHEMA: FilterSchema = {
    properties: {
        keywords: { title: 'Search', 'x-filter': { name: 'keywords', operator: 'search', control: 'search' } },
        status: {
            title: 'Status',
            'x-filter': {
                name: 'status',
                operator: 'set',
                control: 'multiselect',
                options: STATUSES.map((s) => ({ value: s, label: s[0].toUpperCase() + s.slice(1) })),
            },
        },
        agentName: {
            title: 'Agent',
            'x-filter': {
                name: 'agent',
                operator: 'set',
                control: 'multiselect',
                options: AGENTS.map((a) => ({ value: a, label: a })),
            },
        },
        title: { 'x-sort': { name: 'title' } },
        updatedAt: { title: 'Updated', 'x-sort': { name: 'updatedAt' } },
    },
};

export const AGENTS_FILTER_SCHEMA: FilterSchema = {
    properties: {
        keywords: { title: 'Search', 'x-filter': { name: 'keywords', operator: 'search', control: 'search' } },
        name: { 'x-sort': { name: 'name' } },
    },
};

export const PICKER_MANIFESTS: Record<string, ContextManifest> = {
    threads: THREADS_MANIFEST,
    agents: AGENTS_MANIFEST,
};

/** Apply `filter[...]`, `sort`, `page`, `per_page` the way a served list does. */
export function queryRows(rows: Row[], params: Record<string, string>, labelField: string): Paginated<Row> {
    let out = rows;
    const keywords = params['filter[keywords]']?.toLowerCase();
    if (keywords) out = out.filter((r) => String(r[labelField] ?? '').toLowerCase().includes(keywords));
    const status = params['filter[status]'];
    if (status) {
        const set = new Set(status.split(','));
        out = out.filter((r) => set.has(String(r.status)));
    }
    const agent = params['filter[agent]'];
    if (agent) {
        const set = new Set(agent.split(','));
        out = out.filter((r) => set.has(String(r.agentName)));
    }
    const sort = params.sort;
    if (sort) {
        const desc = sort.startsWith('-');
        const field = sort.replace(/^-/, '').split(',')[0];
        out = [...out].sort((a, b) => {
            const av = String(a[field] ?? '');
            const bv = String(b[field] ?? '');
            return desc ? bv.localeCompare(av) : av.localeCompare(bv);
        });
    }
    const perPage = Number(params.per_page ?? 10) || 10;
    const page = Math.max(1, Number(params.page ?? 1) || 1);
    return { data: out.slice((page - 1) * perPage, page * perPage), total: out.length, page, perPage };
}

export interface PickerTransportOptions {
    threads?: number;
    /** Fail every list request (the retry state). */
    failList?: boolean;
    /** Artificial latency, ms. */
    delay?: number;
}

/** A paging, filtering, sorting in-memory transport over the two record kinds. */
export function createPickerTransport(options: PickerTransportOptions = {}): FrameTransport & {
    calls: { resource: string; params: Record<string, string> }[];
} {
    const data: Record<string, { rows: Row[]; label: string; schema: FilterSchema }> = {
        threads: { rows: makeThreads(options.threads ?? 4812), label: 'title', schema: THREADS_FILTER_SCHEMA },
        agents: { rows: AGENT_ROWS, label: 'name', schema: AGENTS_FILTER_SCHEMA },
    };
    const calls: { resource: string; params: Record<string, string> }[] = [];
    const wait = () => new Promise((r) => setTimeout(r, options.delay ?? 0));
    const json = <T,>(value: T): Promise<T> => Response.json(value).json() as Promise<T>;
    return {
        calls,
        async list(resource, params) {
            calls.push({ resource, params: { ...params } });
            await wait();
            if (options.failList) throw new Error('The list endpoint answered 503.');
            const kind = data[resource];
            if (!kind) return json({ data: [], total: 0, page: 1, perPage: 10 }) as any;
            return json(queryRows(kind.rows, params, kind.label)) as any;
        },
        summary: async () => ({}) as any,
        get: async (resource, id) => data[resource]?.rows.find((r) => String(r.id) === String(id)) ?? {},
        getFormSchema: async () => ({ type: 'object', properties: {} }),
        create: async (_r, d) => ({ id: 'new', ...(d as object) }) as any,
        save: async (_r, id, d) => ({ id, ...(d as Row) }),
        remove: async () => undefined,
        getFilterSchema: async (resource) => data[resource]?.schema ?? { properties: {} },
        getFilterVariants: async (resource) => ({ resource, variants: [] }),
        getFilterOptions: async () => [],
        getSavedFilters: async () => [],
        saveFilter: async (resource, payload) => ({
            id: 's-1',
            name: payload.name,
            resource,
            queryParameters: payload.queryParameters,
            visibility: 'private',
            isDefault: false,
        }),
        deleteSavedFilter: async () => undefined,
    };
}
