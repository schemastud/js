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
import type { RenderSegmentMap } from './slots';

/** Render one segment: a slot override for its `type` wins, else the built-in. */
export function renderSegment(
    segment: Segment,
    message: ChatMessage,
    overrides: RenderSegmentMap | undefined,
    key: number,
): ReactNode {
    const override = overrides?.[segment.type];
    if (override) {
        // Each map entry is typed to its own segment variant; the union call is safe.
        return (
            <div data-chat-segment={segment.type} key={key}>
                {(override as (s: Segment, m: ChatMessage) => ReactNode)(segment, message)}
            </div>
        );
    }
    return (
        <div data-chat-segment={segment.type} key={key}>
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
 */
export function renderMessageBody(
    message: ChatMessage,
    segmentOverrides: RenderSegmentMap | undefined,
): ReactNode {
    if (message.segments && message.segments.length > 0) {
        return (
            <div data-chat-segments>
                {message.segments.map((segment, index) => renderSegment(segment, message, segmentOverrides, index))}
            </div>
        );
    }
    return <div data-chat-content>{message.content}</div>;
}
