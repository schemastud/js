import { cleanup, render, waitFor } from '@testing-library/react';
import type { WidgetProps } from '@rjsf/utils';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { WidgetRegistry } from '@schemastud/seam';
import type { CardLinkRenderer } from '../src/cards';
import { KNOWN_CONTEXTS, type ContextManifest } from '../src/contexts';
import { createFrameKit } from '../src/kit';
import { ListShell } from '../src/ListShell';
import { createMemoryTransport } from '../src/testing';

afterEach(cleanup);

// Radix measures itself; jsdom has no ResizeObserver.
globalThis.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
} as unknown as typeof ResizeObserver;

const manifestOf = (byNode: ContextManifest['byNode']) => ({
    resources: [],
    contexts: { figures: { byNode, inherits: {}, known: KNOWN_CONTEXTS } as ContextManifest },
});

/** A `link` column over `name`, its href read from the row's `href` field. */
const LINK = { name: { 'list-column': { participates: true, sort: 1, widget: 'link', options: { hrefKey: 'href', weight: 'medium' } } } };
/** The same column declared as `text`, the rendering a link's text must match. */
const TEXT = { name: { 'list-column': { participates: true, sort: 1, widget: 'text', options: { weight: 'medium' } } } };

/** A kit's list over one row, with the columns its manifest declares. */
async function list(
    row: Record<string, unknown>,
    byNode: ContextManifest['byNode'],
    kit: { renderLink?: CardLinkRenderer; widgets?: (registry: WidgetRegistry) => void } = {},
) {
    const frame = createFrameKit({
        transport: createMemoryTransport({ rows: { figures: [{ id: '1', ...row }] }, manifest: manifestOf(byNode) }),
        urlState: 'memory',
        ...kit,
    });
    render(
        <frame.Provider>
            <ListShell resource="figures" />
        </frame.Provider>,
    );
    await waitFor(() => expect(document.querySelector('tbody tr')).not.toBeNull());
    // The declared column drew (not the default cell, which carries no frame cell marker).
    await waitFor(() => expect(document.querySelector('tbody [data-frame-cell], tbody [data-host]')).not.toBeNull());
    return document.querySelector('tbody td')!;
}

/** A router link that marks its element, so a test sees which path drew the anchor. */
const routerLink = () =>
    vi.fn<CardLinkRenderer>(({ href, children, className }) => (
        <a data-router-link href={href} className={className}>
            {children}
        </a>
    ));

/** What the same value draws as a plain `text` column (the comparison the null/absent/empty cases make). */
async function textCellHtml(row: Record<string, unknown>): Promise<string> {
    const td = await list(row, TEXT);
    const html = td.innerHTML;
    cleanup();
    return html;
}

/**
 * frame-foundation 77: a `link` list-column kind draws the column's own value, exactly as `text`, linked to the href
 * a ROW field carries. The row reaches every kind through the cell registry's `formContext`.
 */
describe('the `link` column kind', () => {
    it("a site-relative href draws through the kit's renderLink, the router link the cards use", async () => {
        const renderLink = routerLink();
        const td = await list({ name: 'Weekly visitors', href: '/analytics/figures/1' }, LINK, { renderLink });

        const anchor = td.querySelector('a[data-router-link]');
        expect(anchor?.getAttribute('href')).toBe('/analytics/figures/1');
        expect(renderLink).toHaveBeenCalledWith(expect.objectContaining({ href: '/analytics/figures/1' }));
        // The link's text is the `text` kind's rendering of the column's own value.
        expect(anchor?.querySelector('[data-frame-cell="text"]')?.textContent).toBe('Weekly visitors');
        // The injected renderer owns its element: frame stamps no marker on it.
        expect(anchor?.hasAttribute('data-frame-cell')).toBe(false);
    });

    it('a site-relative href with no renderLink draws a plain anchor', async () => {
        const td = await list({ name: 'Weekly visitors', href: '/analytics/figures/1' }, LINK);

        const anchor = td.querySelector('a[data-frame-cell="link"]');
        expect(anchor?.getAttribute('href')).toBe('/analytics/figures/1');
        expect(anchor?.textContent).toBe('Weekly visitors');
    });

    it.each([['https://example.com/report'], ['//example.com/report']])(
        'an absolute href (%s) draws a plain anchor, never the router link',
        async (href) => {
            const renderLink = routerLink();
            const td = await list({ name: 'Weekly visitors', href }, LINK, { renderLink });

            expect(renderLink).not.toHaveBeenCalled();
            expect(td.querySelector('a[data-router-link]')).toBeNull();
            const anchor = td.querySelector('a[data-frame-cell="link"]');
            expect(anchor?.getAttribute('href')).toBe(href);
            expect(anchor?.querySelector('[data-frame-cell="text"]')?.textContent).toBe('Weekly visitors');
        },
    );

    it.each([
        ['null', { href: null }],
        ['absent', {}],
        ['empty', { href: '' }],
    ])('a %s href renders exactly as `text`: no link, no styling difference', async (_case, extra) => {
        const expected = await textCellHtml({ name: 'Weekly visitors', ...extra });
        const renderLink = routerLink();
        const td = await list({ name: 'Weekly visitors', ...extra }, LINK, { renderLink });

        expect(td.querySelector('a')).toBeNull();
        expect(renderLink).not.toHaveBeenCalled();
        expect(td.querySelector('[data-frame-cell="text"]')?.textContent).toBe('Weekly visitors');
        expect(td.innerHTML).toBe(expected);
    });

    it("a host-registered list-column `link` still replaces frame's, and reads the row as every kind can", async () => {
        const HostLink = ({ value, registry }: WidgetProps) => (
            <span data-host="link">{`${String(value)} -> ${String((registry.formContext.row as Record<string, unknown>).href)}`}</span>
        );
        const renderLink = routerLink();
        const td = await list({ name: 'Weekly visitors', href: '/analytics/figures/1' }, LINK, {
            renderLink,
            widgets: (registry) => registry.registerWidget('link', HostLink as never, undefined, { contexts: ['list-column'] }),
        });

        expect(td.querySelector('[data-host="link"]')?.textContent).toBe('Weekly visitors -> /analytics/figures/1');
        expect(td.querySelector('[data-frame-cell="link"], a[data-router-link]')).toBeNull();
        expect(renderLink).not.toHaveBeenCalled();
    });
});
