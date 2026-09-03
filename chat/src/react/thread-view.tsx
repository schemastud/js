/**
 * `<ThreadView>` — the indent/collapse render of a nested reply thread.
 *
 * It is `<ChatView>`'s sibling, not its replacement: same snapshot, same slot
 * bag, same default message body. The only thing it adds is that rows are
 * ordered and indented by the DERIVED tree (`@schemastud/chat/thread`) instead
 * of by the flat `messages` array.
 *
 * The cap and the collapse set both live HERE, on the view, and that is the
 * point. `foldTree` holds every edge at every cap, so changing either prop
 * re-renders from the snapshot already in hand — no refetch, no second
 * read-model. A consumer that wants forum semantics passes `maxDepth={null}`;
 * one that wants board passes `2`; `1` is linear chat and renders exactly what
 * `<ChatView>` would.
 */
import { useCallback, useMemo, useState } from 'react';
import type { ChatMessage } from '../core/index';
import { countDescendants, flattenThread, foldTree } from '../thread/index';
import type { ThreadDepthCap } from '../thread/index';
import { renderMessageBody } from './default-render';
import type { ChatSlots } from './slots';

export interface ThreadViewProps {
    /** The snapshot to project. `ChatSnapshot` satisfies this. */
    snapshot: { messages: ChatMessage[] };
    /**
     * The render cap: `null`/omitted = unbounded (forum), `2` = one reply level
     * (board), `1` = flat (chat). Storage is unaffected either way.
     */
    maxDepth?: ThreadDepthCap;
    /** Slot fills. `threadRowChrome` is the one this view adds. */
    slots?: ChatSlots;
    /** Rows collapsed on first render, by message id. */
    initialCollapsed?: string[];
}

export function ThreadView({ snapshot, maxDepth = null, slots = {}, initialCollapsed = [] }: ThreadViewProps) {
    const [collapsed, setCollapsed] = useState<ReadonlySet<string>>(() => new Set(initialCollapsed));

    // Derived, never stored: the tree is recomputed from the snapshot the fold
    // engine already owns. Memoised on identity, which is exactly what the
    // reducer's new-references-along-the-changed-path contract makes cheap.
    const roots = useMemo(() => foldTree(snapshot, maxDepth), [snapshot, maxDepth]);
    const rows = useMemo(() => flattenThread(roots, { collapsed }), [roots, collapsed]);

    const toggle = useCallback((id: string) => {
        setCollapsed((previous) => {
            const next = new Set(previous);
            if (!next.delete(id)) {
                next.add(id);
            }
            return next;
        });
    }, []);

    return (
        <div data-thread-view data-max-depth={maxDepth ?? 'unbounded'}>
            {rows.length === 0 && slots.emptyState ? slots.emptyState() : null}

            {rows.map((row) => {
                const childCount = countDescendants(row);
                const isCollapsed = collapsed.has(row.message.id);

                return (
                    <div
                        key={row.message.id}
                        data-thread-row
                        data-depth={row.depth}
                        data-collapsed={isCollapsed}
                        style={{ marginInlineStart: `${row.depth}rem` }}
                    >
                        {slots.threadRowChrome ? (
                            <div data-thread-row-chrome>
                                {slots.threadRowChrome({
                                    message: row.message,
                                    depth: row.depth,
                                    childCount,
                                    collapsed: isCollapsed,
                                    toggle: () => toggle(row.message.id),
                                })}
                            </div>
                        ) : childCount > 0 ? (
                            <button type="button" data-thread-toggle onClick={() => toggle(row.message.id)}>
                                {isCollapsed ? `Show ${childCount} replies` : `Hide ${childCount} replies`}
                            </button>
                        ) : null}

                        <div data-chat-message data-role={row.message.role}>
                            {renderMessageBody(row.message, slots.renderSegment)}
                            {slots.messageToolbar ? (
                                <div data-chat-message-toolbar>{slots.messageToolbar(row.message)}</div>
                            ) : null}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
