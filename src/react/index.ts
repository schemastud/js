/**
 * `@schemastud/chat/react` — the view layer: `<ChatView>`, the fixed slot
 * sockets, and the `useChat` hook. Depends on `@schemastud/chat/core` (one-way);
 * consumers of the headless engine never pull this in, and the core never
 * imports React (the `no-react-in-core` guard).
 *
 * CH-04 lands `<ChatView>` + the slot inventory + default render + `useChat`.
 * CH-05 adds the four presets + the standard `<Composer>` as `Partial<ChatSlots>`
 * bundles spread onto `<ChatView>`; the `adjudicationPanel` socket exists here
 * and the `viewport` preset WIRES it but ships it UNFILLED (the
 * `@schemastud/verdict` shell is a separate effort).
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

// The standard <Composer> — a PRESET FILL for the flat `composer(api)` slot,
// never baked into <ChatView>; swapping it out is a one-slot override.
export type { ComposerProps } from './composer';
export { Composer } from './composer';

// The four named presets — plain-code `{ layout?, slots }` bundles a host
// spreads onto <ChatView> and overrides any slot on top of.
export type { ChatPreset } from './presets';
export { popover, presets, siteAsk, support, viewport } from './presets';

/** Package identity marker. The smoke test asserts this trivial symbol. */
export const CHAT_REACT = 'schemastud-chat-react' as const;

/** Proves the ./react → ./core dependency arrow (ADR-0078). */
export const CHAT_CORE_TAG = CHAT_CORE;
