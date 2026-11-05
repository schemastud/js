/**
 * Default envelope + segment render — what `<ChatView>` draws when a slot is
 * unfilled. Deliberately minimal and unstyled (data-attributes, no CSS): the
 * package is a HEADLESS substrate; chrome/styling belong to presets (CH-05) and
 * host fills. A lean consumer that reads only `content` gets a correct message
 * list with zero configuration; a rich consumer overrides the slots.
 *
 * Envelope rule (04): a message with no `segments` renders flat `content`; a
 * message WITH `segments` renders the interleaved segment list. blockdoc reaches
 * the view ONLY as a `text` segment `body` (an optional peerDep render) — never
 * as the spine; the default text renderer shows `text` and leaves `body` to a
 * `renderSegment.text` override that owns the peerDep.
 */
import type { ReactNode } from 'react';
import type { ChatMessage, Segment } from '../core/index';
import type { MessageMetaApi, RenderSegmentMap } from './slots';

/** Render one segment: a slot override for its `type` wins, else the built-in. */
export function renderSegment(
    segment: Segment,
    message: ChatMessage,
    overrides: RenderSegmentMap | undefined,
    key: number,
    tail = false,
): ReactNode {
    const override = overrides?.[segment.type];
    if (override) {
        // Each map entry is typed to its own segment variant; the union call is safe.
        return (
            <div data-chat-segment={segment.type} data-chat-tail={tail || undefined} key={key}>
                {(override as (s: Segment, m: ChatMessage) => ReactNode)(segment, message)}
            </div>
        );
    }
    return (
        <div data-chat-segment={segment.type} data-chat-tail={tail || undefined} key={key}>
            {defaultSegment(segment)}
        </div>
    );
}

/** The built-in per-segment render (used when no `renderSegment[type]` override). */
function defaultSegment(segment: Segment): ReactNode {
    switch (segment.type) {
        case 'text':
            // `body` (blockdoc) is intentionally not rendered here — that needs the
            // optional peerDep, so it's left to a `renderSegment.text` override.
            return <span data-chat-text>{segment.text}</span>;
        case 'tool_call':
            return (
                <div data-chat-tool-call data-tool-name={segment.toolName}>
                    {segment.toolName}({JSON.stringify(segment.arguments)})
                </div>
            );
        case 'tool_result':
            return (
                <div data-chat-tool-result data-tool-name={segment.toolName}>
                    {JSON.stringify(segment.result)}
                </div>
            );
        case 'citation':
            return <span data-chat-citation-segment>{segment.name ?? segment.id ?? 'citation'}</span>;
        default: {
            const _exhaustive: never = segment;
            void _exhaustive;
            return null;
        }
    }
}

/**
 * Render a message body: interleaved segments when present, else flat `content`.
 * This is the envelope's core rule — lean consumers never author segments and
 * get `content`; rich consumers stream segments.
 *
 * While `streaming`, the element the live caret follows is marked `data-chat-tail`:
 * the flat `[data-chat-content]`, or the trailing segment when it is `text`. A
 * trailing tool call gets no tail, so no caret is drawn after a tool card.
 */
export function renderMessageBody(
    message: ChatMessage,
    segmentOverrides: RenderSegmentMap | undefined,
    streaming = false,
): ReactNode {
    if (message.segments && message.segments.length > 0) {
        const last = message.segments.length - 1;
        const textTail = streaming && message.segments[last].type === 'text';
        return (
            <div data-chat-segments>
                {message.segments.map((segment, index) =>
                    renderSegment(segment, message, segmentOverrides, index, textTail && index === last),
                )}
            </div>
        );
    }
    return <div data-chat-content data-chat-tail={streaming || undefined}>{message.content}</div>;
}

/** The display label a turn falls back to when it carries no `author`. */
const ROLE_LABEL: Record<ChatMessage['role'], string> = {
    user: 'You',
    assistant: 'Assistant',
    system: 'System',
};

/** Up to two initials for an author mark. */
export function initials(label: string): string {
    return label
        .split(/\s+/)
        .filter(Boolean)
        .map((w) => w[0])
        .slice(0, 2)
        .join('')
        .toUpperCase();
}

/** Stable grouping key: the author id when declared, else the role. */
export function authorKey(message: ChatMessage): string {
    return message.author?.id ?? `role:${message.role}`;
}

/** Format an ISO timestamp as a short local clock time (date prefix when not today). */
export function formatMessageTime(iso: string, now: Date = new Date()): string {
    const at = new Date(iso);
    if (Number.isNaN(at.getTime())) return '';
    const sameDay = at.toDateString() === now.toDateString();
    const time = new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' }).format(at);
    if (sameDay) return time;
    const day = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(at);
    return `${day}, ${time}`;
}

/**
 * The default identity line for a `messageMeta` fill: author label + a
 * `<time>` when the envelope carries `createdAt`, and an initials mark
 * (`[data-chat-avatar]`) on non-user turns under `identity="avatar"`.
 * Unstyled anchors only. A streaming turn adds nothing here: the row's
 * `data-streaming` / `aria-busy` and the caret tail carry that state.
 */
export function renderMessageMeta(message: ChatMessage, api: MessageMetaApi): ReactNode {
    const label = message.author?.label ?? ROLE_LABEL[message.role];
    return (
        <>
            {api.identity === 'avatar' && message.role !== 'user' ? (
                <span data-chat-avatar aria-hidden>
                    {initials(label)}
                </span>
            ) : null}
            <span data-chat-author data-kind={message.author?.kind ?? message.role}>
                {label}
            </span>
            {message.createdAt ? (
                <time data-chat-time dateTime={message.createdAt}>
                    {formatMessageTime(message.createdAt)}
                </time>
            ) : null}
        </>
    );
}
