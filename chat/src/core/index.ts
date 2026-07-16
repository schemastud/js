/**
 * `@schemastud/chat/core` — the headless, framework-agnostic chat state
 * machine. Owns the message envelope, the canonical wire event union, the
 * streaming fold engine, roster (core state), transport binding, and session
 * capabilities.
 *
 * This is the ONE canonical read-model every downstream consumer folds (CH-03
 * embed adapter, CH-04 <ChatView>, CH-05 presets, CH-08 Threads, CH-09 numero,
 * CH-10 showcase). Nothing here imports React or any view framework — that
 * separation is asserted by tests/no-react-in-core.test.ts.
 */

// The message envelope (KEYSTONE — ADR-0079 §envelope, PRD §3).
export type {
    BlockdocDoc,
    ChatMessage,
    Citation,
    Participant,
    Role,
    Segment,
    StreamState,
} from './envelope';

// The canonical SSE event union (ADR-0079 §transport, PRD §4).
export type {
    ChatWireEvent,
    ChatWireEventType,
    CitationEvent,
    DoneEvent,
    ErrorEvent,
    EscalationEvent,
    RosterEvent,
    SessionEvent,
    TokenEvent,
    ToolCallEvent,
    ToolResultEvent,
} from './wire';
export { CHAT_WIRE_EVENT_TYPES } from './wire';

// The transport contract + SSE frame reader.
export type { ChatTransport, ChatWireAdapter, SseFrame } from './transport';
export { readSse } from './transport';

// The fold engine (pure reducer + snapshot).
export type { ChatSnapshot, EscalationState } from './fold';
export { emptySnapshot, foldAll, foldEvent, hydrate } from './fold';

// The stateful store a consumer subscribes to.
export type { ChatCore, ChatCoreOptions, SendOptions } from './store';
export { createChatCore } from './store';

/** Package identity marker. The smoke test asserts this trivial export. */
export const CHAT_CORE = 'schemastud-chat-core' as const;
