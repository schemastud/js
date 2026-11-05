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
import { useCallback, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import type { ChatMessage } from '../core/index';
import { authorKey, renderMessageBody } from './default-render';
import type { ChatFrame, ChatIdentity, ChatSlots, ComposerApi } from './slots';
import type { UseChat } from './use-chat';

export interface ChatViewProps {
    /** The bound core (from `useChat`). `<ChatView>` reads its snapshot + capabilities. */
    chat: UseChat;
    /** Free layout tag recorded as `data-layout` — chrome CSS is a preset/host concern. */
    layout?: string;
    /** The fixed slot inventory. Any subset; unfilled slots use the default render. */
    slots?: ChatSlots;
    /**
     * Keep the message list anchored to the latest turn while the reader is at
     * (or near) the bottom, and offer `jumpToLatest` when they have scrolled up.
     * Acts on `[data-chat-messages]` when the host makes it the scroll container.
     * Default true.
     */
    follow?: boolean;
    /**
     * How turns show their author: `byline` (default) or `avatar` (gutter mark + byline).
     * Recorded as `data-identity`; passed to `messageMeta` fills.
     */
    identity?: ChatIdentity;
    /**
     * `bleed` (default): edge to edge in its container, turns and composer in one centred
     * column. `contained`: the view draws its own box. Recorded as `data-frame`.
     */
    frame?: ChatFrame;
}

/** How close to the end (px) still counts as "at the latest turn". */
const FOLLOW_SLACK = 48;

/** Stick-to-bottom for the message list: follow new content unless the reader scrolled away. */
function useFollow(enabled: boolean, signature: string) {
    const ref = useRef<HTMLDivElement>(null);
    const atEnd = useRef(true);
    const [away, setAway] = useState(false);
    const [unseen, setUnseen] = useState(false);

    const onScroll = useCallback(() => {
        const el = ref.current;
        if (!el) return;
        const end = el.scrollHeight - el.scrollTop - el.clientHeight <= FOLLOW_SLACK;
        atEnd.current = end;
        setAway(!end);
        if (end) setUnseen(false);
    }, []);

    useLayoutEffect(() => {
        const el = ref.current;
        if (!enabled || !el) return;
        if (atEnd.current) el.scrollTop = el.scrollHeight;
        else setUnseen(true);
    }, [enabled, signature]);

    const jump = useCallback(() => {
        const el = ref.current;
        if (!el) return;
        const reduce = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
        el.scrollTo({ top: el.scrollHeight, behavior: reduce ? 'auto' : 'smooth' });
    }, []);

    return { ref, onScroll: enabled ? onScroll : undefined, away: enabled && away, unseen, jump };
}

/** The latest non-user turn of a settled thread: its actions stay shown (item 2A). */
function latestReplyId(messages: ChatMessage[], streaming: boolean): string | undefined {
    if (streaming) return undefined;
    for (let i = messages.length - 1; i >= 0; i--) {
        if (messages[i].role !== 'user') return messages[i].id;
    }
    return undefined;
}

/** Render one message row: author/role chrome + body + optional per-message toolbar. */
function MessageRow({
    message,
    previous,
    latest,
    slots,
    identity,
}: {
    message: ChatMessage;
    previous: ChatMessage | undefined;
    latest: boolean;
    slots: ChatSlots;
    identity: ChatIdentity;
}): ReactNode {
    // A run is consecutive turns by the same author: the identity shows once per run.
    const continued = previous !== undefined && authorKey(previous) === authorKey(message);
    const streaming = message.streaming?.partial === true;
    return (
        <div
            data-chat-message
            data-role={message.role}
            data-message-id={message.id}
            data-continued={continued || undefined}
            data-streaming={streaming || undefined}
            data-latest={latest || undefined}
            aria-busy={streaming || undefined}
        >
            {slots.messageMeta ? (
                <div data-chat-message-meta>{slots.messageMeta(message, { continued, streaming, identity })}</div>
            ) : null}
            <div data-chat-message-body>{renderMessageBody(message, slots.renderSegment, streaming)}</div>
            {message.citations && message.citations.length > 0 && slots.citationChrome ? (
                <div data-chat-citations>{slots.citationChrome(message.citations, message)}</div>
            ) : null}
            {slots.messageToolbar ? <div data-chat-message-toolbar>{slots.messageToolbar(message)}</div> : null}
        </div>
    );
}

export function ChatView({ chat, layout, slots = {}, follow = true, identity = 'byline', frame = 'bleed' }: ChatViewProps): ReactNode {
    const { snapshot, send, requestHuman } = chat;
    const { messages, roster, escalation, streaming } = snapshot;

    // What "new content" means for anchoring: a turn added, or the trailing turn growing.
    const last = messages[messages.length - 1];
    const signature = `${messages.length}:${last?.content.length ?? 0}:${last?.segments?.length ?? 0}:${streaming}`;
    const list = useFollow(follow, signature);
    const latestId = latestReplyId(messages, streaming);

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
        <div data-chat-view data-layout={layout} data-frame={frame} data-identity={identity} data-streaming={streaming} data-escalated={escalation !== null}>
            {slots.header ? <div data-chat-header>{slots.header()}</div> : null}

            {slots.participants && roster.length > 0 ? (
                <div data-chat-participants>{slots.participants(roster)}</div>
            ) : null}

            {slots.participantBanner && bannerWho ? (
                <div data-chat-participant-banner>{slots.participantBanner(bannerWho)}</div>
            ) : null}

            <div data-chat-messages ref={list.ref} onScroll={list.onScroll} data-following={follow ? !list.away : undefined}>
                {messages.length === 0 && !streaming
                    ? slots.emptyState
                        ? slots.emptyState()
                        : null
                    : messages.map((message, index) => (
                          <MessageRow
                              key={message.id}
                              message={message}
                              previous={messages[index - 1]}
                              latest={message.id === latestId}
                              slots={slots}
                              identity={identity}
                          />
                      ))}

                {streaming && slots.loadingState ? <div data-chat-loading>{slots.loadingState()}</div> : null}
            </div>

            {list.away ? (
                <div data-chat-jump>
                    {slots.jumpToLatest ? (
                        slots.jumpToLatest({ jump: list.jump, unseen: list.unseen })
                    ) : (
                        <button type="button" data-chat-jump-latest onClick={list.jump}>
                            {list.unseen ? 'New messages' : 'Jump to latest'}
                        </button>
                    )}
                </div>
            ) : null}

            {escalation && slots.escalatedState ? (
                <div data-chat-escalated>{slots.escalatedState(escalation.reason)}</div>
            ) : null}

            {slots.composer ? <div data-chat-composer>{slots.composer(composerApi)}</div> : null}
        </div>
    );
}
