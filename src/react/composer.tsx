/**
 * The standard `<Composer>` (CH-05, PRD §5). This is a PRESET FILL for the flat
 * `composer(api)` slot — deliberately NOT baked into `<ChatView>`. A host that
 * wants a drastically-different input UX (voice, date-picker, the threads
 * 3-tab rich composer) just fills the `composer` slot with something else and
 * nothing else breaks.
 *
 * It is host-agnostic and unstyled beyond stable `data-*` anchors: a controlled
 * text input + a labeled Send button, reflecting `streaming` (disabled while a
 * turn is in flight) and `escalated` (an optional "talk to a human" affordance).
 * No native `<select>` and no app vocabulary — control-heavy choices are left to
 * the host's own fill.
 */
import { type ReactNode, useState } from 'react';
import type { ComposerApi } from './slots';

export interface ComposerProps extends ComposerApi {
    /** Placeholder for the input. Defaults to a neutral prompt. */
    placeholder?: string;
    /** Label on the primary action. Defaults to "Send". */
    sendLabel?: string;
    /**
     * Show a "talk to a human" affordance that calls `requestHuman`. Off by
     * default — the `support` preset turns it on; lean presets leave it off.
     */
    allowRequestHuman?: boolean;
    /** Label on the request-human affordance. Defaults to "Talk to a human". */
    requestHumanLabel?: string;
}

/**
 * The standard composer fill. Bound entirely through the `ComposerApi` a preset
 * hands it (`{ send, requestHuman, streaming, escalated }`), so it is reusable
 * across every preset and every transport.
 */
export function Composer({
    send,
    requestHuman,
    streaming,
    escalated,
    placeholder = 'Type a message…',
    sendLabel = 'Send',
    allowRequestHuman = false,
    requestHumanLabel = 'Talk to a human',
}: ComposerProps): ReactNode {
    const [value, setValue] = useState('');

    const canSend = value.trim().length > 0 && !streaming;

    async function submit(): Promise<void> {
        const content = value.trim();
        if (!content || streaming) {
            return;
        }
        setValue('');
        await send(content);
    }

    return (
        <form
            data-chat-composer-standard
            data-streaming={streaming}
            data-escalated={escalated}
            onSubmit={(event) => {
                event.preventDefault();
                void submit();
            }}
        >
            <label data-chat-composer-label>
                <span data-chat-composer-label-text>Message</span>
                <textarea
                    data-chat-composer-input
                    value={value}
                    placeholder={placeholder}
                    disabled={streaming}
                    onChange={(event) => setValue(event.target.value)}
                    onKeyDown={(event) => {
                        // Enter sends; Shift+Enter inserts a newline.
                        if (event.key === 'Enter' && !event.shiftKey) {
                            event.preventDefault();
                            void submit();
                        }
                    }}
                />
            </label>
            <div data-chat-composer-actions>
                {allowRequestHuman ? (
                    <button
                        type="button"
                        data-chat-composer-request-human
                        disabled={escalated}
                        onClick={() => void requestHuman()}
                    >
                        {requestHumanLabel}
                    </button>
                ) : null}
                <button type="submit" data-chat-composer-send disabled={!canSend}>
                    {sendLabel}
                </button>
            </div>
        </form>
    );
}
