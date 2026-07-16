/**
 * `<ChatView>` — the ONE slotted view (CH-04, PRD §5 Shape 4). It folds the
 * canonical CH-02 snapshot into a message list and exposes the FIXED slot
 * inventory (`slots.ts`) as sockets, with a default render (`default-render.tsx`)
 * for every unfilled slot. It does NOT own the core — a consumer passes a bound
 * `chat` (from `useChat`) so history/hydration stay controlled host-side.
 *
 * A preset (CH-05) is a `{ layout?, slots }` bundle spread onto `<ChatView>`;
 * a host overrides any slot on top (`slots={{ ...preset.slots, messageToolbar }}`).
 * `layout` is a free string the view records as a `data-layout` attribute —
 * mount/chrome CSS is a preset/host concern, not baked into the component.
 */
import type { ReactNode } from 'react';
import type { ChatMessage } from '../core/index';
import { renderMessageBody } from './default-render';
import type { ChatSlots, ComposerApi } from './slots';
import type { UseChat } from './use-chat';

export interface ChatViewProps {
    /** The bound core (from `useChat`). `<ChatView>` reads its snapshot + capabilities. */
    chat: UseChat;
    /** Free layout tag recorded as `data-layout` — chrome CSS is a preset/host concern. */
    layout?: string;
    /** The fixed slot inventory. Any subset; unfilled slots use the default render. */
    slots?: ChatSlots;
}

/** Render one message row: author/role chrome + body + optional per-message toolbar. */
function MessageRow({
    message,
    slots,
}: {
    message: ChatMessage;
    slots: ChatSlots;
}): ReactNode {
    return (
        <div data-chat-message data-role={message.role} data-message-id={message.id}>
            <div data-chat-message-body>{renderMessageBody(message, slots.renderSegment)}</div>
            {message.citations && message.citations.length > 0 && slots.citationChrome ? (
                <div data-chat-citations>{slots.citationChrome(message.citations, message)}</div>
            ) : null}
            {slots.messageToolbar ? <div data-chat-message-toolbar>{slots.messageToolbar(message)}</div> : null}
        </div>
    );
}

export function ChatView({ chat, layout, slots = {} }: ChatViewProps): ReactNode {
    const { snapshot, send, requestHuman } = chat;
    const { messages, roster, escalation, streaming } = snapshot;

    const composerApi: ComposerApi = {
        send: (content: string) => send(content),
        requestHuman: (reason?: string) => requestHuman(reason),
        streaming,
        escalated: escalation !== null,
    };

    // The "who's joining" banner is fed by the most-recently-joined agent/visitor
    // participant when the roster carries a non-user beyond the local user.
    const bannerWho = roster.find((p) => p.kind === 'agent' || p.kind === 'visitor');

    return (
        <div data-chat-view data-layout={layout} data-streaming={streaming} data-escalated={escalation !== null}>
            {slots.header ? <div data-chat-header>{slots.header()}</div> : null}

            {slots.participants && roster.length > 0 ? (
                <div data-chat-participants>{slots.participants(roster)}</div>
            ) : null}

            {slots.participantBanner && bannerWho ? (
                <div data-chat-participant-banner>{slots.participantBanner(bannerWho)}</div>
            ) : null}

            <div data-chat-messages>
                {messages.length === 0 && !streaming
                    ? slots.emptyState
                        ? slots.emptyState()
                        : null
                    : messages.map((message) => <MessageRow key={message.id} message={message} slots={slots} />)}

                {streaming && slots.loadingState ? <div data-chat-loading>{slots.loadingState()}</div> : null}
            </div>

            {escalation && slots.escalatedState ? (
                <div data-chat-escalated>{slots.escalatedState(escalation.reason)}</div>
            ) : null}

            {slots.composer ? <div data-chat-composer>{slots.composer(composerApi)}</div> : null}
        </div>
    );
}
