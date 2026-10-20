import { c as ChatSnapshot, a as ChatCore, b as ChatCoreOptions, d as ChatTransport } from './store-Ca9EVsm9.js';
import * as react from 'react';
import { ReactNode } from 'react';
import { P as Participant, C as ChatMessage, S as Segment, a as Citation } from './envelope-C2h6ajnL.js';
import { ThreadDepthCap } from './thread.js';

/** What `useChat` returns: the live snapshot + the core's capabilities. */
interface UseChat {
    /** The current folded read-model — re-rendered on every core snapshot. */
    snapshot: ChatSnapshot;
    /** Send a turn through the bound transport. */
    send: ChatCore['send'];
    /** Re-seed in-view history (the hybrid controlled-core hydration seam). */
    hydrate: ChatCore['hydrate'];
    /** Signal "talk to a human" — inert unless the transport routes it. */
    requestHuman: ChatCore['requestHuman'];
    /** The underlying store, for advanced consumers (e.g. imperative subscribe). */
    core: ChatCore;
}
/** Options accepted directly, or a pre-built `ChatCore` to bind to. */
type UseChatOptions = ChatCoreOptions | {
    core: ChatCore;
};
/**
 * Bind a `ChatCore` to React. Accepts either the core options (a `transport`,
 * plus optional `initialMessages` / `generateId`) or a pre-built `core`. The
 * store is created once (keyed off transport identity for the options form);
 * changing the transport reference mints a fresh core.
 *
 * Overloads keep the common `useChat(transport)` call ergonomic.
 */
declare function useChat(transport: ChatTransport): UseChat;
declare function useChat(options: UseChatOptions): UseChat;

/**
 * The FIXED slot inventory (CH-04 — PRD §5 "Shape 4", ADR-0078). `<ChatView>`
 * exposes exactly these sockets; a preset (CH-05) or a host (CH-08 Threads,
 * CH-10 showcase) fills any subset, and an unfilled slot falls back to the
 * default render. Every slot is a plain render-prop function so a bespoke
 * renderer is "just a function in the bag" and overriding is `...spread` — no
 * runtime renderer-manifest (the second registry the doctrine forbids).
 *
 * Two distinct HITL affordances stay UNFUSED (08's two-atom cut):
 *   - `participantBanner(who)` — transport-fed live-takeover ("a human is
 *     joining/joined"). No dependency; rides roster/author + session state.
 *   - `adjudicationPanel(verdict)` — the `@schemastud/verdict` shell for
 *     tool-call approval. The socket EXISTS here but ships UNFILLED: the
 *     verdict package is a separate (CH-07) effort. `Verdict` is left `unknown`
 *     so this package never hard-depends on the unbuilt shell — a consumer that
 *     owns a verdict shell fills the slot and types its own argument.
 */

/**
 * The adjudication payload. Left `unknown` on purpose — the `@schemastud/verdict`
 * shell (and its `Verdict` type) is a downstream effort; a consumer that fills
 * `adjudicationPanel` narrows this to its own shell's type. Chat never imports it.
 */
type Verdict = unknown;
/** Per-segment renderers, keyed by segment `type`. An absent key uses the default. */
type RenderSegmentMap = Partial<{
    [K in Segment['type']]: (segment: Extract<Segment, {
        type: K;
    }>, message: ChatMessage) => ReactNode;
}>;
/**
 * The composer render-prop `api` — what a `composer(api)` fill receives. Flat
 * and maximally swappable (a voice/date-picker/structured composer breaks
 * nothing). The standard `<Composer>` ships as a PRESET FILL (CH-05), never
 * baked into the slot.
 */
interface ComposerApi {
    /** Send a turn through the bound core. Resolves when the turn's stream ends. */
    send: (content: string) => Promise<void>;
    /** Signal "talk to a human" (inert unless the transport routes it). */
    requestHuman: (reason?: string) => Promise<void>;
    /** True while any message is still streaming — a composer may disable send. */
    streaming: boolean;
    /** True while the session is escalated (a human is being brought in). */
    escalated: boolean;
}
/**
 * The FIXED slot inventory. Every field is optional — an unfilled slot uses the
 * default render (`defaultRender.ts`). A preset is just a `Partial<ChatSlots>`
 * bundle a host spreads and overrides on top.
 */
interface ChatSlots {
    /** Header region above the message list. */
    header?: () => ReactNode;
    /** The standing "who's here" roster (multi-party is first-class — 04). */
    participants?: (roster: Participant[]) => ReactNode;
    /** Per-message actions (copy / cite / revise / retry). */
    messageToolbar?: (message: ChatMessage) => ReactNode;
    /** Per-segment renderers (tool_call / tool_result / custom). Keyed by type. */
    renderSegment?: RenderSegmentMap;
    /** Citation rendering (threads-rich). */
    citationChrome?: (citations: Citation[], message: ChatMessage) => ReactNode;
    /**
     * The `@schemastud/verdict` shell for tool-call approval (08 atom B). Socket
     * exists; ships UNFILLED — the verdict package is a separate effort.
     */
    adjudicationPanel?: (verdict: Verdict) => ReactNode;
    /** "A human is joining/joined" — the live-takeover banner (08 atom A). */
    participantBanner?: (who: Participant | undefined) => ReactNode;
    /** The input UX. FLAT render-prop `(api) => ReactNode` — maximally swappable. */
    composer?: (api: ComposerApi) => ReactNode;
    /** Shown when there are no messages. */
    emptyState?: () => ReactNode;
    /** Shown while a turn is streaming (in addition to the streamed content). */
    loadingState?: () => ReactNode;
    /** Shown when the session has escalated to a human. */
    escalatedState?: (reason: string) => ReactNode;
    /**
     * The per-row depth/collapse chrome of a NESTED render (`<ThreadView>`).
     * Unfilled in linear chat, where every row is depth 0 with no children, and
     * ignored entirely by `<ChatView>`.
     *
     * It receives the row rather than the message so a fill can read `depth` and
     * `childCount` — the two facts a flat `messageToolbar(message)` cannot see —
     * and call `toggle()` without owning the collapse set.
     */
    threadRowChrome?: (row: ThreadRowApi) => ReactNode;
}
/**
 * What `threadRowChrome` receives: the derived node, plus the two pieces of
 * reader state the view owns.
 */
interface ThreadRowApi {
    message: ChatMessage;
    /** 0 for a root. The renderer already applies this as indentation. */
    depth: number;
    /** Descendants at any depth — the same number whether or not they are visible. */
    childCount: number;
    /** True when this row's subtree is collapsed by the reader. */
    collapsed: boolean;
    /** Flip this row's collapse state. Inert when `childCount` is 0. */
    toggle: () => void;
}

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

interface ChatViewProps {
    /** The bound core (from `useChat`). `<ChatView>` reads its snapshot + capabilities. */
    chat: UseChat;
    /** Free layout tag recorded as `data-layout` — chrome CSS is a preset/host concern. */
    layout?: string;
    /** The fixed slot inventory. Any subset; unfilled slots use the default render. */
    slots?: ChatSlots;
}
declare function ChatView({ chat, layout, slots }: ChatViewProps): ReactNode;

interface ThreadViewProps {
    /** The snapshot to project. `ChatSnapshot` satisfies this. */
    snapshot: {
        messages: ChatMessage[];
    };
    /**
     * The render cap: `null`/omitted = unbounded (forum), `2` = one reply level
     * (board), `1` = flat (chat). Storage is unaffected either way.
     */
    maxDepth?: ThreadDepthCap;
    /** Slot fills. `threadRowChrome` is the one this view adds. */
    slots?: ChatSlots;
    /** Rows collapsed on first render, by message id. */
    initialCollapsed?: string[];
}
declare function ThreadView({ snapshot, maxDepth, slots, initialCollapsed }: ThreadViewProps): react.JSX.Element;

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

/** Render one segment: a slot override for its `type` wins, else the built-in. */
declare function renderSegment(segment: Segment, message: ChatMessage, overrides: RenderSegmentMap | undefined, key: number): ReactNode;
/**
 * Render a message body: interleaved segments when present, else flat `content`.
 * This is the envelope's core rule — lean consumers never author segments and
 * get `content`; rich consumers stream segments.
 */
declare function renderMessageBody(message: ChatMessage, segmentOverrides: RenderSegmentMap | undefined): ReactNode;

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

interface ComposerProps extends ComposerApi {
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
declare function Composer({ send, requestHuman, streaming, escalated, placeholder, sendLabel, allowRequestHuman, requestHumanLabel, }: ComposerProps): ReactNode;

/** A preset: a layout tag + a partial slot fill a host spreads and overrides. */
interface ChatPreset {
    /** Free layout tag → `data-layout`. Mount/chrome CSS is a preset/host concern. */
    layout?: string;
    /** The slot fills this preset contributes. A host spreads then overrides. */
    slots: Partial<ChatSlots>;
}
/**
 * `viewport` — full-viewport threads (the richest surface). Standard composer,
 * empty/loading states, the standing roster, and the adjudication-panel socket
 * WIRED but left UNFILLED (the `@schemastud/verdict` shell is a separate effort;
 * a host that owns a verdict shell overrides `adjudicationPanel`). Threads
 * overrides `messageToolbar` / `renderSegment` / `citationChrome` / `composer`
 * on top of this base.
 */
declare const viewport: ChatPreset;
/**
 * `popover` — a floating panel. Lean: the participant BANNER is the HITL
 * affordance (no adjudication panel), plain standard composer, no standing
 * roster. Mount/backdrop/trigger chrome is a host/CSS concern keyed off
 * `data-layout="popover"`.
 */
declare const popover: ChatPreset;
/**
 * `siteAsk` — an inline embedded "ask this site" box. Same lean shape as
 * `popover` (BANNER affordance, plain composer, no roster) with an inline
 * layout tag. This is the one-line preset: `<ChatView chat={chat} {...presets.siteAsk} />`.
 */
declare const siteAsk: ChatPreset;
/**
 * `support` — the escalation-forward concierge surface. Surfaces the escalation
 * UX: the standard composer exposes the "talk to a human" affordance
 * (`allowRequestHuman`), the participant BANNER shows the joining agent, an
 * `escalatedState` announces the takeover, and the agent roster is shown
 * (author-label). This is the preset the showcase/support wires to prove the
 * escalation path.
 */
declare const support: ChatPreset;
/**
 * The four presets, addressable as `presets.viewport` / `.popover` / `.siteAsk`
 * / `.support` (the prototype's call shape). Each is a plain object — spread it,
 * override any slot.
 */
declare const presets: {
    viewport: ChatPreset;
    popover: ChatPreset;
    siteAsk: ChatPreset;
    support: ChatPreset;
};

/** Package identity marker. The smoke test asserts this trivial symbol. */
declare const CHAT_REACT: "schemastud-chat-react";
/** Proves the ./react → ./core dependency arrow (ADR-0078). */
declare const CHAT_CORE_TAG: "schemastud-chat-core";

export { CHAT_CORE_TAG, CHAT_REACT, type ChatPreset, type ChatSlots, ChatView, type ChatViewProps, Composer, type ComposerApi, type ComposerProps, type RenderSegmentMap, type ThreadRowApi, ThreadView, type ThreadViewProps, type UseChat, type UseChatOptions, type Verdict, popover, presets, renderMessageBody, renderSegment, siteAsk, support, useChat, viewport };
