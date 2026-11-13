import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { useCalendarLocalizer } from '../src/Calendar';

const probe = vi.hoisted(() => ({ calls: 0, release: undefined as (() => void) | undefined }));
vi.mock('date-fns/locale', async (original) => {
    probe.calls++;
    await new Promise<void>(resolve => { probe.release = resolve; });
    return original();
});
afterEach(cleanup);
function Dates({ locale }: { locale: string }) {
    const localizer = useCalendarLocalizer(locale);
    return <span>{localizer.format(new Date(2026, 6, 15), 'MMMM yyyy', locale)}</span>;
}
it('English control: English dates do not load the non-English locale chunk', async () => {
    render(<Dates locale="en-US" />);
    expect(screen.getByText('July 2026')).toBeDefined();
    expect(probe.calls).toBe(0);
});
it('non-English dates load lazily with an English fallback and reuse the chunk', async () => {
    const view = render(<Dates locale="de-DE" />);
    const node = screen.getByText('July 2026');
    await waitFor(() => expect(probe.calls).toBe(1));
    probe.release!();
    await waitFor(() => expect(screen.getByText('Juli 2026')).toBe(node));
    view.rerender(<Dates locale="fr" />);
    await waitFor(() => expect(screen.getByText('juillet 2026')).toBe(node));
    expect(probe.calls).toBe(1);
    view.rerender(<Dates locale="zz" />);
    await waitFor(() => expect(screen.getByText('July 2026')).toBe(node));
    view.rerender(<Dates locale="en-US" />);
    expect(screen.getByText('July 2026')).toBe(node);
});
