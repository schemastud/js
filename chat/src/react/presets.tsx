/**
 * The four named presets (CH-05, PRD §5 "Shape 4"). Each preset is a plain-code
 * `{ layout?, slots: Partial<ChatSlots> }` bundle a host spreads onto `<ChatView>`
 * and overrides any slot on top of:
 *
 *   <ChatView chat={chat} {...presets.viewport}
 *             slots={{ ...presets.viewport.slots, messageToolbar: … }} />
 *
 * Presets are just code — a bespoke renderer is "a function in the bag" and
 * overriding is `...spread`. There is NO runtime renderer-manifest (Shape 3 was
 * rejected — the second registry the doctrine forbids).
 *
 * What each preset varies (the variant matrix — mount/chrome × transport × HITL
 * affordance × composer × participants), all from the SAME `<ChatView>`:
 *
 *   preset     | layout    | HITL affordance      | composer            | participants
 *   -----------|-----------|----------------------|---------------------|-------------
 *   viewport   | viewport  | adjudication PANEL   | standard <Composer> | roster
 *   (threads)  |           | (wired, UNFILLED)    | (+ empty/loading)   | (author-label)
 *   popover    | popover   | participant BANNER   | standard <Composer> | none
 *   siteAsk    | site-ask  | participant BANNER   | standard <Composer> | none
 *   support    | support   | BANNER + escalated   | standard <Composer> | roster
 *              |           | state (+ requestHuman)| (allowRequestHuman)| (agent)
 *
 * The standard `<Composer>` is filled here as the `composer` slot — it is a
 * preset FILL, never baked into the socket, so swapping it out is a one-slot
 * override (`slots={{ ...presets.viewport.slots, composer: (api) => <Rich {...} /> }}`).
 */
import type { ReactNode } from 'react';
import type { Participant } from '../core/index';
import { Composer } from './composer';
import { renderMessageMeta } from './default-render';
import type { ChatSlots, ComposerApi } from './slots';
import { useChatMessages } from '../messages';

type CopyKey = Parameters<ReturnType<typeof useChatMessages>['t']>[0];
function Copy({ name, ...attributes }: { name: CopyKey; [key: `data-${string}`]: unknown }) {
    const messages = useChatMessages();
    return <div {...attributes}>{messages.t(name)}</div>;
}
function PresetComposer({ api, kind }: { api: ComposerApi; kind: 'popover' | 'siteAsk' | 'support' }) {
    const messages = useChatMessages();
    const key = kind === 'popover' ? 'ask_question' : kind === 'siteAsk' ? 'ask_page' : 'support_placeholder';
    return <Composer {...api} allowRequestHuman={kind === 'support'} placeholder={messages.t(`schemastud-chat::messages.${key}`)} sendLabel={kind === 'siteAsk' ? messages.t('schemastud-chat::messages.ask') : undefined} />;
}
function JoiningBanner({ who }: { who: Participant | undefined }) {
    const messages = useChatMessages();
    return <div data-chat-joining-banner>{messages.t('schemastud-chat::messages.joining', { name: who?.label ?? messages.t('schemastud-chat::messages.teammate') })}</div>;
}

/** A preset: a layout tag + a partial slot fill a host spreads and overrides. */
export interface ChatPreset {
    /** Free layout tag → `data-layout`. Mount/chrome CSS is a preset/host concern. */
    layout?: string;
    /** The slot fills this preset contributes. A host spreads then overrides. */
    slots: Partial<ChatSlots>;
}

/** A minimal roster line — presets that show "who's here" use this default fill. */
function rosterLine(roster: Participant[]): ReactNode {
    return (
        <ul data-chat-roster>
            {roster.map((p) => (
                <li key={p.id} data-chat-roster-member data-kind={p.kind}>
                    {p.label ?? p.id}
                </li>
            ))}
        </ul>
    );
}

/** A default "a human is joining" banner — the lean presets' HITL affordance (atom A). */
function joiningBanner(who: Participant | undefined): ReactNode {
    return <JoiningBanner who={who} />;
}

/**
 * `viewport` — full-viewport threads (the richest surface). Standard composer,
 * empty/loading states, the standing roster, and the adjudication-panel socket
 * WIRED but left UNFILLED (the `@schemastud/verdict` shell is a separate effort;
 * a host that owns a verdict shell overrides `adjudicationPanel`). Threads
 * overrides `messageToolbar` / `renderSegment` / `citationChrome` / `composer`
 * on top of this base.
 */
export const viewport: ChatPreset = {
    layout: 'viewport',
    slots: {
        composer: (api) => <Composer {...api} />,
        participants: (roster) => rosterLine(roster),
        // The author-label column of the table above: who said it, and when.
        messageMeta: renderMessageMeta,
        emptyState: () => <Copy data-chat-empty name="schemastud-chat::messages.empty_viewport" />,
        loadingState: () => <Copy data-chat-loading-indicator name="schemastud-chat::messages.thinking" />,
        // Wired, ships UNFILLED — the verdict shell is a downstream capability.
        adjudicationPanel: undefined,
    },
};

/**
 * `popover` — a floating panel. Lean: the participant BANNER is the HITL
 * affordance (no adjudication panel), plain standard composer, no standing
 * roster. Mount/backdrop/trigger chrome is a host/CSS concern keyed off
 * `data-layout="popover"`.
 */
export const popover: ChatPreset = {
    layout: 'popover',
    slots: {
        composer: (api) => <PresetComposer api={api} kind="popover" />,
        participantBanner: (who) => joiningBanner(who),
        emptyState: () => <Copy data-chat-empty name="schemastud-chat::messages.empty_popover" />,
    },
};

/**
 * `siteAsk` — an inline embedded "ask this site" box. Same lean shape as
 * `popover` (BANNER affordance, plain composer, no roster) with an inline
 * layout tag. This is the one-line preset: `<ChatView chat={chat} {...presets.siteAsk} />`.
 */
export const siteAsk: ChatPreset = {
    layout: 'site-ask',
    slots: {
        composer: (api) => <PresetComposer api={api} kind="siteAsk" />,
        participantBanner: (who) => joiningBanner(who),
        emptyState: () => <Copy data-chat-empty name="schemastud-chat::messages.empty_page" />,
    },
};

/**
 * `support` — the escalation-forward concierge surface. Surfaces the escalation
 * UX: the standard composer exposes the "talk to a human" affordance
 * (`allowRequestHuman`), the participant BANNER shows the joining agent, an
 * `escalatedState` announces the takeover, and the agent roster is shown
 * (author-label). This is the preset the showcase/support wires to prove the
 * escalation path.
 */
export const support: ChatPreset = {
    layout: 'support',
    slots: {
        composer: (api) => <PresetComposer api={api} kind="support" />,
        participants: (roster) => rosterLine(roster),
        participantBanner: (who) => joiningBanner(who),
        escalatedState: (reason) => (
            <Copy data-chat-escalated-notice data-reason={reason} name="schemastud-chat::messages.escalated" />
        ),
        emptyState: () => <Copy data-chat-empty name="schemastud-chat::messages.empty_support" />,
    },
};

/**
 * The four presets, addressable as `presets.viewport` / `.popover` / `.siteAsk`
 * / `.support` (the prototype's call shape). Each is a plain object — spread it,
 * override any slot.
 */
export const presets: {
    viewport: ChatPreset;
    popover: ChatPreset;
    siteAsk: ChatPreset;
    support: ChatPreset;
} = { viewport, popover, siteAsk, support };
