import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeAll, expect, it, vi } from 'vitest';
import { MessageProvider } from '@schemastud/messages/react';
import type { ClientCatalog } from '@schemastud/messages';
import { BigCalendarProvider, BigCalendarSurface, reAnchorEvent, type CalendarClient, type FoundationCalendarEvent } from '../src/index';

afterEach(cleanup);
beforeAll(() => {
    if (!('ResizeObserver' in globalThis)) globalThis.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} };
});
const date = new Date(2026, 6, 15);
const event: FoundationCalendarEvent = { id: 'one', ref: 'one', title: 'Own title', start: date, end: date, allDay: true, sourceId: 'source', laneId: 'lane', colorToken: 'sky', resident: true, meta: {} };
const client: CalendarClient = {
    listEvents: async () => [event], reAnchor: async () => {}, createEvent: vi.fn(), editCell: vi.fn(), materialize: vi.fn(), override: vi.fn(),
};
const services = { client };
const value = (locale: string, today: string): ClientCatalog => ({ version: 1, locale, realm: null, direction: 'ltr', messages: {
    'schemastud-big-calendar::messages.toolbar.today': { text: today, sourceLocale: locale },
    'schemastud-big-calendar::messages.event_detail': { text: 'Eintrag', sourceLocale: locale },
    'schemastud-big-calendar::messages.close': { text: 'Schließen', sourceLocale: locale },
} });
function tree(catalog?: ClientCatalog, qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })) {
    const surface = <QueryClientProvider client={qc}><BigCalendarProvider services={services}><BigCalendarSurface defaultDate={date} /></BigCalendarProvider></QueryClientProvider>;
    return catalog ? <MessageProvider value={catalog}>{surface}</MessageProvider> : surface;
}
it('calendar keeps provider-free toolbar dates event titles and pure feedback English', async () => {
    render(tree());
    await waitFor(() => expect(screen.getByRole('button', { name: 'Today' })).toBeDefined());
    expect(screen.getByText('July 2026')).toBeDefined();
    fireEvent.click(await screen.findByText('Own title'));
    expect(screen.getByRole('dialog', { name: 'Event detail' })).toBeDefined();
    expect(screen.getByRole('button', { name: 'Close' })).toBeDefined();
    const notify = vi.fn();
    await reAnchorEvent({ client, notify }, event, new Date(2026, 6, 16));
    expect(notify.mock.calls[0][0].text).toBe('Moved “Own title”.');
    expect(notify.mock.calls[0][0].action.label).toBe('Undo');
});
it('calendar toolbar dates and panel follow provider changes without remounting', async () => {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const view = render(tree(value('de-DE', 'Heute'), qc));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Heute' })).toBeDefined());
    expect(screen.getByText('Juli 2026')).toBeDefined();
    fireEvent.click(await screen.findByText('Own title'));
    const panel = screen.getByRole('dialog', { name: 'Eintrag' });
    const grid = screen.getByRole('table');
    const eventNode = within(grid).getByText('Own title');
    const panelTitle = within(panel).getByText('Own title');
    expect(screen.getAllByText('Own title')).toHaveLength(2);
    expect(screen.getByRole('button', { name: 'Schließen' })).toBeDefined();
    view.rerender(tree(value('fr', "Aujourd’hui"), qc));
    expect(screen.getByRole('button', { name: 'Aujourd’hui' })).toBeDefined();
    expect(screen.getByText('juillet 2026')).toBeDefined();
    expect(screen.getByRole('dialog', { name: 'Eintrag' })).toBe(panel);
    expect(screen.getByRole('table')).toBe(grid);
    expect(within(grid).getByText('Own title')).toBe(eventNode);
    expect(within(panel).getByText('Own title')).toBe(panelTitle);
    expect(screen.getAllByText('Own title')).toHaveLength(2);
});
