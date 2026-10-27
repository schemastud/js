import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { ColumnDef } from '@tanstack/react-table';
const viewport = vi.hoisted(() => ({ mobile: false }));
vi.mock('../src/use-mobile', () => ({ useIsMobile: () => viewport.mobile }));
import { DataTable } from '../src/DataTable';
afterEach(() => {
    cleanup();
    viewport.mobile = false;
});
type Item = { id: string; name: string; detail: string };
const first = { id: 'shared', name: 'First arm', detail: 'First snapshot' };
const second = { id: 'shared', name: 'Second arm', detail: 'Second snapshot' };
const rows = [first, second];
const columns: ColumnDef<Item, unknown>[] = [
    { accessorKey: 'name', header: 'Name' },
    { accessorKey: 'id', header: 'ID' },
];
it('renders caller-expanded content directly after its row, independently of a matching id', () => {
    const { rerender } = render(
        <DataTable
            columns={columns}
            data={rows}
            expandedRows={new Set([second])}
            renderExpanded={(row) => row.detail}
        />
    );
    const parent = screen.getByText('Second arm').closest('tr')!;
    const detail = screen.getByText('Second snapshot');
    expect(parent.nextElementSibling).toBe(detail.closest('tr'));
    expect(detail.closest('td')?.colSpan).toBe(2);
    expect(screen.queryByText('First snapshot')).toBeNull();
    rerender(
        <DataTable
            columns={columns}
            data={rows}
            expandedRows={new Set([first])}
            renderExpanded={(row) => row.detail}
        />
    );
    expect(screen.queryByText('Second snapshot')).toBeNull();
    expect(screen.getByText('First arm').closest('tr')?.nextElementSibling).toBe(
        screen.getByText('First snapshot').closest('tr')
    );
});

it('places the same caller-expanded content within its stacked mobile card', () => {
    viewport.mobile = true;
    render(
        <DataTable
            columns={columns}
            data={rows}
            stackOnMobile
            expandedRows={new Set([second])}
            renderExpanded={(row) => row.detail}
        />
    );
    expect(screen.getByText('Second snapshot').closest('li')).toBe(
        screen.getByText('Second arm').closest('li')
    );
    expect(screen.queryByText('First snapshot')).toBeNull();
});

it('keeps expansion with the selected object through sorting and client pagination', () => {
    const sortable: ColumnDef<Item, unknown>[] = [
        { accessorKey: 'name', header: 'Name', meta: { sortField: 'name' } },
    ];
    const renderDetail = vi.fn((row: Item) => row.detail);
    const sort = {
        sortableFields: new Set(['name']),
        sort: '-name',
        onSortChange: vi.fn(),
    };
    const { rerender } = render(
        <DataTable
            columns={sortable}
            data={rows}
            clientSort={sort}
            clientPageSize={1}
            expandedRows={new Set([first])}
            renderExpanded={renderDetail}
        />
    );
    expect(screen.getByText('Second arm')).toBeTruthy();
    expect(screen.queryByText('First snapshot')).toBeNull();
    expect(renderDetail).not.toHaveBeenCalled();
    const buttons = screen.getAllByRole('button');
    fireEvent.click(buttons[buttons.length - 1]);
    expect(screen.getByText('First arm').closest('tr')?.nextElementSibling).toBe(
        screen.getByText('First snapshot').closest('tr')
    );
    rerender(
        <DataTable
            columns={sortable}
            data={rows}
            clientSort={sort}
            clientPageSize={1}
            expandedRows={new Set()}
            renderExpanded={renderDetail}
        />
    );
    expect(screen.queryByText('First snapshot')).toBeNull();
});

it('does not add a sub-row when the renderer is absent', () => {
    render(<DataTable columns={columns} data={[first]} expandedRows={new Set([first])} />);
    expect(screen.getAllByRole('row')).toHaveLength(2);
});
