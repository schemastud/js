export { B as BlockdocDoc, C as ChatMessage, a as Citation, P as Participant, R as Role, S as Segment, b as StreamState } from './envelope-C2h6ajnL.js';
export { C as CHAT_WIRE_EVENT_TYPES, a as ChatCore, b as ChatCoreOptions, c as ChatSnapshot, d as ChatTransport, e as ChatWireAdapter, f as ChatWireEvent, g as ChatWireEventType, h as CitationEvent, D as DoneEvent, E as ErrorEvent, i as EscalationEvent, j as EscalationState, R as RosterEvent, S as SendOptions, k as SessionEvent, l as SseFrame, T as TokenEvent, m as ToolCallEvent, n as ToolResultEvent, o as createChatCore, p as emptySnapshot, q as foldAll, r as foldEvent, s as hydrate, t as readSse } from './store-Ca9EVsm9.js';

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

/** Package identity marker. The smoke test asserts this trivial export. */
declare const CHAT_CORE: "schemastud-chat-core";

export { CHAT_CORE };
