/**
 * The chat message envelope (KEYSTONE — ADR-0079 §"The envelope", PRD §3).
 *
 * A chat message is a **capability-layered envelope** that chat owns as its
 * per-medium document model. A mandatory `{ id, role, content }` core is the
 * universal floor every consumer reads (lean consumers read ONLY `content`);
 * richer consumers opt into declared optional capabilities. blockdoc does NOT
 * model the conversation — it appears only as an optional rich `body` on a
 * prose `text` segment. Session-scoped concerns (escalation, session identity,
 * paid-gate) are transport/session capabilities, NOT message fields.
 *
 * This is the ONE canonical read-model every downstream consumer folds (embed
 * adapter, <ChatView>, presets, Threads, numero, showcase). Do not redefine it
 * elsewhere.
 */

export type Role = 'user' | 'assistant' | 'system';

/** A blockdoc doc JSON; typed via the @schemastud/blockdoc peerDep when present. */
export type BlockdocDoc = unknown;

/**
 * ONE canonical citation shape (settles meta-vs-fragmentables). Widened by
 * ticket 07 so threads' citation chrome can render the fragment deep-link; the
 * open tail lets richer consumers extend without a breaking change.
 */
export interface Citation {
    id?: string;
    name?: string;
    authority?: string;
    sectionTitle?: string;
    fragmentId?: string;
    [k: string]: unknown;
}

/** Author identity for display ("people in chat"). Absent ⇒ `role` implies it. */
export interface Participant {
    id: string;
    label?: string;
    kind?: 'user' | 'assistant' | 'visitor' | 'agent';
}

/** Progressive-display marker. `partial` is true while a turn is still streaming. */
export interface StreamState {
    partial: boolean;
    error?: string;
}

/**
 * A rich turn is an ordered segment list — mirrors the server
 * CompletionBlockAccumulator's output. Absent from a message ⇒ render `content`.
 */
export type Segment =
    | { type: 'text'; text: string; body?: BlockdocDoc }
    | { type: 'tool_call'; toolId: string; toolName: string; arguments: unknown }
    | { type: 'tool_result'; toolId: string; toolName: string; result: unknown }
    | { type: 'citation'; id?: string; name?: string };

export interface ChatMessage {
    // ── core (mandatory — the universal floor; lean consumers read ONLY this) ──
    id: string;
    role: Role;
    content: string;
    createdAt?: string;

    // ── capabilities (optional, DECLARED — a consumer opts in) ──
    segments?: Segment[];
    citations?: Citation[];
    author?: Participant;
    streaming?: StreamState;
    meta?: Record<string, unknown>; // escape hatch — declared capabilities NEVER hide here
}
