// @vitest-environment jsdom
// X shot-review follow-up (b): frame's generic list table never clips a wide list at 390. Below 768px each record is a
// stacked card carrying the same cells; at desktop width the table scrolls sideways (overflow-x-auto), never hidden.
// `useIsMobile` binds matchMedia at module load, so the stub is hoisted above the import.
import { cleanup, fireEvent, render, within } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';

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
import { ShadcnCell, ShadcnTable } from '../src/shadcn';
import type { Row } from '../src/types';

afterEach(cleanup);

const COLUMNS = [
    { field: 'name', header: 'Name' },
    { field: 'mode', header: 'Mode' },
    { field: 'silos', header: 'Silos' },
];
const ROWS: Row[] = [
    { id: '1', name: 'Alpha scope', mode: 'strict', silos: 'north' },
    { id: '2', name: 'Beta scope', mode: 'open', silos: 'south' },
];
const Archive = ({ record }: { record: Row }) => <button type="button">Archive {String(record.id)}</button>;

it('below 768px every record is a stacked card: heading, labelled fields and its row actions; a card click opens it', () => {
    viewport.narrow = true;
    const onOpen = vi.fn();
    const { container } = render(<ShadcnTable columns={COLUMNS} rows={ROWS} onOpen={onOpen} Cell={ShadcnCell} RowActions={Archive} />);
    expect(container.querySelector('table')).toBeNull();
    const slot = container.querySelector('[data-frame-slot="Table"]');
    expect(slot?.hasAttribute('data-frame-stacked')).toBe(true);
    const cards = container.querySelectorAll('[data-frame-row]');
    expect(cards).toHaveLength(2);
    const first = within(cards[0] as HTMLElement);
    expect(first.getByText('Alpha scope')).toBeTruthy();
    expect(first.getByText('Mode')).toBeTruthy();
    expect(first.getByText('strict')).toBeTruthy();
    expect(first.getByText('Silos')).toBeTruthy();
    // the row actions do not open the record, exactly as in the table's actions cell
    fireEvent.click(first.getByRole('button', { name: 'Archive 1' }));
    expect(onOpen).not.toHaveBeenCalled();
    fireEvent.click(cards[1]);
    expect(onOpen).toHaveBeenCalledWith(ROWS[1]);
});

it('below 768px a card with onOpen has its own labelled Open button, a sibling of the row actions (review-r1 recheck)', () => {
    viewport.narrow = true;
    const onOpen = vi.fn();
    const { container } = render(<ShadcnTable columns={COLUMNS} rows={ROWS} onOpen={onOpen} Cell={ShadcnCell} RowActions={Archive} />);
    const card = within(container.querySelectorAll('[data-frame-row]')[0] as HTMLElement);
    const open = card.getByRole('button', { name: 'Open Alpha scope' });
    const archive = card.getByRole('button', { name: 'Archive 1' });
    expect(open.contains(archive) || archive.contains(open)).toBe(false);
    expect((container.querySelectorAll('[data-frame-row]')[0] as HTMLElement).hasAttribute('tabindex')).toBe(false);
    fireEvent.click(open);
    expect(onOpen).toHaveBeenCalledTimes(1);
    expect(onOpen).toHaveBeenCalledWith(ROWS[0]);
});

it('below 768px a card without onOpen offers no Open button', () => {
    viewport.narrow = true;
    const { container } = render(<ShadcnTable columns={COLUMNS} rows={ROWS} Cell={ShadcnCell} />);
    expect(within(container).queryByRole('button', { name: /^Open / })).toBeNull();
});

it('at desktop width it is the table, and its wrapper scrolls sideways instead of clipping', () => {
    viewport.narrow = false;
    const { container } = render(<ShadcnTable columns={COLUMNS} rows={ROWS} Cell={ShadcnCell} />);
    expect(container.querySelector('table')).not.toBeNull();
    const cls = container.querySelector('[data-frame-slot="Table"]')?.className ?? '';
    expect(cls).toContain('overflow-x-auto');
    expect(cls).not.toMatch(/\boverflow-hidden\b/);
});
