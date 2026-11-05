import type { Meta, StoryObj } from '@storybook/react-vite';
import { Archive, ArrowDownUp, Play, Plus } from 'lucide-react';
import * as React from 'react';
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
 *   pointer leaves the list or after 4 s.
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

    const close = (id: string) => {
        window.clearTimeout(timers.current.get(id));
        timers.current.delete(id);
        setArchived((a) => ({ ...a, [id]: 'closing' }));
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
                onPointerLeave={() => Object.entries(archived).forEach(([id, s]) => s === 'stub' && close(id))}
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
                                    <div className="grid grid-cols-[1fr_auto] items-center gap-3 border-b border-border bg-muted/50 px-4 py-2.5">
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
                                            onClick={() => {
                                                setArchived((a) => ({ ...a, [run.id]: 'stub' }));
                                                setAnnounce(`Archived ${run.name}. Undo is available.`);
                                                timers.current.set(run.id, window.setTimeout(() => close(run.id), 4000));
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
