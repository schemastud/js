import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { UnboundWidget, createWidgetRegistry, type SchemaNode } from '@schemastud/seam';
import { SchemaView } from '../src/SchemaView';
import { KNOWN_CONTEXTS, type ContextManifest } from '../src/contexts';
import { createFrameContexts } from '../src/contextRegistry';
import { createFrameKit } from '../src/kit';
import { createMemoryTransport } from '../src/testing';

afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
});

/**
 * SchemaView smoke — a participating registered widget mounts read-only; a
 * non-participating field falls to the read-only scalar default.
 */
const EmailBadge = ({ value }: any) => <span data-testid="email-widget">{String(value)}</span>;

const schema: SchemaNode = {
    type: 'object',
    properties: {
        email: { type: 'string' },
        name: { type: 'string' },
    },
};

const record = { email: 'a@b.co', name: 'Ada' };

const manifest: ContextManifest = {
    byNode: {
        email: { detail: { participates: true, widget: 'email-badge' } },
    },
    inherits: {},
    known: ['detail'],
};

describe('SchemaView (detail)', () => {
    it('omits a field that explicitly opts out of detail, label and value both', () => {
        const optOut: ContextManifest = { byNode: { name: { detail: { participates: false } } }, inherits: {}, known: ['detail'] };
        const { container } = render(<SchemaView schema={schema} record={record} manifest={optOut} context="detail" registry={createWidgetRegistry()} />);
        expect(container.querySelectorAll('[data-frame-view="field"]').length).toBe(Object.keys(schema.properties as object).length - 1);
        expect(container.textContent).not.toContain(String((record as Record<string, unknown>).name));
    });


    it('mounts a participating registered widget and defaults a field with no entry', () => {
        const registry = createWidgetRegistry();
        registry.registerWidget('email-badge', EmailBadge);

        render(<SchemaView schema={schema} record={record} manifest={manifest} context="detail" registry={registry} />);

        // Participating + bound → the resolved widget renders read-only.
        expect(screen.getByTestId('email-widget').textContent).toBe('a@b.co');
        // No entry → read-only scalar default carries the value.
        expect(screen.getByText('Ada')).toBeTruthy();
    });
});

// -----------------------------------------------------------------------------
// C03 — labeled structured/scalar fallback + a visible unavailable-field state.
// The read fallback must present a machine-field OBJECT with humanized labels and
// unchanged values (not a single opaque JSON blob), keep the authored source JSON
// recoverable so it round-trips unchanged, and — when a binding names a widget the
// registry cannot resolve — show seam's plain unavailable-field marker, in development and
// production alike, never the raw name (ticket 42).
// -----------------------------------------------------------------------------
describe('SchemaView fallback presentation (C03)', () => {
    const structuredSchema: SchemaNode = {
        type: 'object',
        properties: { profile: { type: 'object' } },
    };
    // A machine-field object sitting on a non-participating node → the read fallback.
    const structuredRecord = { profile: { first_name: 'Ada', retryCount: 3, note: 'KEEP_me' } };
    const structuredManifest: ContextManifest = {
        byNode: {},
        inherits: {},
        known: ['detail'],
    };

    it('shows a machine-field object with humanized labels and unchanged values', () => {
        render(
            <SchemaView
                schema={structuredSchema}
                record={structuredRecord}
                manifest={structuredManifest}
                context="detail"
                registry={createWidgetRegistry()}
            />,
        );

        // Keys gain humanized labels …
        expect(screen.getByText('First name')).toBeTruthy();
        expect(screen.getByText('Retry Count')).toBeTruthy();
        // … while the authored values are carried verbatim, not reshaped.
        expect(screen.getByText('Ada')).toBeTruthy();
        expect(screen.getByText('3')).toBeTruthy();
        expect(screen.getByText('KEEP_me')).toBeTruthy();
    });

    it('keeps the explicit source JSON so it round-trips unchanged', () => {
        const { container } = render(
            <SchemaView
                schema={structuredSchema}
                record={structuredRecord}
                manifest={structuredManifest}
                context="detail"
                registry={createWidgetRegistry()}
            />,
        );

        const json = container.querySelector('[data-frame-view-json]')?.textContent ?? '';
        expect(JSON.parse(json)).toEqual(structuredRecord.profile);
    });

    it('renders a visible unavailable-field state, with diagnostic identity only in a data attribute (no user-visible leak)', () => {
        vi.spyOn(console, 'error').mockImplementation(() => {});
        const { container } = render(<UnboundWidget context="detail" label="Risk score" name="risk-gauge" />);

        // The end user sees a plain unavailable state, never the raw marker.
        expect(screen.getByText('Unable to display this field')).toBeTruthy();
        expect(screen.queryByText(/\[unbound widget:/)).toBeNull();

        // The failed widget identity is retained for devtools on a data attribute …
        expect(
            container.querySelector('[data-frame-unbound="detail"]')?.getAttribute('data-frame-unbound-widget'),
        ).toBe('risk-gauge');
        // … and NOT leaked into any user-visible tooltip or a11y copy.
        expect(container.querySelector('[title]')).toBeNull();
        expect(container.querySelector('[aria-label]')).toBeNull();
        expect(container.innerHTML).not.toContain('unbound widget');
    });

    it('honors a declared schema title for a fallback object key — declared wins over humanized (incl list-item)', () => {
        // The declaration owns the contextual wording: role.title = "Team role" must beat the
        // humanized key "Role"; an undeclared key still humanizes; values + source JSON unchanged.
        const declaredSchema: SchemaNode = {
            type: 'object',
            properties: {
                role: { type: 'string', title: 'Team role' },
                retryCount: { type: 'number' },
            },
        };
        const rec = { role: 'owner', retryCount: 2 };
        const listManifest: ContextManifest = {
            byNode: { '': { 'list-item': { participates: false } } },
            inherits: {},
            known: ['list-item'],
        };

        const { container } = render(
            <SchemaView
                schema={declaredSchema}
                record={rec}
                manifest={listManifest}
                context="list-item"
                registry={createWidgetRegistry()}
            />,
        );

        expect(screen.getByText('Team role')).toBeTruthy();
        expect(screen.queryByText('Role')).toBeNull();
        expect(screen.getByText('Retry Count')).toBeTruthy();
        expect(screen.getByText('owner')).toBeTruthy();
        expect(screen.getByText('2')).toBeTruthy();

        const json = container.querySelector('[data-frame-view-json]')?.textContent ?? '';
        expect(JSON.parse(json)).toEqual(rec);
    });

    it('draws an unbound heavyweight widget as the marker, and never throws (ticket 42)', () => {
        const error = vi.spyOn(console, 'error').mockImplementation(() => {});
        const heavySchema: SchemaNode = { type: 'object', properties: { gauge: { type: 'number' } } };
        const heavyManifest: ContextManifest = {
            byNode: { gauge: { detail: { participates: true, widget: 'risk-gauge', heavyweight: true } } },
            inherits: {},
            known: ['detail'],
        };

        const { container } = render(
            <SchemaView
                schema={heavySchema}
                record={{ gauge: 42 }}
                manifest={heavyManifest}
                context="detail"
                registry={createWidgetRegistry()}
            />,
        );
        expect(container.querySelector('[data-frame-unbound="detail"]')?.getAttribute('data-frame-unbound-widget')).toBe('risk-gauge');
        expect(error.mock.calls.some((call) => String(call[0]).includes('"risk-gauge"'))).toBe(true);
        error.mockRestore();
    });
});

/**
 * frame-foundation 92: a host's record-grain context draws the whole record at pointer "", and an unbound record
 * borrows along the host's edge (`card` ← `list-item`). The context lookup is the MOUNTED KIT's, for both the grain
 * check and the resolver's cascade; a standalone SchemaView (no provider) keeps frame's seven.
 */
describe('SchemaView (a host record context)', () => {
    const HostCard = ({ value }: any) => <span data-testid="host-card">host-card drawn {String(value?.name)}</span>;
    const HostListItem = ({ value }: any) => <span data-testid="host-list-item">host-list-item drawn {String(value?.name)}</span>;
    const registerHostWidgets = (registry: ReturnType<typeof createWidgetRegistry>) => {
        registry.registerWidget('host-card', HostCard as never);
        registry.registerWidget('host-list-item', HostListItem as never);
    };
    const manifestOf = (root: ContextManifest['byNode']['']): ContextManifest => ({
        byNode: { '': root },
        inherits: { card: ['list-item'] },
        known: [...KNOWN_CONTEXTS, 'card'],
    });
    /** A kit whose host registered `card` (record grain, falling back to `list-item`) and the two widgets. */
    const kit = (grain: 'record' | 'none' = 'record') =>
        createFrameKit({
            transport: createMemoryTransport({ manifest: { resources: [], contexts: {} } }),
            urlState: 'memory',
            contexts: (c) => c.register('card', { fallback: ['list-item'], ...(grain === 'record' ? { grain } : {}) }, 'acme/host'),
            widgets: registerHostWidgets,
        });
    const drawIn = (frame: ReturnType<typeof kit>, root: ContextManifest['byNode']['']) =>
        render(
            <frame.Provider>
                <SchemaView schema={schema} record={record} manifest={manifestOf(root)} context="card" />
            </frame.Provider>,
        ).container;

    it('draws the widget a record binds in the host context, whole-record, through the kit', () => {
        const container = drawIn(kit(), {
            card: { participates: true, widget: 'host-card' },
            'list-item': { participates: true, widget: 'host-list-item' },
        });

        expect(container.querySelector('[data-frame-view="card"]')).not.toBeNull();
        expect(screen.getByTestId('host-card').textContent).toBe('host-card drawn Ada');
        expect(screen.queryByTestId('host-list-item')).toBeNull();
        // one root node at pointer "", not the per-property walk
        expect(screen.getAllByTestId('host-card')).toHaveLength(1);
        expect(container.querySelector('[data-frame-view="detail"]')).toBeNull();
    });

    it("draws the list-item widget along the kit's edge when the record binds none in the host context", () => {
        drawIn(kit(), { card: { participates: true }, 'list-item': { participates: true, widget: 'host-list-item' } });

        expect(screen.getByTestId('host-list-item').textContent).toBe('host-list-item drawn Ada');
        expect(screen.queryByTestId('host-card')).toBeNull();
    });

    it('takes the per-property walk for a host context registered with no grain', () => {
        const container = drawIn(kit('none'), { card: { participates: true, widget: 'host-card' } });

        expect(container.querySelector('[data-frame-view="detail"]')).not.toBeNull();
        expect(screen.queryByTestId('host-card')).toBeNull();
    });

    it('a standalone SchemaView (no provider) keeps frame\'s seven: list-item draws whole-record, card is unknown', () => {
        const registry = createWidgetRegistry();
        registerHostWidgets(registry);
        const root = { card: { participates: true, widget: 'host-card' }, 'list-item': { participates: true, widget: 'host-list-item' } };

        render(<SchemaView schema={schema} record={record} manifest={manifestOf(root)} context="list-item" registry={registry} />);
        expect(screen.getByTestId('host-list-item')).toBeTruthy();
        cleanup();

        const { container } = render(<SchemaView schema={schema} record={record} manifest={manifestOf(root)} context="card" registry={registry} />);
        expect(container.querySelector('[data-frame-view="detail"]')).not.toBeNull();
        expect(screen.queryByTestId('host-card')).toBeNull();
    });
});

describe("frame's seven carry PHP's grains, and the grain rules match PHP's", () => {
    it('seeds property, record and collection on the seven', () => {
        const contexts = createFrameContexts();
        expect(Object.fromEntries(KNOWN_CONTEXTS.map((name) => [name, contexts.get(name)?.grain]))).toEqual({
            edit: 'property',
            detail: 'property',
            'list-column': 'property',
            'list-item': 'record',
            'row-cell': 'property',
            summary: 'collection',
            overview: 'collection',
        });
    });

    it('keeps grain on a supersession that names none, and refuses one that changes it', () => {
        expect(createFrameContexts((c) => c.register('list-item', {}, 'host/app')).get('list-item')?.grain).toBe('record');
        expect(() => createFrameContexts((c) => c.register('list-item', { grain: 'property' }, 'host/app'))).toThrow(
            /record-grain; a supersession may not make it property-grain/,
        );
    });

    it('refuses a fallback of another grain, and an unknown grain', () => {
        expect(() => createFrameContexts((c) => c.register('card', { grain: 'record', fallback: ['detail'] }))).toThrow(
            /"card" is record-grain but falls back to "detail", which is property-grain/,
        );
        expect(() => createFrameContexts((c) => c.register('overview', { fallback: ['detail'] }))).toThrow(/collection-grain/);
        expect(() => createFrameContexts((c) => c.register('card', { grain: 'cell' as never }))).toThrow(/a grain is one of/);
    });
});
