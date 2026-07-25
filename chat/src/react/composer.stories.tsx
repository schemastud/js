import type { Meta, StoryObj } from '@storybook/react-vite';
import { waitFor, within } from 'storybook/test';
import { ChatView } from './chat-view';
import { Composer } from './composer';
import { support, viewport } from './presets';
import type { ComposerApi } from './slots';
import {
    ChatChrome,
    DEMO_ROSTER,
    fakeChat,
    snapshotOf,
    useScriptedChat,
    type ScriptStep,
} from './story-harness';

/**
 * Chat/Composer (component-seams ticket 20). The STANDARD composer — a PRESET FILL for the
 * flat `composer(api)` slot, deliberately NOT baked into <ChatView> (a host that wants a
 * voice / date-picker / rich composer fills the slot with something else and nothing breaks).
 * A controlled textarea + a Send button, bound entirely through the `ComposerApi` a preset
 * hands it (`{ send, requestHuman, streaming, escalated }`). Headless: stable `data-chat-
 * composer-*` anchors, styled here by the non-shipped `ChatChrome`.
 *
 * TREATMENT axes (treatment-axes.md):
 *  - **states** DOMINATES (as ticket 20 anticipated): Idle (Send disabled until non-empty) /
 *    Streaming (input + Send disabled while a turn is in flight) / RequestHuman (the
 *    `allowRequestHuman` affordance the `support` preset turns on) / Escalated (the
 *    request-human button disables once escalated). One story per state.
 *  - The `Streaming` affordance is ALSO catalogued live — `StreamingLive` binds a real core
 *    to a scripted transport that emits tokens on a timer, and its `play` awaits the settled
 *    turn so a future VR baseline captures the FINISHED conversation, never a mid-stream
 *    token flash (the streaming-async obligation in the ticket).
 *
 * Rule of sanction — axes NOT exposed, recorded so "storied" is honest: **variant / size /
 * tone / density / canvas / viewport** — the composer is a single unstyled input+button
 * surface with no such props (label/placeholder/send-label are content strings, not a
 * sanctioned enum axis). Absent = absent-not-a-gap.
 *
 * Ambient token + light⊗dark inherited from the workbench (ticket 14); all chrome is
 * semantic-token, re-skins under `.dark`, no ticket-32 hex debt.
 */
const meta = {
    title: 'Chat/Composer',
    parameters: { layout: 'padded' },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

// A static ComposerApi at a given state — the composer reads only these four flags.
function api(overrides: Partial<ComposerApi> = {}): ComposerApi {
    return {
        send: async () => {},
        requestHuman: async () => {},
        streaming: false,
        escalated: false,
        ...overrides,
    };
}

/** Idle: an empty controlled input; Send is disabled until the user types (rendered here
 *  in its initial empty state — the disabled-Send is the settled representation). */
export const Idle: Story = {
    render: () => (
        <ChatChrome>
            <Composer {...api()} />
        </ChatChrome>
    ),
};

/** Streaming (static): a turn is in flight — the input and Send are both disabled. */
export const Streaming: Story = {
    render: () => (
        <ChatChrome>
            <Composer {...api({ streaming: true })} />
        </ChatChrome>
    ),
};

/** RequestHuman: the `allowRequestHuman` affordance on (the `support` preset's shape) —
 *  a "Talk to a human" button beside Send. */
export const RequestHuman: Story = {
    render: () => (
        <ChatChrome>
            <Composer {...api()} allowRequestHuman placeholder="Message support…" />
        </ChatChrome>
    ),
};

/** Escalated: a human is already joining — the request-human button disables. */
export const Escalated: Story = {
    render: () => (
        <ChatChrome>
            <Composer {...api({ escalated: true })} allowRequestHuman placeholder="Message support…" />
        </ChatChrome>
    ),
};

// ── The live streaming affordance ────────────────────────────────────────────────
// Drives a REAL core through a scripted transport so the streaming affordance is
// catalogued end-to-end. The `play` awaits the settled turn: VR captures the finished
// conversation, never a mid-stream flash. This is the deliberate "park a streaming story"
// the ticket calls for — expressed as a settled outcome, not an in-flight one.
const SCRIPT: ScriptStep[] = [
    { event: { type: 'token', messageId: 'live1', delta: 'Provisioning ' }, delayMs: 40 },
    { event: { type: 'token', messageId: 'live1', delta: 'builds the schema ' }, delayMs: 40 },
    { event: { type: 'token', messageId: 'live1', delta: 'and seeds it. Verify at the subdomain.' }, delayMs: 40 },
    { event: { type: 'done', messageId: 'live1' }, delayMs: 20 },
];

function LiveStreamingDemo() {
    const chat = useScriptedChat(SCRIPT);
    return (
        <ChatChrome>
            <ChatView chat={chat} {...viewport} />
        </ChatChrome>
    );
}

export const StreamingLive: Story = {
    render: () => <LiveStreamingDemo />,
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        // Type into the real composer and send — the scripted transport streams the reply.
        const input = canvas.getByRole('textbox');
        const send = canvas.getByText('Send');
        (input as HTMLTextAreaElement).focus();
        // Fire a send by filling the value + clicking (the composer sends non-empty content).
        // Use fireEvent-style via userEvent-free path to keep it deterministic.
        (input as HTMLTextAreaElement).value = 'How do I provision a tenant?';
        input.dispatchEvent(new Event('input', { bubbles: true }));
        // React controls the value; set via the native setter so React sees the change.
        const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')?.set;
        setter?.call(input, 'How do I provision a tenant?');
        input.dispatchEvent(new Event('input', { bubbles: true }));
        send.click();
        // Await the SETTLED turn: the full streamed sentence has arrived and streaming ended.
        await waitFor(
            () => {
                if (!canvasElement.textContent?.includes('Verify at the subdomain.')) {
                    throw new Error('not settled yet');
                }
            },
            { timeout: 3000 },
        );
    },
};

/** The composer in situ inside the `support` preset — proves the api wiring end to end
 *  (roster + banner-less, escalation-ready), a settled render for the catalog. */
export const InSupportView: Story = {
    render: () => (
        <ChatChrome>
            <ChatView chat={fakeChat(snapshotOf({ roster: DEMO_ROSTER }))} {...support} />
        </ChatChrome>
    ),
};
