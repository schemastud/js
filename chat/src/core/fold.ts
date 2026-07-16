/**
 * The fold engine (KEYSTONE reducer — ADR-0079, PRD §4). Turns a
 * `ChatWireEvent` stream into `ChatSnapshot`s a consumer subscribes to.
 *
 * `foldEvent` is a PURE reducer: `(snapshot, event) → snapshot`. It never
 * mutates its input — it returns a new snapshot with new references only along
 * the changed path, so a subscriber can shallow-compare. It is defensive by
 * design: events may arrive out of order (a `token` before its message is
 * known mints the message), duplicated (a repeated `tool_call` for the same
 * `toolId` is idempotent), or after a terminal state (a late `token` after
 * `done` is dropped rather than re-opening the turn).
 *
 * Roster is CORE state (04). History hydrates from a seed (`initialMessages`)
 * and the core emits a reconcile-able `done` (the hybrid controlled-core
 * history seam for ticket 08 — a consumer keeps durable history in its own
 * store, hydrates the core, and re-reconciles on `done`).
 */
import type { ChatMessage, Citation, Participant, Segment } from './envelope';
import type { ChatWireEvent } from './wire';

/** Session-scoped escalation state (transport/session capability, not a message field). */
export interface EscalationState {
    reason: string;
    offer?: unknown;
}

/** The folded read-model a consumer renders. New references along changed paths only. */
export interface ChatSnapshot {
    messages: ChatMessage[];
    roster: Participant[];
    sessionId: string | null;
    escalation: EscalationState | null;
    /** True while any message is still streaming (`streaming.partial`). */
    streaming: boolean;
}

/** A blank snapshot. */
export function emptySnapshot(): ChatSnapshot {
    return { messages: [], roster: [], sessionId: null, escalation: null, streaming: false };
}

/**
 * Hydrate a snapshot from a history seed (the `initialMessages` hydration seam).
 * Seeded messages are finalized (never `streaming.partial`) unless they carry
 * their own `streaming` marker.
 */
export function hydrate(seed: ChatMessage[]): ChatSnapshot {
    return {
        ...emptySnapshot(),
        messages: seed.map((m) => ({ ...m })),
    };
}

/** Recompute the derived top-level `streaming` flag from message stream states. */
function anyStreaming(messages: ChatMessage[]): boolean {
    return messages.some((m) => m.streaming?.partial === true);
}

/**
 * Find or mint the target message for a `messageId`-correlated event. Returns
 * the index; -1 means "append a fresh streaming assistant message". Minting on
 * an unknown id is what makes an out-of-order `token` (arriving before any
 * frame that announces the message) safe.
 */
function indexOf(messages: ChatMessage[], messageId: string): number {
    return messages.findIndex((m) => m.id === messageId);
}

/** Replace one message by index with a shallow clone patched by `patch`. */
function patchAt(messages: ChatMessage[], index: number, patch: (m: ChatMessage) => ChatMessage): ChatMessage[] {
    const next = messages.slice();
    next[index] = patch(messages[index]);
    return next;
}

/** Ensure a streaming assistant message exists for `messageId`; return [messages, index]. */
function ensureMessage(messages: ChatMessage[], messageId: string): [ChatMessage[], number] {
    const existing = indexOf(messages, messageId);
    if (existing !== -1) {
        return [messages, existing];
    }

    const fresh: ChatMessage = {
        id: messageId,
        role: 'assistant',
        content: '',
        streaming: { partial: true },
    };

    return [[...messages, fresh], messages.length];
}

/** Append a segment, coalescing consecutive plain-text deltas into the trailing text segment. */
function appendToken(segments: Segment[] | undefined, delta: string): Segment[] {
    const list = segments ? segments.slice() : [];
    const tail = list[list.length - 1];

    if (tail && tail.type === 'text' && tail.body === undefined) {
        list[list.length - 1] = { ...tail, text: tail.text + delta };
    } else {
        list.push({ type: 'text', text: delta });
    }

    return list;
}

/** True if a tool segment for `toolId` of `type` already exists (dedup guard). */
function hasToolSegment(segments: Segment[] | undefined, type: 'tool_call' | 'tool_result', toolId: string): boolean {
    return (segments ?? []).some((s) => s.type === type && 'toolId' in s && s.toolId === toolId);
}

/**
 * The pure fold reducer. Folds one canonical wire event into the snapshot.
 * Unknown message ids mint a streaming assistant turn; duplicates and
 * post-terminal events are absorbed idempotently.
 */
export function foldEvent(snapshot: ChatSnapshot, event: ChatWireEvent): ChatSnapshot {
    switch (event.type) {
        case 'token': {
            if (event.delta === '') {
                return snapshot;
            }

            const [messages, index] = ensureMessage(snapshot.messages, event.messageId);
            const target = messages[index];

            // A late token after the turn finalized does not re-open it.
            if (target.streaming && target.streaming.partial === false) {
                return snapshot;
            }

            const next = patchAt(messages, index, (m) => ({
                ...m,
                content: m.content + event.delta,
                segments: appendToken(m.segments, event.delta),
                streaming: m.streaming ?? { partial: true },
            }));

            return { ...snapshot, messages: next, streaming: anyStreaming(next) };
        }

        case 'tool_call': {
            const [messages, index] = ensureMessage(snapshot.messages, event.messageId);

            if (hasToolSegment(messages[index].segments, 'tool_call', event.toolId)) {
                // Idempotent: a duplicate tool_call for the same toolId is dropped.
                return messages === snapshot.messages ? snapshot : { ...snapshot, messages };
            }

            const segment: Segment = {
                type: 'tool_call',
                toolId: event.toolId,
                toolName: event.toolName,
                arguments: event.arguments,
            };

            const next = patchAt(messages, index, (m) => ({
                ...m,
                segments: [...(m.segments ?? []), segment],
                streaming: m.streaming ?? { partial: true },
            }));

            return { ...snapshot, messages: next, streaming: anyStreaming(next) };
        }

        case 'tool_result': {
            const [messages, index] = ensureMessage(snapshot.messages, event.messageId);

            if (hasToolSegment(messages[index].segments, 'tool_result', event.toolId)) {
                return messages === snapshot.messages ? snapshot : { ...snapshot, messages };
            }

            const segment: Segment = {
                type: 'tool_result',
                toolId: event.toolId,
                toolName: event.toolName,
                result: event.result,
            };

            const next = patchAt(messages, index, (m) => ({
                ...m,
                segments: [...(m.segments ?? []), segment],
                streaming: m.streaming ?? { partial: true },
            }));

            return { ...snapshot, messages: next, streaming: anyStreaming(next) };
        }

        case 'citation': {
            const [messages, index] = ensureMessage(snapshot.messages, event.messageId);
            const citations: Citation[] = event.citations.map((c) => ({ ...c }));

            const next = patchAt(messages, index, (m) => ({ ...m, citations }));

            return { ...snapshot, messages: next };
        }

        case 'session':
            if (snapshot.sessionId === event.session_id) {
                return snapshot;
            }
            return { ...snapshot, sessionId: event.session_id };

        case 'escalation':
            return {
                ...snapshot,
                escalation: { reason: event.reason, ...(event.offer !== undefined ? { offer: event.offer } : {}) },
            };

        case 'roster':
            return { ...snapshot, roster: event.participants.map((p) => ({ ...p })) };

        case 'done': {
            const index = indexOf(snapshot.messages, event.messageId);
            if (index === -1) {
                // A done for an unknown message finalizes nothing; ignore.
                return snapshot;
            }

            const next = patchAt(snapshot.messages, index, (m) => ({
                ...m,
                streaming: { ...(m.streaming ?? { partial: false }), partial: false },
                ...(event.createdAt && !m.createdAt ? { createdAt: event.createdAt } : {}),
            }));

            return { ...snapshot, messages: next, streaming: anyStreaming(next) };
        }

        case 'error': {
            // A message-scoped error finalizes that turn with an error; an
            // untargeted error surfaces on the latest streaming turn if any.
            let index = event.messageId ? indexOf(snapshot.messages, event.messageId) : -1;
            if (index === -1 && !event.messageId) {
                for (let i = snapshot.messages.length - 1; i >= 0; i--) {
                    if (snapshot.messages[i].streaming?.partial) {
                        index = i;
                        break;
                    }
                }
            }

            if (index === -1) {
                // No turn to attach to: surface as a session-level escalation-free error is
                // out of scope; keep it on the snapshot's streaming flag cleared.
                return { ...snapshot, streaming: false };
            }

            const next = patchAt(snapshot.messages, index, (m) => ({
                ...m,
                streaming: { partial: event.partial, error: event.error },
            }));

            return { ...snapshot, messages: next, streaming: anyStreaming(next) };
        }

        default: {
            // Exhaustiveness: an unknown event is inert (forward-compatible).
            const _exhaustive: never = event;
            void _exhaustive;
            return snapshot;
        }
    }
}

/** Fold an entire event iterable into a final snapshot (test/replay convenience). */
export async function foldAll(
    start: ChatSnapshot,
    events: AsyncIterable<ChatWireEvent> | Iterable<ChatWireEvent>,
): Promise<ChatSnapshot> {
    let snapshot = start;
    for await (const event of events as AsyncIterable<ChatWireEvent>) {
        snapshot = foldEvent(snapshot, event);
    }
    return snapshot;
}
