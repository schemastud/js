import { a as Citation, P as Participant, C as ChatMessage, R as Role } from './envelope-C2h6ajnL.js';

/**
 * The canonical SSE event union — THE chat wire (ADR-0079 §"The transport",
 * PRD §4). One pinned vocabulary that every per-wire adapter satisfies; it is
 * NOT an emission mandate on the shipped servers. The core folds an
 * `AsyncIterable<ChatWireEvent>` into envelope snapshots.
 *
 * Events are correlated to an envelope by `messageId`. `roster` and `citation`
 * are declared-but-not-yet-emitted on the two live wires (named now because 04
 * made the roster core and 01 flagged the citation mismatch).
 *
 * Downstream consumers (CH-03/04/05/08/09/10) fold THIS union — do not redefine
 * the vocabulary.
 */

/** A streamed text delta appended to `content` / the current `text` segment. */
interface TokenEvent {
    type: 'token';
    messageId: string;
    delta: string;
}
/** A tool invocation; pushes a `tool_call` segment. */
interface ToolCallEvent {
    type: 'tool_call';
    messageId: string;
    toolId: string;
    toolName: string;
    arguments: unknown;
}
/** A tool result; pushes a `tool_result` segment. */
interface ToolResultEvent {
    type: 'tool_result';
    messageId: string;
    toolId: string;
    toolName: string;
    result: unknown;
}
/** Citations for a message; sets `citations[]`. */
interface CitationEvent {
    type: 'citation';
    messageId: string;
    citations: Citation[];
}
/** Session identity (transport/session — not a message field). */
interface SessionEvent {
    type: 'session';
    session_id: string;
}
/** A "talk to a human" degrade signal (transport/session capability). */
interface EscalationEvent {
    type: 'escalation';
    reason: string;
    offer?: unknown;
}
/** Multi-party presence, transport-fed (04 constraint). */
interface RosterEvent {
    type: 'roster';
    participants: Participant[];
    joined?: Participant;
    left?: Participant;
}
/** Finalizes a message; flips `streaming.partial` to false. */
interface DoneEvent {
    type: 'done';
    messageId: string;
    createdAt?: string;
}
/** A terminal error; sets `streaming.error`. `messageId` optional (may pre-date a turn). */
interface ErrorEvent {
    type: 'error';
    messageId?: string;
    error: string;
    partial: boolean;
}
/** The canonical chat wire event union. */
type ChatWireEvent = TokenEvent | ToolCallEvent | ToolResultEvent | CitationEvent | SessionEvent | EscalationEvent | RosterEvent | DoneEvent | ErrorEvent;
/** The event `type` discriminants, as a runtime tuple (handy for adapters/tests). */
declare const CHAT_WIRE_EVENT_TYPES: readonly ["token", "tool_call", "tool_result", "citation", "session", "escalation", "roster", "done", "error"];
type ChatWireEventType = (typeof CHAT_WIRE_EVENT_TYPES)[number];

/**
 * The transport contract (ADR-0079 §"The transport", PRD §4). The transport
 * starts from the shipped embed shape (`send(payload, headers?) → Response`);
 * a per-wire ADAPTER turns each `Response` (SSE stream OR JSON body) into an
 * `AsyncIterable<ChatWireEvent>` of the canonical union, which the core folds
 * into the envelope. The core stays wire-agnostic — it never talks to a
 * hardcoded endpoint and never parses a wire format itself; the adapter does.
 */

/** A parsed Server-Sent Event frame: the event name + its (JSON-or-string) data. */
interface SseFrame {
    event: string;
    data: unknown;
}
/**
 * Turns a `Response` into the canonical event stream the core folds. Each
 * transport binds its own adapter; the SSE frame reader below (`readSse`) is
 * the shared primitive most stream adapters build on.
 */
type ChatWireAdapter = (response: Response) => AsyncIterable<ChatWireEvent>;
interface ChatTransport {
    /** Wire identity: 'threads' | 'direct' | 'satellite' | 'numero' | … */
    kind: string;
    /** The SHIPPED shape: post a payload, get a Response (SSE stream or JSON body). */
    send(payload: unknown, headers?: Record<string, string>): Promise<Response>;
    /**
     * Turns each `send` Response into the canonical event union. Optional so a
     * transport may instead expose a plain `send` and let the core apply a
     * default adapter, but a transport that speaks a bespoke wire supplies its
     * own here.
     */
    adapt?: ChatWireAdapter;
}
/** Parse a `text/event-stream` Response body into `{ event, data }` frames. */
declare function readSse(response: Response): AsyncGenerator<SseFrame>;

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

/** Session-scoped escalation state (transport/session capability, not a message field). */
interface EscalationState {
    reason: string;
    offer?: unknown;
}
/** The folded read-model a consumer renders. New references along changed paths only. */
interface ChatSnapshot {
    messages: ChatMessage[];
    roster: Participant[];
    sessionId: string | null;
    escalation: EscalationState | null;
    /** True while a core send is in flight or any message is still streaming (`streaming.partial`). */
    streaming: boolean;
}
/** A blank snapshot. */
declare function emptySnapshot(): ChatSnapshot;
/**
 * Hydrate a snapshot from a history seed (the `initialMessages` hydration seam).
 * Seeded messages are finalized (never `streaming.partial`) unless they carry
 * their own `streaming` marker.
 */
declare function hydrate(seed: ChatMessage[]): ChatSnapshot;
/**
 * The pure fold reducer. Folds one canonical wire event into the snapshot.
 * Unknown message ids mint a streaming assistant turn; duplicates and
 * post-terminal events are absorbed idempotently.
 */
declare function foldEvent(snapshot: ChatSnapshot, event: ChatWireEvent): ChatSnapshot;
/** Fold an entire event iterable into a final snapshot (test/replay convenience). */
declare function foldAll(start: ChatSnapshot, events: AsyncIterable<ChatWireEvent> | Iterable<ChatWireEvent>): Promise<ChatSnapshot>;

/**
 * The chat core store — the stateful engine a consumer subscribes to. Binds a
 * `ChatTransport`, folds each `send` Response into snapshots via the pure
 * reducer (fold.ts), and exposes the session capabilities (`requestHuman`) that
 * stay inert unless a transport drives them.
 *
 * This is the extraction of the 148-LOC dep-free embed-chat core, born-correct:
 * the full §3 envelope, roster as CORE, the 06-union parser, `initialMessages`
 * hydration, and a reconcile-able `done`. Framework-agnostic — no React here.
 */

interface ChatCoreOptions {
    transport: ChatTransport;
    /** History seed — the hybrid controlled-core hydration seam (ticket 08). */
    initialMessages?: ChatMessage[];
    /** Mint an id for a user turn / a fresh assistant turn. Deterministic override for tests. */
    generateId?: () => string;
}
interface SendOptions {
    /** Extra request headers passed through to `transport.send`. */
    headers?: Record<string, string>;
    /** Role of the outgoing turn. Defaults to 'user'. */
    role?: Role;
}
interface ChatCore {
    /** Subscribe to snapshots; returns an unsubscribe. Fires immediately with the current snapshot. */
    subscribe(fn: (snapshot: ChatSnapshot) => void): () => void;
    /** The current snapshot (immutable read-model). */
    getSnapshot(): ChatSnapshot;
    /** Re-seed history (re-hydrate the controlled core). Emits a snapshot. */
    hydrate(seed: ChatMessage[]): void;
    /** Send a turn; streams the response through the fold engine. */
    send(content: string, options?: SendOptions): Promise<void>;
    /** Session capability: signal "talk to a human". Inert unless the transport routes it. */
    requestHuman(contact?: unknown, consent?: boolean): Promise<void>;
}
declare function createChatCore(options: ChatCoreOptions): ChatCore;

export { CHAT_WIRE_EVENT_TYPES as C, type DoneEvent as D, type ErrorEvent as E, type RosterEvent as R, type SendOptions as S, type TokenEvent as T, type ChatCore as a, type ChatCoreOptions as b, type ChatSnapshot as c, type ChatTransport as d, type ChatWireAdapter as e, type ChatWireEvent as f, type ChatWireEventType as g, type CitationEvent as h, type EscalationEvent as i, type EscalationState as j, type SessionEvent as k, type SseFrame as l, type ToolCallEvent as m, type ToolResultEvent as n, createChatCore as o, emptySnapshot as p, foldAll as q, foldEvent as r, hydrate as s, readSse as t };
