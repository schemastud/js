import type { Meta, StoryObj } from '@storybook/react-vite';
import { ChatView } from './chat-view';
import { popover, siteAsk, support, viewport } from './presets';
import {
    ChatChrome,
    DEMO_ESCALATION,
    DEMO_MESSAGES,
    DEMO_ROSTER,
    DEMO_ROSTER_WITH_AGENT,
    fakeChat,
    snapshotOf,
} from './story-harness';

/**
 * Chat/ChatView (component-seams ticket 20). The ONE slotted view (CH-04, PRD §5 "Shape 4")
 * — it folds the canonical chat snapshot into a message list and exposes the FIXED slot
 * inventory as sockets, defaulting every unfilled slot. It is HEADLESS: it renders only
 * stable `data-chat-*` anchors and injects no design-system primitive set, so the catalog
 * supplies a thin non-shipped `ChatChrome` (story-harness) that maps those anchors onto
 * semantic-token classes — exactly the "host owns the styling" contract the package documents.
 *
 * TREATMENT axes (treatment-axes.md):
 *  - **states** DOMINATES this state-rich surface (as ticket 20 anticipated): Empty /
 *    Populated / Streaming (loading slot) / Escalated / plus the segment-rich turn
 *    (tool_call + tool_result + citations). One story per fold state.
 *  - **variant** — the FOUR named presets (viewport / popover / siteAsk / support) are the
 *    sanctioned variant matrix of this one view (each is a `{ layout, slots }` bundle spread
 *    onto the SAME <ChatView>). `Presets` catalogs all four side by side; `AsPopover` /
 *    `SiteAsk` / `Support` give each its own settled entry. The layout tag lands as
 *    `data-layout`, which the chrome keys mount width off.
 *  - **viewport** — `Popover` carries a mobile parameter (it is the responsive mount whose
 *    width visibly collapses); the full-viewport threads surface is desktop-first.
 *
 * Rule of sanction — axes NOT exposed, recorded so "storied" is honest: **size / tone /
 * density** (no such props — a message list, not a control or a collection with row density);
 * **canvas** (chat mounts inside a card/popover, not on a flat/dotted desk main-region —
 * that decorator belongs to the shell surfaces, not this leaf view). Absent = absent-not-a-gap.
 *
 * Ambient token + light⊗dark are inherited from the workbench (ticket 14) — the chrome uses
 * only semantic tokens (`--card`/`--primary`/`--muted-foreground`/…) so the whole surface
 * re-skins under `.dark`; no ticket-32 hardcoded-hex debt here.
 */
const meta = {
    title: 'Chat/ChatView',
    parameters: { layout: 'padded' },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

// ── States ──────────────────────────────────────────────────────────────────────

/** Empty: no messages, not streaming — the preset's `emptyState` fill shows. */
export const Empty: Story = {
    render: () => (
        <ChatChrome>
            <ChatView chat={fakeChat(snapshotOf({ roster: DEMO_ROSTER }))} {...viewport} />
        </ChatChrome>
    ),
};

/** Populated: a full thread — flat-content turns AND a segment-rich turn (tool + citations). */
export const Populated: Story = {
    render: () => (
        <ChatChrome>
            <ChatView
                chat={fakeChat(snapshotOf({ messages: DEMO_MESSAGES, roster: DEMO_ROSTER }))}
                {...viewport}
                slots={{
                    ...viewport.slots,
                    citationChrome: (citations) => (
                        <span>{citations.map((c) => c.name ?? c.id).join(' · ')}</span>
                    ),
                }}
            />
        </ChatChrome>
    ),
};

/** Streaming (static): the trailing assistant turn is `streaming.partial`, so the loading
 *  slot shows and the derived top-level `streaming` flag disables the composer. This is the
 *  SETTLED representation of mid-stream — a pinned snapshot, so VR captures it stably (the
 *  live token flow is the separate `Composer` "Streaming" affordance story). */
export const Streaming: Story = {
    render: () => (
        <ChatChrome>
            <ChatView
                chat={fakeChat(
                    snapshotOf({
                        messages: [
                            DEMO_MESSAGES[0],
                            {
                                id: 'stream1',
                                role: 'assistant',
                                content: 'Provisioning builds the schema and',
                                streaming: { partial: true },
                            },
                        ],
                        roster: DEMO_ROSTER,
                        streaming: true,
                    }),
                )}
                {...viewport}
            />
        </ChatChrome>
    ),
};

/** Escalated: a human is being brought in — the `support` preset's `escalatedState` +
 *  participant banner + agent roster all surface. */
export const Escalated: Story = {
    render: () => (
        <ChatChrome>
            <ChatView
                chat={fakeChat(
                    snapshotOf({
                        messages: DEMO_MESSAGES.slice(0, 2),
                        roster: DEMO_ROSTER_WITH_AGENT,
                        escalation: DEMO_ESCALATION,
                    }),
                )}
                {...support}
            />
        </ChatChrome>
    ),
};

// ── Variant matrix: the four presets ─────────────────────────────────────────────

/** All four named presets over the same populated snapshot — the sanctioned variant matrix.
 *  Each is a `{ layout, slots }` bundle spread onto the SAME <ChatView>; the only thing that
 *  varies is the slot fill + the `data-layout` mount tag. */
export const Presets: Story = {
    render: () => {
        const snap = snapshotOf({ messages: DEMO_MESSAGES.slice(0, 2), roster: DEMO_ROSTER });
        return (
            <ChatChrome>
                <div style={{ display: 'grid', gap: '1.5rem' }}>
                    {[
                        { name: 'viewport', preset: viewport },
                        { name: 'popover', preset: popover },
                        { name: 'siteAsk', preset: siteAsk },
                        { name: 'support', preset: support },
                    ].map(({ name, preset }) => (
                        <div key={name}>
                            <div style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)', marginBottom: '0.25rem' }}>
                                {name}
                            </div>
                            <ChatView chat={fakeChat(snap)} {...preset} />
                        </div>
                    ))}
                </div>
            </ChatChrome>
        );
    },
};

/** The `popover` preset — a floating panel (lean: banner affordance, no roster). Mobile
 *  viewport, since the popover mount is the responsive surface whose width collapses. */
export const AsPopover: Story = {
    parameters: { viewport: { defaultViewport: 'mobile1' } },
    render: () => (
        <ChatChrome>
            <ChatView chat={fakeChat(snapshotOf({ messages: DEMO_MESSAGES.slice(0, 2) }))} {...popover} />
        </ChatChrome>
    ),
};

/** The `siteAsk` preset — an inline "ask this page" box (the one-line embed). */
export const SiteAsk: Story = {
    render: () => (
        <ChatChrome>
            <ChatView chat={fakeChat(snapshotOf({}))} {...siteAsk} />
        </ChatChrome>
    ),
};

/** The `support` preset (populated, not yet escalated) — roster + banner + a composer that
 *  exposes the "talk to a human" affordance. */
export const Support: Story = {
    render: () => (
        <ChatChrome>
            <ChatView
                chat={fakeChat(snapshotOf({ messages: DEMO_MESSAGES.slice(0, 2), roster: DEMO_ROSTER_WITH_AGENT }))}
                {...support}
            />
        </ChatChrome>
    ),
};
