/**
 * `@schemastud/chat/core` — the headless, framework-agnostic chat state
 * machine. Owns the message envelope, streaming fold, roster, transport
 * binding, and session capabilities.
 *
 * SCAFFOLD (CH-01): this is the empty-but-real keystone. The message envelope,
 * wire union, and fold engine land in CH-02. Nothing here imports React or any
 * view framework — that separation is asserted by tests/no-react-in-core.test.ts.
 */

/** Package identity marker. The smoke test asserts this trivial export. */
export const CHAT_CORE = 'schemastud-chat-core' as const;
