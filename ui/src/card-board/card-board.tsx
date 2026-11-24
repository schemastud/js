import * as React from 'react';
import {
    DndContext,
    DragOverlay,
    MouseSensor,
    TouchSensor,
    useDraggable,
    useDroppable,
    useSensor,
    useSensors,
    type DragEndEvent,
    type DragStartEvent,
} from '@dnd-kit/core';
import { ArrowRightLeft, GripVertical } from 'lucide-react';
import { cn } from '../cn';
import { useUiMessages } from '../messages';

/**
 * A generic card board (owner-review-20261112 ticket 46): lanes of cards, which a pointer can drag and a keyboard can
 * move through a visible "Move" control on every card. Both paths call the one `onMove(card, toLane)`, which may refuse;
 * a refused card goes back to its lane and the board says why, on the card and through a polite live region.
 *
 * The board holds no workflow, schema or record type: the caller passes lanes, cards and how to read and render a card.
 * The caller owns `cards`. While a move is pending the card shows in its target lane; once `onMove` settles the board
 * shows `cards` again, so an accepted move sticks only when the caller moves the card in `cards`.
 *
 * Drag comes from `@dnd-kit/core`, an optional peer of this package, which is why the board ships from its own subpath
 * (`@schemastud/ui/card-board`) and never from the root entry. Below 48rem of its own width (a container query) the
 * board scrolls its lanes sideways one at a time.
 */

export interface CardBoardLane {
    /** Unique among the lanes; `onMove` receives it. */
    key: string;
    title: React.ReactNode;
    /** The lane's name as plain text, for the move control and announcements; the key by default. */
    label?: string;
}

/**
 * What `onMove` returns. Nothing or `true` accepts; `false` refuses without a reason; `{ refused }` refuses and says
 * why. A rejected promise refuses, with the error's message as the reason.
 */
export type CardMoveResult = void | boolean | { refused: string };

export interface CardBoardProps<C> {
    lanes: readonly CardBoardLane[];
    cards: readonly C[];
    getCardKey: (card: C) => string;
    getCardLane: (card: C) => string;
    /** The card's name as plain text, for its controls and announcements. */
    getCardLabel: (card: C) => string;
    renderCard: (card: C) => React.ReactNode;
    onMove: (card: C, toLane: string) => CardMoveResult | Promise<CardMoveResult>;
    /** The accessible name of the board. */
    label?: string;
    className?: string;
}

const focusRing = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1';

export function CardBoard<C>({
    lanes,
    cards,
    getCardKey,
    getCardLane,
    getCardLabel,
    renderCard,
    onMove,
    label,
    className,
}: CardBoardProps<C>) {
    const { t } = useUiMessages();
    const [pending, setPending] = React.useState<ReadonlyMap<string, string>>(new Map());
    const [refusals, setRefusals] = React.useState<ReadonlyMap<string, string>>(new Map());
    const [announced, setAnnounced] = React.useState('');
    const [dragging, setDragging] = React.useState<string | null>(null);
    // A card that changes lanes remounts in the new lane; after a keyboard move its Move control takes focus back there
    // (and again if a refusal sends it home), until focus leaves the card.
    const keepFocus = React.useRef<string | null>(null);

    const laneName = (key: string) => {
        const lane = lanes.find((l) => l.key === key);
        return lane?.label ?? (typeof lane?.title === 'string' ? lane.title : key);
    };
    const laneOf = (card: C) => pending.get(getCardKey(card)) ?? getCardLane(card);

    const move = async (card: C, toLane: string) => {
        const key = getCardKey(card);
        if (laneOf(card) === toLane || pending.has(key)) return;
        const name = getCardLabel(card);
        const laneLabel = laneName(toLane);
        setPending((m) => new Map(m).set(key, toLane));
        setRefusals((m) => withoutKey(m, key));
        let result: CardMoveResult;
        try {
            result = await onMove(card, toLane);
        } catch (error) {
            result = { refused: error instanceof Error ? error.message : '' };
        }
        setPending((m) => withoutKey(m, key));
        if (result === false || (typeof result === 'object' && result !== null)) {
            const reason = typeof result === 'object' ? result.refused : '';
            const said = reason
                ? t('schemastud-ui::messages.board.refused', { card: name, lane: laneLabel, reason })
                : t('schemastud-ui::messages.board.refused_no_reason', { card: name, lane: laneLabel });
            setRefusals((m) => new Map(m).set(key, said));
            setAnnounced(said);
        } else {
            setAnnounced(t('schemastud-ui::messages.board.moved', { card: name, lane: laneLabel }));
        }
    };

    // A mouse drags after a short travel and a finger after a short hold, so clicks, taps and scrolling inside a card
    // still work. The keyboard has the card's Move control instead of a drag sensor.
    const sensors = useSensors(
        useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
        useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 6 } }),
    );
    const byKey = new Map(cards.map((c) => [getCardKey(c), c] as const));
    const onDragStart = ({ active }: DragStartEvent) => {
        keepFocus.current = null;
        setDragging(String(active.id));
    };
    const onDragEnd = ({ active, over }: DragEndEvent) => {
        setDragging(null);
        const card = byKey.get(String(active.id));
        if (card !== undefined && over) void move(card, String(over.id));
    };
    const dragged = dragging === null ? undefined : byKey.get(dragging);

    return (
        <section aria-label={label ?? t('schemastud-ui::messages.board.board')} className={cn('@container min-w-0', className)}>
            <DndContext
                sensors={sensors}
                onDragStart={onDragStart}
                onDragEnd={onDragEnd}
                onDragCancel={() => setDragging(null)}
                // The board announces outcomes itself, in the host's language; dnd-kit's English drag narration is off.
                accessibility={{ announcements: SILENT, screenReaderInstructions: { draggable: '' } }}
            >
                <div
                    className={cn(
                        // By the board's own width (a container query), so a board in a side panel narrows too.
                        // Narrow: one lane at a time, scrolled sideways with snapping. Wide: the lanes share the row.
                        '-mx-1 flex snap-x snap-mandatory gap-3 overflow-x-auto px-1 pb-1',
                        '@3xl:mx-0 @3xl:grid @3xl:snap-none @3xl:auto-cols-fr @3xl:grid-flow-col @3xl:overflow-visible @3xl:px-0',
                    )}
                >
                    {lanes.map((lane) => {
                        const inLane = cards.filter((c) => laneOf(c) === lane.key);
                        return (
                            <Lane key={lane.key} lane={lane} count={inLane.length} emptyText={t('schemastud-ui::messages.nothing_here_yet')}>
                                {inLane.map((card) => {
                                    const key = getCardKey(card);
                                    return (
                                        <BoardCard
                                            key={key}
                                            id={key}
                                            label={getCardLabel(card)}
                                            lanes={lanes.filter((l) => l.key !== laneOf(card))}
                                            laneName={laneName}
                                            busy={pending.has(key)}
                                            dragging={dragging === key}
                                            refusal={refusals.get(key)}
                                            keepFocus={keepFocus}
                                            onMove={(toLane) => {
                                                keepFocus.current = key;
                                                void move(card, toLane);
                                            }}
                                        >
                                            {renderCard(card)}
                                        </BoardCard>
                                    );
                                })}
                            </Lane>
                        );
                    })}
                </div>
                <DragOverlay dropAnimation={null}>
                    {dragged !== undefined && (
                        <div className="rounded-lg border bg-card p-3 text-card-foreground shadow-md">{renderCard(dragged)}</div>
                    )}
                </DragOverlay>
            </DndContext>
            {/* dnd-kit keeps its own (silenced) live region; this one carries the board's outcomes. */}
            <p role="status" aria-live="polite" data-card-board-status="" className="sr-only">
                {announced}
            </p>
        </section>
    );
}

const SILENT = {
    onDragStart: () => undefined,
    onDragOver: () => undefined,
    onDragEnd: () => undefined,
    onDragCancel: () => undefined,
};

function withoutKey(map: ReadonlyMap<string, string>, key: string): ReadonlyMap<string, string> {
    if (!map.has(key)) return map;
    const next = new Map(map);
    next.delete(key);
    return next;
}

function Lane({
    lane,
    count,
    emptyText,
    children,
}: {
    lane: CardBoardLane;
    count: number;
    emptyText: string;
    children: React.ReactNode;
}) {
    const { setNodeRef, isOver } = useDroppable({ id: lane.key });
    const titleId = React.useId();
    return (
        <section
            ref={setNodeRef}
            aria-labelledby={titleId}
            data-lane={lane.key}
            className={cn(
                'flex w-[85%] max-w-sm min-w-0 shrink-0 snap-start flex-col rounded-lg bg-muted/50 p-2.5 transition-colors',
                '@3xl:w-auto @3xl:max-w-none',
                isOver && 'bg-muted ring-2 ring-ring/40',
            )}
        >
            <header className="flex items-center gap-2 px-1 pb-2">
                <h3 id={titleId} className="min-w-0 truncate text-sm font-medium">
                    {lane.title}
                </h3>
                <span className="ml-auto font-mono text-[11px] tabular-nums text-muted-foreground">{count}</span>
            </header>
            {count === 0 ? (
                <p className="px-1 pb-1 text-xs text-muted-foreground">{emptyText}</p>
            ) : (
                <ul className="flex flex-col gap-2">{children}</ul>
            )}
        </section>
    );
}

function BoardCard({
    id,
    label,
    lanes,
    laneName,
    busy,
    dragging,
    refusal,
    keepFocus,
    onMove,
    children,
}: {
    id: string;
    label: string;
    lanes: readonly CardBoardLane[];
    laneName: (key: string) => string;
    busy: boolean;
    dragging: boolean;
    refusal: string | undefined;
    keepFocus: React.RefObject<string | null>;
    onMove: (toLane: string) => void;
    children: React.ReactNode;
}) {
    const { t } = useUiMessages();
    const { setNodeRef, setActivatorNodeRef, listeners } = useDraggable({ id });
    const [choosing, setChoosing] = React.useState(false);
    const toggle = React.useRef<HTMLButtonElement>(null);
    const menuId = React.useId();

    const close = (refocus: boolean) => {
        setChoosing(false);
        if (refocus) toggle.current?.focus();
    };

    // On mount, which is also a lane change: take focus back if this card was the last one moved by its Move control.
    React.useEffect(() => {
        if (keepFocus.current === id) toggle.current?.focus();
    }, [keepFocus, id]);

    return (
        <li
            ref={setNodeRef}
            aria-busy={busy || undefined}
            data-card={id}
            onBlur={(e) => {
                // Focus moved somewhere else on the page (not lost to this card's own remount).
                if (e.relatedTarget && !e.currentTarget.contains(e.relatedTarget) && keepFocus.current === id) {
                    keepFocus.current = null;
                }
            }}
            className={cn(
                'rounded-lg border bg-card p-3 text-card-foreground shadow-xs focus-within:ring-2 focus-within:ring-ring/50',
                dragging && 'opacity-40',
                busy && 'opacity-70',
            )}
        >
            <div className="flex items-start gap-2">
                <span
                    ref={setActivatorNodeRef}
                    {...listeners}
                    aria-hidden
                    className="-ml-1 mt-0.5 flex size-6 shrink-0 cursor-grab touch-none items-center justify-center rounded text-muted-foreground active:cursor-grabbing"
                >
                    <GripVertical className="size-4" />
                </span>
                <div className="min-w-0 flex-1">{children}</div>
            </div>
            {refusal && <p className="mt-2 text-xs text-destructive">{refusal}</p>}
            {lanes.length > 0 && (
                <div className="mt-2 border-t pt-2">
                    <button
                        ref={toggle}
                        type="button"
                        aria-expanded={choosing}
                        aria-controls={menuId}
                        // aria-disabled, not disabled: a pending card's control keeps focus across its lane change.
                        aria-disabled={busy || undefined}
                        onClick={() => {
                            if (!busy) setChoosing((v) => !v);
                        }}
                        className={cn(
                            'inline-flex min-h-8 items-center gap-1.5 rounded-md px-2 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground aria-disabled:cursor-not-allowed aria-disabled:opacity-50',
                            focusRing,
                        )}
                    >
                        <ArrowRightLeft className="size-3.5" aria-hidden />
                        {t('schemastud-ui::messages.board.move_card', { card: label })}
                    </button>
                    {choosing && (
                        <ul
                            id={menuId}
                            className="mt-1 flex flex-col gap-1"
                            onKeyDown={(e) => {
                                if (e.key === 'Escape') {
                                    e.stopPropagation();
                                    close(true);
                                }
                            }}
                        >
                            {lanes.map((lane) => (
                                <li key={lane.key}>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            close(true);
                                            onMove(lane.key);
                                        }}
                                        className={cn(
                                            'flex min-h-8 w-full items-center rounded-md px-2 text-left text-xs hover:bg-muted',
                                            focusRing,
                                        )}
                                    >
                                        {t('schemastud-ui::messages.board.move_to', { lane: laneName(lane.key) })}
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            )}
        </li>
    );
}
