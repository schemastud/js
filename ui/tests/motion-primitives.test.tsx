import * as React from 'react';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
    ChangedCell,
    DataTable,
    DetailSwap,
    Dialog,
    DialogContent,
    DialogTitle,
    MotionRow,
    Popover,
    PopoverContent,
    PopoverTrigger,
    SaveButton,
    Sheet,
    SheetContent,
    SheetTitle,
    SidePanel,
    useFlip,
} from '../src/index';

afterEach(cleanup);

function mockReducedMotion(reduce: boolean) {
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
        matches: reduce && query.includes('prefers-reduced-motion'),
        media: query,
        addEventListener: () => {},
        removeEventListener: () => {},
        addListener: () => {},
        removeListener: () => {},
        onchange: null,
        dispatchEvent: () => false,
    }));
}

beforeEach(() => mockReducedMotion(false));

/** jsdom has no AnimationEvent, so `animationName` is set on a plain bubbling event. */
function animationEnd(el: Element, animationName: string) {
    const event = new Event('animationend', { bubbles: true });
    Object.defineProperty(event, 'animationName', { value: animationName });
    act(() => {
        el.dispatchEvent(event);
    });
}

describe('A2 · overlay hooks', () => {
    it('Sheet, Dialog and SidePanel carry the data-slot / data-side hooks motion.css keys on', () => {
        render(
            <>
                <Sheet open>
                    <SheetContent side="left">
                        <SheetTitle>Sheet</SheetTitle>
                    </SheetContent>
                </Sheet>
                <Dialog open>
                    <DialogContent>
                        <DialogTitle>Dialog</DialogTitle>
                    </DialogContent>
                </Dialog>
                <SidePanel open onOpenChange={() => {}} title="Panel">
                    body
                </SidePanel>
            </>,
        );
        const sheet = document.querySelector('[data-slot="sheet-content"]');
        expect(sheet?.getAttribute('data-side')).toBe('left');
        expect(document.querySelector('[data-slot="sheet-overlay"]')).not.toBeNull();
        expect(document.querySelector('[data-slot="dialog-content"]')).not.toBeNull();
        expect(document.querySelector('[data-slot="dialog-overlay"]')).not.toBeNull();
        const panel = document.querySelector('[data-slot="side-panel-content"]');
        expect(panel?.getAttribute('data-side')).toBe('right');
    });
});

describe('A2 · Popover exit', () => {
    function Harness() {
        return (
            <Popover>
                <PopoverTrigger asChild>
                    <button type="button">Filters</button>
                </PopoverTrigger>
                <PopoverContent side="top" align="end">
                    panel
                </PopoverContent>
            </Popover>
        );
    }

    it('opens with data-state=open and its side, then stays mounted as data-state=closed until its exit ends', () => {
        render(<Harness />);
        fireEvent.click(screen.getByText('Filters'));
        const panel = screen.getByRole('dialog');
        expect(panel.getAttribute('data-slot')).toBe('popover-content');
        expect(panel.getAttribute('data-state')).toBe('open');
        expect(panel.getAttribute('data-side')).toBe('top');

        fireEvent.click(screen.getByText('Filters'));
        const closing = screen.getByRole('dialog', { hidden: true });
        expect(closing.getAttribute('data-state')).toBe('closed');
        // A closing panel never catches the pointer.
        expect(closing.className).toContain('data-[state=closed]:pointer-events-none');

        fireEvent.animationEnd(closing);
        expect(screen.queryByRole('dialog', { hidden: true })).toBeNull();
    });

    it('unmounts on a fallback timer when no exit animation runs (a host without tw-animate)', () => {
        vi.useFakeTimers();
        try {
            render(<Harness />);
            fireEvent.click(screen.getByText('Filters'));
            fireEvent.click(screen.getByText('Filters'));
            expect(screen.queryByRole('dialog', { hidden: true })).not.toBeNull();
            act(() => {
                vi.advanceTimersByTime(400);
            });
            expect(screen.queryByRole('dialog', { hidden: true })).toBeNull();
        } finally {
            vi.useRealTimers();
        }
    });

    it('a child animation ending does not unmount the closing panel', () => {
        render(
            <Popover>
                <PopoverTrigger asChild>
                    <button type="button">Filters</button>
                </PopoverTrigger>
                <PopoverContent>
                    <span data-testid="child">child</span>
                </PopoverContent>
            </Popover>,
        );
        fireEvent.click(screen.getByText('Filters'));
        fireEvent.click(screen.getByText('Filters'));
        fireEvent.animationEnd(screen.getByTestId('child'));
        expect(screen.queryByRole('dialog', { hidden: true })).not.toBeNull();
    });
});

describe('B1 · SaveButton', () => {
    it('holds both labels in one grid cell and names itself by the active one', () => {
        const { rerender } = render(<SaveButton saving={false} />);
        const button = screen.getByRole('button', { name: 'Save' });
        const faces = button.querySelectorAll('.motion-face');
        expect(faces).toHaveLength(2);
        expect(button.querySelector('.motion-faces')).not.toBeNull();
        expect(faces[0].getAttribute('data-on')).toBe('true');
        expect(faces[1].getAttribute('aria-hidden')).toBe('true');
        expect(button.hasAttribute('disabled')).toBe(false);

        rerender(<SaveButton saving />);
        const saving = screen.getByRole('button', { name: 'Saving…' });
        // Unavailable is aria-disabled, never native disabled, so the focus it holds survives (P2-a11y).
        expect(saving.hasAttribute('disabled')).toBe(false);
        expect(saving.getAttribute('aria-disabled')).toBe('true');
        expect(saving.getAttribute('aria-busy')).toBe('true');
        expect(saving.querySelectorAll('.motion-face')[1].getAttribute('data-on')).toBe('true');
    });

    it('takes its own labels and stays unavailable (aria-disabled) when the caller disables it', () => {
        render(<SaveButton saving={false} label="Save subscription" disabled />);
        expect(screen.getByRole('button', { name: 'Save subscription' }).getAttribute('aria-disabled')).toBe('true');
    });
});

describe('C1 / C2 · DetailSwap', () => {
    it('does not animate its first content, then re-keys with the motion class on each swap', () => {
        const { rerender } = render(
            <DetailSwap swapKey="a" motion="soft-cut" data-testid="detail">
                A
            </DetailSwap>,
        );
        const first = screen.getByTestId('detail');
        expect(first.className).not.toContain('motion-soft-cut');

        rerender(
            <DetailSwap swapKey="b" motion="soft-cut" data-testid="detail">
                B
            </DetailSwap>,
        );
        const second = screen.getByTestId('detail');
        expect(second).not.toBe(first);
        expect(second.className).toContain('motion-soft-cut');

        rerender(
            <DetailSwap swapKey="c" motion="push" data-testid="detail">
                C
            </DetailSwap>,
        );
        expect(screen.getByTestId('detail').className).toContain('motion-push');

        // Back to the first key still animates: only the very first render is still.
        rerender(
            <DetailSwap swapKey="a" motion="back" data-testid="detail">
                A
            </DetailSwap>,
        );
        expect(screen.getByTestId('detail').className).toContain('motion-back');
    });

    it('keeps the element (and its state) when the key does not change', () => {
        const { rerender } = render(
            <DetailSwap swapKey="a" motion="back" data-testid="detail">
                A
            </DetailSwap>,
        );
        const first = screen.getByTestId('detail');
        rerender(
            <DetailSwap swapKey="a" motion="back" data-testid="detail">
                A again
            </DetailSwap>,
        );
        expect(screen.getByTestId('detail')).toBe(first);
    });
});

describe('D3 · ChangedCell', () => {
    it('rolls only when its value changes after mount', () => {
        const { container, rerender } = render(<ChangedCell value="queued">queued</ChangedCell>);
        expect(container.querySelector('.motion-cell-roll')).toBeNull();
        rerender(<ChangedCell value="queued">queued</ChangedCell>);
        expect(container.querySelector('.motion-cell-roll')).toBeNull();
        rerender(<ChangedCell value="complete">complete</ChangedCell>);
        expect(container.querySelector('.motion-cell-roll')?.textContent).toBe('complete');
    });
});

describe('D2 · MotionRow', () => {
    it('opens on mount when asked, and settles once its open animation ends', () => {
        const { container } = render(
            <MotionRow appear>
                <div>row</div>
            </MotionRow>,
        );
        const row = container.querySelector('.motion-row') as HTMLElement;
        expect(row.getAttribute('data-motion')).toBe('open');
        animationEnd(row, 'swc-row-open');
        expect(row.hasAttribute('data-motion')).toBe(false);
    });

    it('does not animate a row that was already there', () => {
        const { container } = render(
            <MotionRow>
                <div>row</div>
            </MotionRow>,
        );
        expect(container.querySelector('.motion-row')?.hasAttribute('data-motion')).toBe(false);
    });

    it('closes when open turns false and reports once its height has closed, not when its fade ends', () => {
        const onClosed = vi.fn();
        const { container, rerender } = render(
            <MotionRow onClosed={onClosed}>
                <div>row</div>
            </MotionRow>,
        );
        rerender(
            <MotionRow open={false} onClosed={onClosed}>
                <div>row</div>
            </MotionRow>,
        );
        const row = container.querySelector('.motion-row') as HTMLElement;
        expect(row.getAttribute('data-motion')).toBe('close');
        expect(row.hasAttribute('inert')).toBe(true);
        animationEnd(row, 'swc-fade-out');
        expect(onClosed).not.toHaveBeenCalled();
        animationEnd(row, 'swc-row-close');
        expect(onClosed).toHaveBeenCalledTimes(1);
    });

    it('under reduced motion the fade-out is the close', () => {
        mockReducedMotion(true);
        const onClosed = vi.fn();
        const { container } = render(
            <MotionRow open={false} onClosed={onClosed}>
                <div>row</div>
            </MotionRow>,
        );
        animationEnd(container.querySelector('.motion-row') as HTMLElement, 'swc-fade-out');
        expect(onClosed).toHaveBeenCalledTimes(1);
    });

    it('reports closed on a fallback timer when no animation runs', () => {
        vi.useFakeTimers();
        try {
            const onClosed = vi.fn();
            render(
                <MotionRow open={false} onClosed={onClosed}>
                    <div>row</div>
                </MotionRow>,
            );
            act(() => {
                vi.advanceTimersByTime(500);
            });
            expect(onClosed).toHaveBeenCalledTimes(1);
        } finally {
            vi.useRealTimers();
        }
    });
});

describe('D2 · useFlip (the operator’s own sort)', () => {
    function List({ order, flipRef }: { order: string[]; flipRef: (f: ReturnType<typeof useFlip>) => void }) {
        const flip = useFlip();
        flipRef(flip);
        return (
            <ul>
                {order.map((id) => (
                    <li key={id} ref={flip.register(id)} data-id={id}>
                        {id}
                    </li>
                ))}
            </ul>
        );
    }

    function setup(reduce: boolean) {
        mockReducedMotion(reduce);
        const tops: Record<string, number> = { a: 0, b: 40 };
        const animate = vi.fn();
        Object.defineProperty(HTMLElement.prototype, 'animate', { value: animate, configurable: true });
        vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLElement) {
            return { top: tops[this.dataset.id ?? ''] ?? 0 } as DOMRect;
        });
        let flip!: ReturnType<typeof useFlip>;
        const { rerender } = render(<List order={['a', 'b']} flipRef={(f) => (flip = f)} />);
        return {
            animate,
            sort() {
                flip.capture();
                tops.a = 40;
                tops.b = 0;
                rerender(<List order={['b', 'a']} flipRef={(f) => (flip = f)} />);
            },
            rerenderSame() {
                rerender(<List order={['b', 'a']} flipRef={(f) => (flip = f)} />);
            },
        };
    }

    afterEach(() => vi.restoreAllMocks());

    it('slides each row from where it was after a captured re-sort, once', () => {
        const { animate, sort, rerenderSame } = setup(false);
        sort();
        expect(animate).toHaveBeenCalledTimes(2);
        expect(animate.mock.calls[0][0][0]).toEqual({ translate: '0 -40px' });
        rerenderSame();
        expect(animate).toHaveBeenCalledTimes(2);
    });

    it('does nothing under reduced motion', () => {
        const { animate, sort } = setup(true);
        sort();
        expect(animate).not.toHaveBeenCalled();
    });
});

describe('D3 · DataTable rowId keeps a changed cell on its own row', () => {
    type Row = { tenantId: string; status: string };
    const columns = [
        {
            header: 'Status',
            cell: ({ row }: { row: { original: Row } }) => (
                <ChangedCell value={row.original.status}>{row.original.status}</ChangedCell>
            ),
        },
    ];

    it('an insert above a row does not roll the rows below it; a real change does', () => {
        const a = { tenantId: 't-a', status: 'draft' };
        const b = { tenantId: 't-b', status: 'paid' };
        const { container, rerender } = render(
            <DataTable columns={columns} data={[a, b]} rowId={(r) => r.tenantId} />,
        );
        rerender(
            <DataTable columns={columns} data={[{ tenantId: 't-0', status: 'none' }, a, b]} rowId={(r) => r.tenantId} />,
        );
        expect(container.querySelectorAll('.motion-cell-roll')).toHaveLength(0);
        rerender(
            <DataTable
                columns={columns}
                data={[{ tenantId: 't-0', status: 'none' }, { ...a, status: 'finalized' }, b]}
                rowId={(r) => r.tenantId}
            />,
        );
        const rolled = container.querySelectorAll('.motion-cell-roll');
        expect(rolled).toHaveLength(1);
        expect(rolled[0].textContent).toBe('finalized');
    });
});

describe('amend (codex P2-prod)', () => {
    it('B1 faces show exactly one label without motion.css (inline base)', () => {
        render(<SaveButton saving={false} />);
        const button = screen.getByRole('button', { name: 'Save' });
        const wrapper = button.querySelector('.motion-faces') as HTMLElement;
        expect(wrapper.style.display).toBe('inline-grid');
        const [idle, saving] = Array.from(button.querySelectorAll<HTMLElement>('.motion-face'));
        expect(idle.style.opacity).toBe('');
        expect(saving.style.opacity).toBe('0');
        expect(saving.style.gridArea).toContain('1');
    });

    it('a closing Popover is inert at once and hands focus back to its trigger', () => {
        render(
            <Popover>
                <PopoverTrigger asChild>
                    <button type="button">Filters</button>
                </PopoverTrigger>
                <PopoverContent>
                    <input aria-label="Search" />
                </PopoverContent>
            </Popover>,
        );
        fireEvent.click(screen.getByText('Filters'));
        const input = screen.getByLabelText('Search');
        act(() => input.focus());
        expect(document.activeElement).toBe(input);
        fireEvent.keyDown(document, { key: 'Escape' });
        const closing = screen.getByRole('dialog', { hidden: true });
        expect(closing.getAttribute('data-state')).toBe('closed');
        expect(closing.hasAttribute('inert')).toBe(true);
        expect(document.activeElement).toBe(screen.getByText('Filters'));
    });

    it('a Popover closed by an outside click does not pull focus back', () => {
        render(
            <>
                <Popover>
                    <PopoverTrigger asChild>
                        <button type="button">Filters</button>
                    </PopoverTrigger>
                    <PopoverContent>panel</PopoverContent>
                </Popover>
                <button type="button">Elsewhere</button>
            </>,
        );
        fireEvent.click(screen.getByText('Filters'));
        const elsewhere = screen.getByText('Elsewhere');
        act(() => elsewhere.focus());
        fireEvent.pointerDown(elsewhere);
        expect(document.activeElement).toBe(elsewhere);
    });

    it('DataTable honours rowId with expandable rows, so an insert keeps each record’s cell state', () => {
        type Row = { tenantId: string; status: string };
        const columns = [
            {
                header: 'Status',
                cell: ({ row }: { row: { original: Row } }) => (
                    <ChangedCell value={row.original.status}>{row.original.status}</ChangedCell>
                ),
            },
        ];
        const a = { tenantId: 't-a', status: 'draft' };
        const b = { tenantId: 't-b', status: 'paid' };
        const props = { columns, rowId: (r: Row) => r.tenantId, renderExpanded: () => <span>more</span> };
        const { container, rerender } = render(<DataTable {...props} data={[a, b]} expandedRows={new Set([b])} />);
        const z = { tenantId: 't-0', status: 'none' };
        rerender(<DataTable {...props} data={[z, a, b]} expandedRows={new Set([b])} />);
        expect(container.querySelectorAll('.motion-cell-roll')).toHaveLength(0);
        expect(screen.getAllByText('more')).toHaveLength(1);
    });

    describe('useFlip on a sort still loading, and a sort interrupted', () => {
        afterEach(() => vi.restoreAllMocks());

        function rig() {
            const tops: Record<string, number> = { a: 0, b: 40 };
            const cancel = vi.fn();
            const animate = vi.fn(() => ({ cancel, finished: new Promise(() => {}) }));
            Object.defineProperty(HTMLElement.prototype, 'animate', { value: animate, configurable: true });
            vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLElement) {
                return { top: tops[this.dataset.id ?? ''] ?? 0 } as DOMRect;
            });
            return { tops, animate, cancel };
        }

        function List({ order, onFlip }: { order: string[]; onFlip: (f: ReturnType<typeof useFlip>) => void }) {
            const flip = useFlip();
            onFlip(flip);
            return (
                <ul>
                    {order.map((id) => (
                        <li key={id} ref={flip.register(id)} data-id={id}>
                            {id}
                        </li>
                    ))}
                </ul>
            );
        }

        it('keeps its capture through a render where nothing moved, then slides when the order lands', () => {
            const { tops, animate } = rig();
            let flip!: ReturnType<typeof useFlip>;
            const { rerender } = render(<List order={['a', 'b']} onFlip={(f) => (flip = f)} />);
            flip.capture();
            rerender(<List order={['a', 'b']} onFlip={(f) => (flip = f)} />); // the sort param changed; data not yet
            expect(animate).not.toHaveBeenCalled();
            tops.a = 40;
            tops.b = 0;
            rerender(<List order={['b', 'a']} onFlip={(f) => (flip = f)} />);
            expect(animate).toHaveBeenCalledTimes(2);
        });

        it('cancels its running slides before measuring a second sort', () => {
            const { tops, animate, cancel } = rig();
            let flip!: ReturnType<typeof useFlip>;
            const { rerender } = render(<List order={['a', 'b']} onFlip={(f) => (flip = f)} />);
            flip.capture();
            tops.a = 40;
            tops.b = 0;
            rerender(<List order={['b', 'a']} onFlip={(f) => (flip = f)} />);
            expect(animate).toHaveBeenCalledTimes(2);
            flip.capture();
            tops.a = 0;
            tops.b = 40;
            rerender(<List order={['a', 'b']} onFlip={(f) => (flip = f)} />);
            expect(cancel).toHaveBeenCalledTimes(2);
            expect(animate).toHaveBeenCalledTimes(4);
        });

        it('takes its duration from --splice-motion-flip', () => {
            const { tops, animate } = rig();
            document.documentElement.style.setProperty('--splice-motion-flip', '240ms');
            try {
                let flip!: ReturnType<typeof useFlip>;
                const { rerender } = render(<List order={['a', 'b']} onFlip={(f) => (flip = f)} />);
                flip.capture();
                tops.a = 40;
                tops.b = 0;
                rerender(<List order={['b', 'a']} onFlip={(f) => (flip = f)} />);
                expect((animate.mock.calls[0] as unknown[])[1]).toMatchObject({ duration: 240 });
            } finally {
                document.documentElement.style.removeProperty('--splice-motion-flip');
            }
        });
    });

    it('DataTable slides rows when the operator sorts by a header, and not when data reorders on its own', () => {
        type Row = { id: string; name: string };
        const animate = vi.fn(() => ({ cancel() {}, finished: new Promise(() => {}) }));
        Object.defineProperty(HTMLElement.prototype, 'animate', { value: animate, configurable: true });
        vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLElement) {
            const tr = this.closest('tr');
            const index = tr ? Array.from(tr.parentElement?.children ?? []).indexOf(tr) : 0;
            return { top: index * 40 } as DOMRect;
        });
        const columns = [{ accessorKey: 'name', header: 'Name', meta: { sortField: 'name' } }];
        function Table({ data }: { data: Row[] }) {
            const [sort, setSort] = React.useState<string | null>(null);
            return <DataTable columns={columns} data={data} clientSort={{ sortableFields: new Set(['name']), sort, onSortChange: setSort }} />;
        }
        const rows = [
            { id: '1', name: 'b' },
            { id: '2', name: 'a' },
        ];
        const { rerender } = render(<Table data={rows} />);
        // A remote reorder: no capture, so no slide.
        rerender(<Table data={[rows[1], rows[0]]} />);
        rerender(<Table data={rows} />);
        expect(animate).not.toHaveBeenCalled();
        fireEvent.click(screen.getByRole('button', { name: /Name/ }));
        expect(animate).toHaveBeenCalled();
        vi.restoreAllMocks();
    });
});
