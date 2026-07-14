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
import type { Citation, Participant } from './envelope';

/** A streamed text delta appended to `content` / the current `text` segment. */
export interface TokenEvent {
    type: 'token';
    messageId: string;
    delta: string;
}

/** A tool invocation; pushes a `tool_call` segment. */
export interface ToolCallEvent {
    type: 'tool_call';
    messageId: string;
    toolId: string;
    toolName: string;
    arguments: unknown;
}

/** A tool result; pushes a `tool_result` segment. */
export interface ToolResultEvent {
    type: 'tool_result';
    messageId: string;
    toolId: string;
    toolName: string;
    result: unknown;
}

/** Citations for a message; sets `citations[]`. */
export interface CitationEvent {
    type: 'citation';
    messageId: string;
    citations: Citation[];
}

/** Session identity (transport/session — not a message field). */
export interface SessionEvent {
    type: 'session';
    session_id: string;
}

/** A "talk to a human" degrade signal (transport/session capability). */
export interface EscalationEvent {
    type: 'escalation';
    reason: string;
    offer?: unknown;
}

/** Multi-party presence, transport-fed (04 constraint). */
export interface RosterEvent {
    type: 'roster';
    participants: Participant[];
    joined?: Participant;
    left?: Participant;
}

/** Finalizes a message; flips `streaming.partial` to false. */
export interface DoneEvent {
    type: 'done';
    messageId: string;
    createdAt?: string;
}

/** A terminal error; sets `streaming.error`. `messageId` optional (may pre-date a turn). */
export interface ErrorEvent {
    type: 'error';
    messageId?: string;
    error: string;
    partial: boolean;
}

/** The canonical chat wire event union. */
export type ChatWireEvent =
    | TokenEvent
    | ToolCallEvent
    | ToolResultEvent
    | CitationEvent
    | SessionEvent
    | EscalationEvent
    | RosterEvent
    | DoneEvent
    | ErrorEvent;

/** The event `type` discriminants, as a runtime tuple (handy for adapters/tests). */
export const CHAT_WIRE_EVENT_TYPES = [
    'token',
    'tool_call',
    'tool_result',
    'citation',
    'session',
    'escalation',
    'roster',
    'done',
    'error',
] as const;

export type ChatWireEventType = (typeof CHAT_WIRE_EVENT_TYPES)[number];
