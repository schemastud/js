import type { Meta, StoryObj } from '@storybook/react-vite';
import { Archive, ArrowDownUp, Play, Plus } from 'lucide-react';
import * as React from 'react';
import { expect, fireEvent, userEvent, waitFor, within } from 'storybook/test';
import { Badge } from '../badge';
import { Button } from '../button';
import { ChangedCell, MotionRow, useFlip } from '../motion';

/**
 * Motion/D3 + D2 Rows (owner-review 18, ruled 2026-11-02).
 * - **D3, a remote change** ("Advance row 2"): only the status and time cells roll their new value
 *   up 6 px from 0.4 opacity; the row never moves.
 * - **D2, the operator's own insert** ("New run"): the row opens its height (200 ms).
 * - **D2, the operator's own archive**: the row becomes an "Archived · Undo" stub that holds its
 *   height (so the next row's Archive never slides under the pointer), then closes when the
 *   pointer leaves the list, when focus leaves the stub, or after 4 s. A stub archived from the
 *   keyboard stays open while it holds focus (pointer-leave and the timer pass it by), and a stub
 *   that closes with focus inside hands focus to the next row's action first; Undo returns focus
 *   to the restored row's Archive (P2-a11y).
 * - **D2, the operator's own sort**: every row slides from its old place (FLIP, 180 ms). Remote
 *   reorders cut.
 * Reduced motion: fades only — no roll, no height, no slide.
 */
const meta = {
    title: 'Motion/D3 + D2 Rows',
    parameters: { layout: 'fullscreen' },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

type Status = 'queued' | 'generating' | 'complete' | 'failed';
type Run = { id: string; name: string; status: Status; updated: string; inserted?: boolean };
const NEXT: Record<Status, Status> = { queued: 'generating', generating: 'complete', complete: 'queued', failed: 'queued' };

const INITIAL: Run[] = [
    { id: 'run-2041', name: 'Ingest · EU contracts batch', status: 'generating', updated: '12 s ago' },
    { id: 'run-2040', name: 'Summarise · Q3 board pack', status: 'queued', updated: '1 min ago' },
    { id: 'run-2038', name: 'Classify · inbound tickets', status: 'complete', updated: '4 min ago' },
    { id: 'run-2035', name: 'Extract · supplier invoices', status: 'failed', updated: '9 min ago' },
];
const NEW_RUNS = ['Redact · HR case notes', 'Embed · policy library v4', 'Review · vendor DPAs'];

const ROW = 'grid grid-cols-[1fr_auto_5.5rem_2.25rem] items-center gap-3 border-b border-border px-4 py-2.5 max-sm:grid-cols-[1fr_auto_2.25rem]';

function Rows() {
    const [runs, setRuns] = React.useState(INITIAL);
    const [sorted, setSorted] = React.useState(false);
    const [archived, setArchived] = React.useState<Record<string, 'stub' | 'closing'>>({});
    const [announce, setAnnounce] = React.useState('');
    const seq = React.useRef(2042);
    const timers = React.useRef(new Map<string, number>());
    const flip = useFlip<HTMLLIElement>();
    const visible = React.useMemo(() => (sorted ? [...runs].sort((a, b) => a.name.localeCompare(b.name)) : runs), [runs, sorted]);
    // Stubs archived from the keyboard (a click with `detail === 0`), each stub's element, and a
    // row whose Archive takes focus back after an Undo.
    const keyboard = React.useRef(new Set<string>());
    const stubs = React.useRef(new Map<string, HTMLElement>());
    const refocus = React.useRef<string | null>(null);

    React.useLayoutEffect(() => {
        const id = refocus.current;
        if (!id) return;
        refocus.current = null;
        document.querySelector<HTMLElement>(`[data-demo="remove-${id}"]`)?.focus();
    });

    /** A keyboard-archived stub that holds focus stays open: it closes when focus leaves it. */
    const holdsFocus = (id: string) => keyboard.current.has(id) && !!stubs.current.get(id)?.contains(document.activeElement);

    const close = (id: string) => {
        window.clearTimeout(timers.current.get(id));
        timers.current.delete(id);
        keyboard.current.delete(id);
        const stub = stubs.current.get(id);
        if (stub?.contains(document.activeElement)) {
            // The closing row goes inert; hand focus to the next row's action (or the previous one's)
            // before it does, so it never falls to <body>.
            const li = stub.closest('li');
            const next = li?.nextElementSibling ?? li?.previousElementSibling;
            (next?.querySelector<HTMLElement>('button') ?? document.querySelector<HTMLElement>('[data-demo="add"]'))?.focus();
        }
        // An Undo may have restored the row already: never close a row that is no longer archived.
        setArchived((a) => (a[id] ? { ...a, [id]: 'closing' } : a));
    };

    return (
        <div className="max-w-[760px] p-4 sm:p-8">
            <div className="mb-4 flex flex-wrap gap-2">
                <Button
                    size="sm"
                    data-demo="add"
                    onClick={() => {
                        const id = `run-${seq.current++}`;
                        const name = NEW_RUNS[(seq.current - 2043) % NEW_RUNS.length];
                        setRuns((r) => [{ id, name, status: 'queued', updated: 'just now', inserted: true }, ...r]);
                        setAnnounce(`New run ${name}, queued`);
                    }}
                >
                    <Plus className="size-4" /> New run
                </Button>
                <Button
                    size="sm"
                    variant="outline"
                    data-demo="advance"
                    onClick={() => {
                        const target = visible[1];
                        if (!target) return;
                        setRuns((r) => r.map((x) => (x.id === target.id ? { ...x, status: NEXT[x.status], updated: 'just now' } : x)));
                        setAnnounce(`${target.name} now ${NEXT[target.status]}`);
                    }}
                >
                    <Play className="size-4" /> Advance row 2 (remote)
                </Button>
                <Button
                    size="sm"
                    variant="outline"
                    data-demo="sort"
                    aria-pressed={sorted}
                    onClick={() => {
                        flip.capture();
                        setSorted((s) => !s);
                    }}
                >
                    <ArrowDownUp className="size-4" /> {sorted ? 'Newest first' : 'Sort by name'}
                </Button>
            </div>
            <span role="status" aria-live="polite" className="sr-only">
                {announce}
            </span>
            <div
                className="overflow-hidden rounded-lg border border-border bg-card"
                onPointerLeave={() => Object.entries(archived).forEach(([id, s]) => s === 'stub' && !holdsFocus(id) && close(id))}
            >
                <ul>
                    {visible.map((run) => (
                        <li key={run.id} ref={flip.register(run.id)} className="relative bg-card" data-demo={`row-${run.id}`}>
                            <MotionRow
                                appear={run.inserted}
                                open={archived[run.id] !== 'closing'}
                                onClosed={() => {
                                    setRuns((r) => r.filter((x) => x.id !== run.id));
                                    setArchived(({ [run.id]: _, ...rest }) => rest);
                                }}
                            >
                                {archived[run.id] ? (
                                    <div
                                        ref={(el) => {
                                            if (el) stubs.current.set(run.id, el);
                                            else stubs.current.delete(run.id);
                                        }}
                                        data-demo={`stub-${run.id}`}
                                        className="grid grid-cols-[1fr_auto] items-center gap-3 border-b border-border bg-muted/50 px-4 py-2.5"
                                        onBlur={(event) => {
                                            if (archived[run.id] !== 'stub') return;
                                            if (event.currentTarget.contains(event.relatedTarget as Node | null)) return;
                                            close(run.id);
                                        }}
                                    >
                                        {/* Two lines, like the row it replaces, so the stub holds the row's height. */}
                                        <span className="min-w-0">
                                            <span className="block truncate text-sm text-muted-foreground">Archived · {run.name}</span>
                                            <span className="block font-mono text-[10.5px] text-muted-foreground">{run.id}</span>
                                        </span>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            data-demo={`undo-${run.id}`}
                                            autoFocus
                                            onClick={() => {
                                                window.clearTimeout(timers.current.get(run.id));
                                                timers.current.delete(run.id);
                                                keyboard.current.delete(run.id);
                                                refocus.current = run.id;
                                                setArchived(({ [run.id]: _, ...rest }) => rest);
                                                setAnnounce('Archive undone');
                                            }}
                                        >
                                            Undo
                                        </Button>
                                    </div>
                                ) : (
                                    <div className={ROW}>
                                        <span className="min-w-0">
                                            <span className="block truncate text-sm font-medium">{run.name}</span>
                                            <span className="block font-mono text-[10.5px] text-muted-foreground">{run.id}</span>
                                        </span>
                                        <ChangedCell value={run.status}>
                                            <Badge variant="outline" className="font-mono">
                                                {run.status}
                                            </Badge>
                                        </ChangedCell>
                                        <span className="max-sm:hidden">
                                            <ChangedCell value={run.updated}>
                                                <span className="font-mono text-[10.5px] text-muted-foreground tabular-nums">{run.updated}</span>
                                            </ChangedCell>
                                        </span>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="size-8"
                                            aria-label={`Archive ${run.name}`}
                                            data-demo={`remove-${run.id}`}
                                            onClick={(event) => {
                                                if (event.detail === 0) keyboard.current.add(run.id);
                                                setArchived((a) => ({ ...a, [run.id]: 'stub' }));
                                                setAnnounce(`Archived ${run.name}. Undo is available.`);
                                                // While a keyboard user is on Undo the timer passes; focus leaving closes it.
                                                timers.current.set(
                                                    run.id,
                                                    window.setTimeout(() => !holdsFocus(run.id) && close(run.id), 4000),
                                                );
                                            }}
                                        >
                                            <Archive className="size-4" />
                                        </Button>
                                    </div>
                                )}
                            </MotionRow>
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    );
}

export const RowUpdates: Story = { name: 'Cell roll · open/close · own sort', render: () => <Rows /> };

const list = (canvasElement: HTMLElement) => canvasElement.querySelector('ul')!.parentElement!;
/** React builds onPointerLeave from pointerout, so the pointer leaves by a pointerout to outside the list. */
const pointerLeavesList = (canvasElement: HTMLElement) =>
    fireEvent.pointerOut(list(canvasElement), { relatedTarget: document.body, bubbles: true });

/**
 * P2-a11y: a stub archived from the keyboard stays open while Undo holds focus — the pointer
 * leaving the list and the 4 s timer both pass it by — and closes once focus leaves it, handing
 * focus to the next row. Undo from the keyboard puts focus back on the row's Archive.
 */
export const UndoKeepsFocus: Story = {
    name: 'Undo stub · held open under keyboard focus (play)',
    render: () => <Rows />,
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        const archive = canvas.getByRole('button', { name: 'Archive Summarise · Q3 board pack' });
        archive.focus();
        await userEvent.keyboard('{Enter}');
        const undo = await canvas.findByRole('button', { name: 'Undo' });
        await waitFor(() => expect(document.activeElement).toBe(undo));

        pointerLeavesList(canvasElement);
        await new Promise((resolve) => setTimeout(resolve, 4400)); // past the 4 s timer and the close
        await expect(canvas.getByRole('button', { name: 'Undo' })).toBe(undo);
        await expect(document.activeElement).toBe(undo);

        // Undo from the keyboard: the row is back, and focus is on its Archive.
        await userEvent.keyboard('{Enter}');
        await waitFor(() =>
            expect(document.activeElement).toBe(canvas.getByRole('button', { name: 'Archive Summarise · Q3 board pack' })),
        );

        // Archive again, then Tab away: focus leaving the stub closes it, and focus is never <body>.
        await userEvent.keyboard('{Enter}');
        await waitFor(() => expect(document.activeElement).toBe(canvas.getByRole('button', { name: 'Undo' })));
        await userEvent.tab();
        await waitFor(() => expect(canvas.queryByText('Archived · Summarise · Q3 board pack')).toBeNull(), { timeout: 2000 });
        await expect(document.activeElement).not.toBe(document.body);
    },
};

/** The pointer path is unchanged: a stub archived by a click closes when the pointer leaves the list. */
export const UndoPointerLeave: Story = {
    name: 'Undo stub · closes on pointer leave (play)',
    render: () => <Rows />,
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await userEvent.click(canvas.getByRole('button', { name: 'Archive Classify · inbound tickets' }));
        await canvas.findByText('Archived · Classify · inbound tickets');
        pointerLeavesList(canvasElement);
        await waitFor(() => expect(canvas.queryByText('Archived · Classify · inbound tickets')).toBeNull(), { timeout: 2000 });
        await expect(document.activeElement).not.toBe(document.body);
    },
};
