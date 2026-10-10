import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { createWidgetRegistry, type SchemaNode } from '@schemastud/seam';
import { SchemaView, UnboundWidget } from '../src/SchemaView';
import type { ContextManifest } from '../src/contexts';

afterEach(cleanup);

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
        name: { detail: { participates: false } },
    },
    inherits: {},
    known: ['detail'],
};

describe('SchemaView (detail)', () => {
    it('mounts a participating registered widget and defaults a non-participating field', () => {
        const registry = createWidgetRegistry();
        registry.registerWidget('email-badge', EmailBadge);

        render(<SchemaView schema={schema} record={record} manifest={manifest} context="detail" registry={registry} />);

        // Participating + bound → the resolved widget renders read-only.
        expect(screen.getByTestId('email-widget').textContent).toBe('a@b.co');
        // Non-participating → read-only scalar default carries the value.
        expect(screen.getByText('Ada')).toBeTruthy();
    });
});

// -----------------------------------------------------------------------------
// C03 — labeled structured/scalar fallback + a visible unavailable-field state.
// The read fallback must present a machine-field OBJECT with humanized labels and
// unchanged values (not a single opaque JSON blob), keep the authored source JSON
// recoverable so it round-trips unchanged, and — when a binding names a widget the
// registry cannot resolve — show a plain unavailable-field state in production
// rather than the raw `[unbound widget: …]` marker, while the dev failure stays loud.
// -----------------------------------------------------------------------------
describe('SchemaView fallback presentation (C03)', () => {
    const structuredSchema: SchemaNode = {
        type: 'object',
        properties: { profile: { type: 'object' } },
    };
    // A machine-field object sitting on a non-participating node → the read fallback.
    const structuredRecord = { profile: { first_name: 'Ada', retryCount: 3, note: 'KEEP_me' } };
    const structuredManifest: ContextManifest = {
        byNode: { profile: { detail: { participates: false } } },
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

    it('renders a visible unavailable-field state in production, retaining diagnostic identity', () => {
        // UnboundWidget is the production render path (the dev path throws before reaching it).
        render(<UnboundWidget label="Risk score" widget="risk-gauge" />);

        // The end user sees a plain unavailable state, never the raw marker.
        expect(screen.getByText('Unable to display this field')).toBeTruthy();
        expect(screen.queryByText(/\[unbound widget:/)).toBeNull();

        // The widget that failed to resolve is retained for diagnostics, not shown raw.
        const marker = document.querySelector('[data-frame-view-error]') as HTMLElement;
        expect(marker.getAttribute('title') ?? '').toContain('risk-gauge');
    });

    it('keeps an unbound heavyweight widget a hard, loud error in dev', () => {
        // import.meta.env.DEV is true under vitest, so the heavyweight-unbound wiring error must throw.
        const heavySchema: SchemaNode = { type: 'object', properties: { gauge: { type: 'number' } } };
        const heavyManifest: ContextManifest = {
            byNode: { gauge: { detail: { participates: true, widget: 'risk-gauge', heavyweight: true } } },
            inherits: {},
            known: ['detail'],
        };

        expect(() =>
            render(
                <SchemaView
                    schema={heavySchema}
                    record={{ gauge: 42 }}
                    manifest={heavyManifest}
                    context="detail"
                    registry={createWidgetRegistry()}
                />,
            ),
        ).toThrow(/heavyweight widget .* is unbound/);
    });
});
