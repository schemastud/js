import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import type { ColumnDef } from '@tanstack/react-table';

// X shot-review follow-up (b): DataTable's opt-in `stackOnMobile` mode (promoted from beam-accounts' ResponsiveRoster).
// `useIsMobile` binds matchMedia at module load, so the stub is hoisted above the import.
const viewport = vi.hoisted(() => {
    const state = { narrow: true };
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

it('below 768px with stackOnMobile, each row is a card: heading, labelled fields and its actions', () => {
    viewport.narrow = true;
    render(<DataTable columns={columns} data={ROWS} stackOnMobile />);
    expect(document.querySelector('table')).toBeNull();
    const card = screen.getByTestId('stacked-row-a');
    expect(within(card).getByText('Alpha scope').tagName).toBe('STRONG');
    expect(within(card).getByText('Status')).toBeTruthy();
    expect(within(card).getByText('Active')).toBeTruthy();
    expect(within(card).getByRole('button', { name: 'Archive a' })).toBeTruthy();
    expect(screen.getAllByTestId(/^stacked-row-/)).toHaveLength(2);
});

it('at desktop width the same props render the table, unchanged', () => {
    viewport.narrow = false;
    render(<DataTable columns={columns} data={ROWS} stackOnMobile />);
    expect(document.querySelector('table')).not.toBeNull();
    expect(screen.queryAllByTestId(/^stacked-row-/)).toHaveLength(0);
    expect(screen.getAllByRole('row')).toHaveLength(3);
});

it('without stackOnMobile a narrow screen still gets the table (the mode is opt-in)', () => {
    viewport.narrow = true;
    render(<DataTable columns={columns} data={ROWS} />);
    expect(document.querySelector('table')).not.toBeNull();
    expect(screen.queryAllByTestId(/^stacked-row-/)).toHaveLength(0);
});

it('stacked: the empty message shows, and a row click reaches onRowClick with that row', () => {
    viewport.narrow = true;
    const { unmount } = render(<DataTable columns={columns} data={[]} stackOnMobile emptyMessage="No scopes yet." />);
    expect(screen.getByText('No scopes yet.')).toBeTruthy();
    unmount();
    const onRowClick = vi.fn();
    render(<DataTable columns={columns} data={ROWS} stackOnMobile onRowClick={onRowClick} />);
    fireEvent.click(screen.getByTestId('stacked-row-b'));
    expect(onRowClick).toHaveBeenCalledWith(ROWS[1]);
});
