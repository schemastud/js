import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import type { ColumnDef } from '@tanstack/react-table';
import {
    Badge,
    Button,
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    DataTable,
    Input,
    Switch,
    cn,
    parseSort,
    serializeSort,
} from '../src/index';

/**
 * The isolation bar (rehome-components §8a): the primitives render off a plain fixture
 * with NO Laravel, NO app context, NO `@/` — proving they are portable foundation code.
 * If any primitive had smuggled an app coupling, importing `../src/index` here would fail
 * to resolve and this file would not even load.
 */

interface Row {
    id: string;
    name: string;
    createdAt: string;
}

const fixture: Row[] = [
    { id: '1', name: 'ci-deploy', createdAt: '2026-01-02' },
    { id: '2', name: 'local-dev', createdAt: '2026-01-01' },
];

const columns: ColumnDef<Row, unknown>[] = [
    { accessorKey: 'name', header: 'Name', cell: (c) => c.getValue<string>(), meta: { sortField: 'name' } },
    { accessorKey: 'createdAt', header: 'Created', cell: (c) => c.getValue<string>() },
];

describe('@schemastud/ui primitives mount in isolation', () => {
    it('DataTable renders rows off a plain fixture (no backend)', () => {
        render(<DataTable columns={columns} data={fixture} />);
        expect(screen.getByText('ci-deploy')).toBeDefined();
        expect(screen.getByText('local-dev')).toBeDefined();
    });

    it('DataTable emits the shared sort vocabulary through a header click', () => {
        const onSortChange = vi.fn();
        render(
            <DataTable
                columns={columns}
                data={fixture}
                clientSort={{ sortableFields: new Set(['name']), sort: null, onSortChange }}
            />,
        );
        fireEvent.click(screen.getByRole('button', { name: /name/i }));
        expect(onSortChange).toHaveBeenCalledWith('name'); // serializeSort([{field:'name',desc:false}])
    });

    it('shadcn primitives render with host-owned token classes, no hard-coded colors', () => {
        render(
            <div>
                <Button>Save</Button>
                <Badge variant="secondary">api</Badge>
                <Input placeholder="name" />
            </div>,
        );
        expect(screen.getByRole('button', { name: 'Save' }).className).toContain('bg-primary');
        expect(screen.getByText('api').className).toContain('bg-secondary');
        expect(screen.getByPlaceholderText('name')).toBeDefined();
    });

    it('Switch + Card render off host-owned tokens (portable, no @/ coupling)', () => {
        render(
            <Card>
                <CardHeader>
                    <CardTitle>System</CardTitle>
                </CardHeader>
                <CardContent>
                    <Switch aria-label="enabled" defaultChecked />
                </CardContent>
            </Card>,
        );
        expect(screen.getByText('System').className).toContain('font-semibold');
        expect(screen.getByRole('switch', { name: 'enabled' })).toBeDefined();
    });

    it('cn + sort vocabulary are pure and exported', () => {
        expect(cn('a', false && 'b', 'c')).toBe('a c');
        expect(serializeSort(parseSort('-createdAt,name'))).toBe('-createdAt,name');
    });
});
