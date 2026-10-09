import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import type { ColumnDef } from '@tanstack/react-table';
import { DataTable } from '../src/index';

afterEach(cleanup);

type Row = { name: string };

/**
 * An `sr-only` header label is `position: absolute`. Absolute boxes are clipped by an `overflow-x: auto` ancestor only
 * when that ancestor (or something inside it) is their containing block; a `position: static` scroller is not, so the
 * label is laid out against an outer ancestor and widens the PAGE instead of scrolling inside the table. Measured in
 * TOWER-05 (beam-accounts' tokens table, 390px viewport): document scrollWidth 587 with a static scroller, 390 once the
 * scroller is `relative`. jsdom has no layout, so this pins the cause structurally: the scroller is a containing block.
 */
const POSITIONED = /(^|\s)(relative|absolute|fixed|sticky)(\s|$)/;

describe('DataTable scroller', () => {
    const columns: ColumnDef<Row, unknown>[] = [
        { id: 'name', header: 'Name', accessorKey: 'name' },
        { id: 'actions', header: () => <span className="sr-only">Actions</span>, cell: () => '…' },
    ];

    it('is the containing block for an sr-only header, so the label scrolls with the table instead of widening the page', () => {
        const { container } = render(<DataTable columns={columns} data={[{ name: 'a-very-long-token-name-that-forces-horizontal-scroll' }]} />);
        const table = container.querySelector('table')!;
        const scroller = table.closest('.overflow-x-auto') as HTMLElement | null;
        expect(scroller, 'the table sits in a horizontal scroller').not.toBeNull();
        expect(scroller!.className).toMatch(POSITIONED);

        // the nearest positioned ancestor of the absolute label is the scroller itself (or something inside it)
        const label = screen.getByText('Actions');
        expect(label.className).toContain('sr-only');
        let block: HTMLElement | null = label.parentElement;
        while (block && !POSITIONED.test(block.className)) block = block.parentElement;
        expect(block, 'some ancestor is a containing block').not.toBeNull();
        expect(scroller!.contains(block!), 'the containing block is inside the scroller, so overflow-x clips the label').toBe(true);
    });
});
