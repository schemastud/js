import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { MessageProvider } from '@schemastud/messages/react';
import type { ClientCatalog } from '@schemastud/messages';
import { BigCalendarProvider, BigCalendarSurface, type CalendarClient, type FoundationCalendarEvent } from '../src/index';

// Drive the view engine's documented drop callback; transport and feedback are real public seams.
vi.mock('react-big-calendar/lib/addons/dragAndDrop', () => ({ default: () => function Drop({ onEventDrop, events }: { onEventDrop: (args: {event: FoundationCalendarEvent; start: Date}) => void; events: FoundationCalendarEvent[] }) {
    return <button disabled={!events.length} onClick={() => onEventDrop({ event: events[0], start: new Date(2026, 6, 16) })}>Drop fixture</button>;
} }));
afterEach(cleanup);
it('calendar forwards translated drag feedback and preserves the public undo callback', async () => {
    const start = new Date(2026, 6, 15);
    const event: FoundationCalendarEvent = { id: 'one', ref: 'one', title: 'Own title', start, end: start, allDay: true, sourceId: 'source', laneId: 'lane', colorToken: 'sky', resident: true, meta: {} };
    const reAnchor = vi.fn(async () => {}); const notify = vi.fn();
    const client: CalendarClient = { listEvents: async () => [event], reAnchor, createEvent: vi.fn(), editCell: vi.fn(), materialize: vi.fn(), override: vi.fn() };
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const value: ClientCatalog = { version: 1, locale: 'de-DE', realm: null, direction: 'ltr', messages: {
        'schemastud-big-calendar::messages.moved': { text: 'Verschoben: :title', sourceLocale: 'de' },
        'schemastud-big-calendar::messages.undo': { text: 'Zurück', sourceLocale: 'de' },
    } };
    render(<MessageProvider value={value}><QueryClientProvider client={qc}><BigCalendarProvider services={{client, notify}}><BigCalendarSurface defaultDate={start} /></BigCalendarProvider></QueryClientProvider></MessageProvider>);
    const drop = await screen.findByRole('button', { name: 'Drop fixture' });
    await waitFor(() => expect(drop.hasAttribute('disabled')).toBe(false));
    fireEvent.click(drop);
    await waitFor(() => expect(notify).toHaveBeenCalled());
    expect(notify.mock.calls[0][0].text).toBe('Verschoben: Own title');
    expect(notify.mock.calls[0][0].action.label).toBe('Zurück');
    notify.mock.calls[0][0].action.run();
    expect(reAnchor).toHaveBeenLastCalledWith('one', start);
});
