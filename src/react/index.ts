/**
 * `@schemastud/chat/react` — the view layer: `<ChatView>`, the fixed slot
 * sockets, and the `useChat` hook. Depends on `@schemastud/chat/core` (one-way);
 * consumers of the headless engine never pull this in, and the core never
 * imports React (the `no-react-in-core` guard).
 *
 * CH-04 lands `<ChatView>` + the slot inventory + default render + `useChat`.
 * The four presets + the standard `<Composer>` land in CH-05 as `Partial<ChatSlots>`
 * bundles spread onto `<ChatView>`; the `adjudicationPanel` socket exists here
 * but ships UNFILLED (the `@schemastud/verdict` shell is a separate effort).
 */
import { CHAT_CORE } from '../core/index';

// The React↔core binding.
export type { UseChat, UseChatOptions } from './use-chat';
export { useChat } from './use-chat';

// The slotted view.
export type { ChatViewProps } from './chat-view';
export { ChatView } from './chat-view';

// The fixed slot inventory + composer render-prop contract.
export type { ChatSlots, ComposerApi, RenderSegmentMap, Verdict } from './slots';

// The default render primitives (for presets/hosts that compose on top).
export { renderMessageBody, renderSegment } from './default-render';

/** Package identity marker. The smoke test asserts this trivial symbol. */
export const CHAT_REACT = 'schemastud-chat-react' as const;

/** Proves the ./react → ./core dependency arrow (ADR-0078). */
export const CHAT_CORE_TAG = CHAT_CORE;
