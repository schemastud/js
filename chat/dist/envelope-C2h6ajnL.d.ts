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
type Role = 'user' | 'assistant' | 'system';
/** A blockdoc doc JSON; typed via the @schemastud/blockdoc peerDep when present. */
type BlockdocDoc = unknown;
/**
 * ONE canonical citation shape (settles meta-vs-fragmentables). Widened by
 * ticket 07 so threads' citation chrome can render the fragment deep-link; the
 * open tail lets richer consumers extend without a breaking change.
 */
interface Citation {
    id?: string;
    name?: string;
    authority?: string;
    sectionTitle?: string;
    fragmentId?: string;
    [k: string]: unknown;
}
/** Author identity for display ("people in chat"). Absent ⇒ `role` implies it. */
interface Participant {
    id: string;
    label?: string;
    kind?: 'user' | 'assistant' | 'visitor' | 'agent';
}
/** Progressive-display marker. `partial` is true while a turn is still streaming. */
interface StreamState {
    partial: boolean;
    error?: string;
}
/**
 * A rich turn is an ordered segment list — mirrors the server
 * CompletionBlockAccumulator's output. Absent from a message ⇒ render `content`.
 */
type Segment = {
    type: 'text';
    text: string;
    body?: BlockdocDoc;
} | {
    type: 'tool_call';
    toolId: string;
    toolName: string;
    arguments: unknown;
} | {
    type: 'tool_result';
    toolId: string;
    toolName: string;
    result: unknown;
} | {
    type: 'citation';
    id?: string;
    name?: string;
};
interface ChatMessage {
    id: string;
    role: Role;
    content: string;
    createdAt?: string;
    segments?: Segment[];
    citations?: Citation[];
    author?: Participant;
    streaming?: StreamState;
    /**
     * The INTENTIONAL reply edge — "this message replies to that one". The one
     * axis a forum/board render needs and linear chat ignores; absent on every
     * message in a flat conversation, which is why it is a capability rather
     * than core.
     *
     * It is deliberately NOT the edit/regeneration edge. The server keeps three
     * self-references on `beam_thread_messages` — `parent_id` and
     * `selected_child_id` form the edit/regen variant tree, `reply_to_id` is
     * this one — and only the reply edge is a fact about the CONVERSATION. A
     * consumer that folds variants is reading a different graph and must not
     * borrow this field for it.
     *
     * The reducer never mints it: it arrives with durable history through
     * `hydrate(seed)`, so nesting costs `foldEvent` nothing. See
     * `@schemastud/chat/thread` for the derived tree over it.
     */
    replyToId?: string;
    meta?: Record<string, unknown>;
}

export type { BlockdocDoc as B, ChatMessage as C, Participant as P, Role as R, Segment as S, Citation as a, StreamState as b };
