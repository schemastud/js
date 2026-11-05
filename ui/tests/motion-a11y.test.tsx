import * as React from 'react';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { DataTable, DetailSwap, SaveButton } from '../src/index';

/**
 * P2-a11y (owner-review 18, the /impeccable P1s after the P2-prod amend): focus survives the C2
 * phone push / Back, and survives a SaveButton that is saving.
 */

afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
});

const ROWS = ['Alpha', 'Bravo', 'Charlie'];

/** A phone stack the way the flagship and the story build one: one DetailSwap, list or detail. */
function Stack({ marked = false, manageFocus }: { marked?: boolean; manageFocus?: boolean }) {
    const [open, setOpen] = React.useState<number | null>(null);
    return (
        <>
            <input aria-label="outside" />
            <DetailSwap
                data-testid="stack"
                swapKey={open === null ? 'list' : `detail-${open}`}
                motion={open === null ? 'back' : 'push'}
                manageFocus={manageFocus}
            >
                {open === null ? (
                    <ul>
                        {ROWS.map((name, i) => (
                            <li key={name}>
                                <button type="button" onClick={() => setOpen(i)}>
                                    Open {name}
                                </button>
                            </li>
                        ))}
                    </ul>
                ) : (
                    <article>
                        <button type="button" onClick={() => setOpen(null)}>
                            Back
                        </button>
                        <h2 data-swap-focus={marked || undefined}>{ROWS[open]} detail</h2>
                        <button type="button">Edit</button>
                    </article>
                )}
            </DetailSwap>
        </>
    );
}

function press(el: HTMLElement) {
    act(() => el.focus());
    fireEvent.click(el);
}

describe('C2 · DetailSwap moves focus with the phone stack', () => {
    it('push focuses the detail heading (made programmatically focusable), not <body>', () => {
        render(<Stack />);
        press(screen.getByRole('button', { name: 'Open Bravo' }));
        const heading = screen.getByRole('heading', { name: 'Bravo detail' });
        expect(document.activeElement).toBe(heading);
        expect(heading.getAttribute('tabindex')).toBe('-1');
    });

    it('a data-swap-focus marker wins over the first heading', () => {
        function Marked() {
            const [open, setOpen] = React.useState(false);
            return (
                <DetailSwap swapKey={open ? 'detail' : 'list'} motion={open ? 'push' : 'back'}>
                    {open ? (
                        <div>
                            <h2>Detail</h2>
                            <button type="button" data-swap-focus>
                                Primary action
                            </button>
                        </div>
                    ) : (
                        <button type="button" onClick={() => setOpen(true)}>
                            Open
                        </button>
                    )}
                </DetailSwap>
            );
        }
        render(<Marked />);
        press(screen.getByRole('button', { name: 'Open' }));
        expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Primary action' }));
    });

    it('Back returns focus to the row that opened the detail', () => {
        render(<Stack />);
        press(screen.getByRole('button', { name: 'Open Charlie' }));
        press(screen.getByRole('button', { name: 'Back' }));
        expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Open Charlie' }));

        // And again from a different row: the origin is the latest push, not the first.
        press(screen.getByRole('button', { name: 'Open Alpha' }));
        press(screen.getByRole('button', { name: 'Back' }));
        expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Open Alpha' }));
    });

    it('a soft cut (desktop) never moves focus', () => {
        function TwoPane() {
            const [selected, setSelected] = React.useState(0);
            return (
                <>
                    {ROWS.map((name, i) => (
                        <button key={name} type="button" onClick={() => setSelected(i)}>
                            Select {name}
                        </button>
                    ))}
                    <DetailSwap swapKey={selected} motion="soft-cut">
                        <h2>{ROWS[selected]} detail</h2>
                    </DetailSwap>
                </>
            );
        }
        render(<TwoPane />);
        const row = screen.getByRole('button', { name: 'Select Charlie' });
        press(row);
        expect(document.activeElement).toBe(row);
    });

    it('does not steal focus from outside the stack', () => {
        function Remote() {
            const [open, setOpen] = React.useState(false);
            return (
                <>
                    <input aria-label="search" onChange={() => setOpen(true)} />
                    <DetailSwap swapKey={open ? 'detail' : 'list'} motion={open ? 'push' : 'back'}>
                        {open ? <h2>Detail</h2> : <p>List</p>}
                    </DetailSwap>
                </>
            );
        }
        render(<Remote />);
        const search = screen.getByRole('textbox', { name: 'search' });
        act(() => search.focus());
        fireEvent.change(search, { target: { value: 'x' } });
        expect(screen.getByRole('heading', { name: 'Detail' })).toBeTruthy();
        expect(document.activeElement).toBe(search);
    });

    it('a hidden stack (the phone pane under lg:hidden on a desktop) never takes focus', () => {
        const visibility = vi.fn(() => false);
        Object.defineProperty(HTMLElement.prototype, 'checkVisibility', { configurable: true, value: visibility });
        try {
            render(<Stack />);
            press(screen.getByRole('button', { name: 'Open Bravo' }));
            expect(visibility).toHaveBeenCalled();
            expect(document.activeElement).not.toBe(screen.getByRole('heading', { name: 'Bravo detail' }));
        } finally {
            delete (HTMLElement.prototype as { checkVisibility?: unknown }).checkVisibility;
        }
    });

    it('manageFocus={false} opts out', () => {
        render(<Stack manageFocus={false} />);
        press(screen.getByRole('button', { name: 'Open Bravo' }));
        expect(document.activeElement).not.toBe(screen.getByRole('heading', { name: 'Bravo detail' }));
    });
});

describe('B1 · SaveButton keeps focus while it saves', () => {
    it('is aria-disabled, never natively disabled, while saving, so focus stays on it', () => {
        const { rerender } = render(<SaveButton saving={false} />);
        const button = screen.getByRole('button', { name: 'Save' });
        act(() => button.focus());

        rerender(<SaveButton saving />);
        const saving = screen.getByRole('button', { name: 'Saving…' });
        expect(saving).toBe(button);
        expect(saving.hasAttribute('disabled')).toBe(false);
        expect(saving.getAttribute('aria-disabled')).toBe('true');
        expect(saving.getAttribute('aria-busy')).toBe('true');
        expect(document.activeElement).toBe(saving);

        rerender(<SaveButton saving={false} />);
        expect(button.hasAttribute('aria-disabled')).toBe(false);
        expect(document.activeElement).toBe(button);
    });

    it('ignores a click while saving, and while the caller disables it', () => {
        const onClick = vi.fn();
        const { rerender } = render(<SaveButton saving onClick={onClick} />);
        fireEvent.click(screen.getByRole('button'));
        expect(onClick).not.toHaveBeenCalled();

        rerender(<SaveButton saving={false} disabled onClick={onClick} />);
        const button = screen.getByRole('button');
        expect(button.hasAttribute('disabled')).toBe(false);
        expect(button.getAttribute('aria-disabled')).toBe('true');
        fireEvent.click(button);
        expect(onClick).not.toHaveBeenCalled();

        rerender(<SaveButton saving={false} onClick={onClick} />);
        fireEvent.click(screen.getByRole('button'));
        expect(onClick).toHaveBeenCalledTimes(1);
    });

    it('a submit SaveButton does not submit its form while saving', () => {
        const onSubmit = vi.fn((event: React.FormEvent) => event.preventDefault());
        const { rerender } = render(
            <form onSubmit={onSubmit}>
                <SaveButton type="submit" saving />
            </form>,
        );
        fireEvent.click(screen.getByRole('button'));
        expect(onSubmit).not.toHaveBeenCalled();

        rerender(
            <form onSubmit={onSubmit}>
                <SaveButton type="submit" saving={false} />
            </form>,
        );
        fireEvent.click(screen.getByRole('button'));
        expect(onSubmit).toHaveBeenCalledTimes(1);
    });

    it('keeps the B1 width hold: both faces stay in the one cell while saving', () => {
        render(<SaveButton saving label="Save subscription" />);
        const button = screen.getByRole('button', { name: 'Saving…' });
        const faces = button.querySelectorAll('.motion-faces > .motion-face');
        expect(faces).toHaveLength(2);
        expect([...faces].map((face) => face.getAttribute('data-on'))).toEqual(['false', 'true']);
    });

    it('carries the disabled look on aria-disabled, so it still reads as unavailable', () => {
        render(<SaveButton saving />);
        expect(screen.getByRole('button').className).toContain('aria-disabled:opacity-100');
    });
});

describe('amend (codex P2-a11y): async detail and identity-based Back', () => {
    it('push into a detail still loading focuses the pane, then the heading once it arrives', async () => {
        function Async({ ready }: { ready: boolean }) {
            const [open, setOpen] = React.useState(false);
            return (
                <DetailSwap data-testid="pane" swapKey={open ? 'detail' : 'list'} motion={open ? 'push' : 'back'}>
                    {open ? (
                        ready ? <h2 data-swap-focus>Loaded</h2> : <p>Loading…</p>
                    ) : (
                        <button type="button" onClick={() => setOpen(true)}>
                            Open
                        </button>
                    )}
                </DetailSwap>
            );
        }
        const { rerender } = render(<Async ready={false} />);
        press(screen.getByRole('button', { name: 'Open' }));
        expect(document.activeElement).toBe(screen.getByTestId('pane'));
        rerender(<Async ready />);
        await act(async () => {
            await new Promise((resolve) => setTimeout(resolve, 0));
        });
        expect(document.activeElement).toBe(screen.getByRole('heading', { name: 'Loaded' }));
    });

    it('a heading that arrives after the user moved on does not take focus back', async () => {
        function Async({ ready }: { ready: boolean }) {
            const [open, setOpen] = React.useState(false);
            return (
                <>
                    <input aria-label="elsewhere" />
                    <DetailSwap swapKey={open ? 'detail' : 'list'} motion={open ? 'push' : 'back'}>
                        {open ? (
                            ready ? <h2>Loaded</h2> : <p>Loading…</p>
                        ) : (
                            <button type="button" onClick={() => setOpen(true)}>
                                Open
                            </button>
                        )}
                    </DetailSwap>
                </>
            );
        }
        const { rerender } = render(<Async ready={false} />);
        press(screen.getByRole('button', { name: 'Open' }));
        const elsewhere = screen.getByRole('textbox', { name: 'elsewhere' });
        act(() => elsewhere.focus());
        rerender(<Async ready />);
        await act(async () => {
            await new Promise((resolve) => setTimeout(resolve, 0));
        });
        expect(document.activeElement).toBe(elsewhere);
    });

    it('focusOnBack names the opener by identity, so a changed list still returns to the right row', () => {
        function Changing() {
            const [rows, setRows] = React.useState(['Alpha', 'Bravo']);
            const [open, setOpen] = React.useState<string | null>(null);
            const [opener, setOpener] = React.useState<string | null>(null);
            return (
                <DetailSwap
                    swapKey={open ?? 'list'}
                    motion={open ? 'push' : 'back'}
                    focusOnBack={opener ? `[data-row-id="${opener}"]` : undefined}
                >
                    {open ? (
                        <div>
                            <h2>{open}</h2>
                            <button
                                type="button"
                                onClick={() => {
                                    // A refetch lands while the detail is open: a row is inserted above.
                                    setRows((r) => ['Aardvark', ...r]);
                                    setOpen(null);
                                }}
                            >
                                Back
                            </button>
                        </div>
                    ) : (
                        rows.map((name) => (
                            <button
                                key={name}
                                type="button"
                                data-row-id={name}
                                onClick={() => {
                                    setOpener(name);
                                    setOpen(name);
                                }}
                            >
                                Open {name}
                            </button>
                        ))
                    )}
                </DetailSwap>
            );
        }
        render(<Changing />);
        press(screen.getByRole('button', { name: 'Open Alpha' }));
        press(screen.getByRole('button', { name: 'Back' }));
        expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Open Alpha' }));
    });

    it('DataTable marks each row opener with data-row-id, in both layouts', () => {
        const columns = [{ id: 'name', header: 'Name', cell: ({ row }: { row: { original: { id: string } } }) => row.original.id }];
        render(<DataTable columns={columns as never} data={[{ id: 'r-1' }]} rowId={(r: { id: string }) => r.id} onRowClick={() => {}} />);
        const opener = document.querySelector('[data-row-id="r-1"]');
        expect(opener?.tagName).toBe('BUTTON');
    });
});
