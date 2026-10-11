import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import type { ColumnDef } from '@tanstack/react-table';

// Phase C headline 2 (build-qa): the DESKTOP table row was mouse-only — `onRowClick` lived on a plain
// `<tr onClick>` with no role/tabIndex/onKeyDown (DataTable.tsx:411-419 at 34b3e160), so non-stackOnMobile
// tables (/circuits, /circuits/:id/runs, /circuits/operations) could not be opened by keyboard. The row now
// exposes a keyboard-reachable Open control named for the row — the SAME accessible naming the stacked C18
// `Open` button uses (aria-labelledby = the Open control + the heading cell) — WITHOUT making the <tr> a
// button that wraps the per-cell action controls.
// `useIsMobile` binds matchMedia at module load, so the stub is hoisted above the import; narrow=false = desktop.
const viewport = vi.hoisted(() => {
    const state = { narrow: false };
    window.matchMedia = ((query: string) => ({
        get matches() {
            return query.includes('max-width') ? state.narrow : false;
        },
        media: query,
        onchange: null,
        addEventListener: () => {},
        removeEventListener: () => {},
        addListener: () => {},
        removeListener: () => {},
        dispatchEvent: () => false,
    })) as unknown as typeof window.matchMedia;
    return state;
});
import { DataTable } from '../src/index';

afterEach(cleanup);

type Row = { id: string; name: string; status: string };
const ROWS: Row[] = [
    { id: 'a', name: 'Alpha scope', status: 'Active' },
    { id: 'b', name: 'Beta scope', status: 'Paused' },
];
const columns: ColumnDef<Row, unknown>[] = [
    { id: 'name', header: 'Name', cell: ({ row }) => <strong>{row.original.name}</strong> },
    { id: 'status', header: 'Status', cell: ({ row }) => row.original.status },
    { id: 'actions', header: '', cell: ({ row }) => <button type="button">Archive {row.original.id}</button> },
];

it('desktop: an onRowClick row exposes a keyboard-reachable Open button named for the row', () => {
    viewport.narrow = false;
    const onRowClick = vi.fn();
    render(<DataTable columns={columns} data={ROWS} onRowClick={onRowClick} />);
    // The table (not the stacked list) is what rendered.
    expect(document.querySelector('table')).not.toBeNull();
    expect(screen.queryAllByTestId(/^stacked-row-/)).toHaveLength(0);

    // Each row has an Open control, accessibly named "Open <heading>" (the same naming the stacked path uses).
    const open = screen.getByRole('button', { name: 'Open Alpha scope' });
    // It is a native, focusable button — Enter/Space activate it with no extra key handling.
    expect(open.tagName).toBe('BUTTON');
    open.focus();
    expect(document.activeElement).toBe(open);

    fireEvent.click(open);
    expect(onRowClick).toHaveBeenCalledTimes(1);
    expect(onRowClick).toHaveBeenCalledWith(ROWS[0]);

    expect(screen.getByRole('button', { name: 'Open Beta scope' })).toBeTruthy();
});

it('desktop: the Open control is a sibling of the row actions, not a wrapper — no wrongly nested interactive elements', () => {
    viewport.narrow = false;
    const onRowClick = vi.fn();
    render(<DataTable columns={columns} data={ROWS} onRowClick={onRowClick} />);

    const open = screen.getByRole('button', { name: 'Open Alpha scope' });
    const archive = screen.getByRole('button', { name: 'Archive a' });
    // Neither interactive control contains the other.
    expect(open.contains(archive)).toBe(false);
    expect(archive.contains(open)).toBe(false);

    // The clicked row is a real <tr>, never re-roled into a single button that would swallow its cell controls.
    const row = open.closest('tr');
    expect(row).not.toBeNull();
    expect(row?.getAttribute('role')).toBeNull();

    // Activating a row action does NOT also open the row.
    fireEvent.click(archive);
    expect(onRowClick).not.toHaveBeenCalled();
});

it('desktop: a table without onRowClick offers no Open button', () => {
    viewport.narrow = false;
    render(<DataTable columns={columns} data={ROWS} />);
    expect(document.querySelector('table')).not.toBeNull();
    expect(screen.queryByRole('button', { name: /^Open / })).toBeNull();
});
