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

it('stacked: an action in the card footer does not also open the row', () => {
    viewport.narrow = true;
    const onRowClick = vi.fn();
    render(<DataTable columns={columns} data={ROWS} stackOnMobile onRowClick={onRowClick} />);
    fireEvent.click(screen.getByRole('button', { name: 'Archive a' }));
    expect(onRowClick).not.toHaveBeenCalled();
});

it('stacked: a clickable card has its own labelled Open button, a sibling of the row actions', () => {
    viewport.narrow = true;
    const onRowClick = vi.fn();
    render(<DataTable columns={columns} data={ROWS} stackOnMobile onRowClick={onRowClick} />);
    const card = screen.getByTestId('stacked-row-a');
    // A native button named for the row (review-r1 recheck): discoverable by role and name, not a focusable <li>.
    const open = within(card).getByRole('button', { name: 'Open Alpha scope' });
    expect(card.hasAttribute('tabindex')).toBe(false);
    expect(card.getAttribute('role')).toBeNull();
    // It is not inside the independent actions, and they are not inside it.
    const archive = within(card).getByRole('button', { name: 'Archive a' });
    expect(open.contains(archive)).toBe(false);
    expect(archive.contains(open)).toBe(false);
    fireEvent.click(open);
    expect(onRowClick).toHaveBeenCalledTimes(1);
    expect(onRowClick).toHaveBeenCalledWith(ROWS[0]);
});

it('stacked: a card without onRowClick offers no Open button', () => {
    viewport.narrow = true;
    render(<DataTable columns={columns} data={ROWS} stackOnMobile />);
    expect(screen.queryByRole('button', { name: /^Open / })).toBeNull();
    expect(screen.getByTestId('stacked-row-a').hasAttribute('tabindex')).toBe(false);
});

it('stacked: a labelled Sort group whose buttons expose their state as a pressed button and an accessible name', () => {
    viewport.narrow = true;
    const onSortChange = vi.fn();
    const sortable: ColumnDef<Row, unknown>[] = [
        { id: 'name', header: 'Name', meta: { sortField: 'name' }, cell: ({ row }) => row.original.name },
        { id: 'status', header: 'Status', meta: { sortField: 'status' }, cell: ({ row }) => row.original.status },
    ];
    const { rerender } = render(
        <DataTable columns={sortable} data={ROWS} stackOnMobile sorting={{ sortableFields: new Set(['name']), sort: null, onSortChange }} />,
    );
    const group = screen.getByRole('group', { name: 'Sort' });
    // Only a declared x-sort field gets a control, exactly as in the table header.
    expect(within(group).queryByRole('button', { name: /status/i })).toBeNull();
    const name = within(group).getByRole('button', { name: 'Name' });
    expect(name.getAttribute('aria-pressed')).toBe('false');
    expect(name.hasAttribute('aria-sort')).toBe(false);
    fireEvent.click(name);
    expect(onSortChange).toHaveBeenCalledWith('name');
    rerender(
        <DataTable columns={sortable} data={ROWS} stackOnMobile sorting={{ sortableFields: new Set(['name']), sort: 'name', onSortChange }} />,
    );
    // jsdom's name computation puts a space before the comma; a browser joins the inline text as 'Name, sorted ascending'.
    const active = within(screen.getByRole('group', { name: 'Sort' })).getByRole('button', { name: /^Name\s*, sorted ascending$/ });
    expect(active.getAttribute('aria-pressed')).toBe('true');
});

it('desktop: the sort state stays on the column header (aria-sort on the th, not the button)', () => {
    viewport.narrow = false;
    const sortable: ColumnDef<Row, unknown>[] = [
        { id: 'name', header: 'Name', meta: { sortField: 'name' }, cell: ({ row }) => row.original.name },
    ];
    render(<DataTable columns={sortable} data={ROWS} stackOnMobile sorting={{ sortableFields: new Set(['name']), sort: '-name', onSortChange: vi.fn() }} />);
    const header = screen.getByRole('columnheader', { name: /name/i });
    expect(header.getAttribute('aria-sort')).toBe('descending');
    expect(within(header).getByRole('button').hasAttribute('aria-sort')).toBe(false);
});

// orch-peer 19:53Z (combined replay): a column whose header is a component labels its stacked field from meta.label
// (Beam's team roster: id 'role', meta.label 'Team role'), before falling back to a string header, then the column id.
it('stacked: a field label resolves meta.label, then a string header, then the column id', () => {
    viewport.narrow = true;
    const labelled: ColumnDef<Row, unknown>[] = [
        { id: 'name', header: 'Name', cell: ({ row }) => row.original.name },
        { id: 'role', header: () => <span>Role</span>, meta: { label: 'Team role' }, cell: () => 'Owner' },
        { id: 'status', header: 'Status', cell: ({ row }) => row.original.status },
        { id: 'tier', header: () => <span>Tier</span>, cell: () => 'Gold' },
    ];
    render(<DataTable columns={labelled} data={ROWS} stackOnMobile />);
    const card = within(screen.getByTestId('stacked-row-a'));
    expect(card.getByText('Team role').tagName).toBe('DT');
    expect(card.queryByText('role')).toBeNull();
    expect(card.getByText('Status').tagName).toBe('DT');
    expect(card.getByText('tier').tagName).toBe('DT');
});
