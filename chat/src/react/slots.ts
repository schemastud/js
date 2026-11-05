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
import type { ReactNode } from 'react';
import type { ChatMessage, Citation, Participant, Segment } from '../core/index';

/**
 * The adjudication payload. Left `unknown` on purpose — the `@schemastud/verdict`
 * shell (and its `Verdict` type) is a downstream effort; a consumer that fills
 * `adjudicationPanel` narrows this to its own shell's type. Chat never imports it.
 */
export type Verdict = unknown;

/** Per-segment renderers, keyed by segment `type`. An absent key uses the default. */
export type RenderSegmentMap = Partial<{
    [K in Segment['type']]: (segment: Extract<Segment, { type: K }>, message: ChatMessage) => ReactNode;
}>;

/**
 * The composer render-prop `api` — what a `composer(api)` fill receives. Flat
 * and maximally swappable (a voice/date-picker/structured composer breaks
 * nothing). The standard `<Composer>` ships as a PRESET FILL (CH-05), never
 * baked into the slot.
 */
export interface ComposerApi {
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
export interface ChatSlots {
    /** Header region above the message list. */
    header?: () => ReactNode;
    /** The standing "who's here" roster (multi-party is first-class — 04). */
    participants?: (roster: Participant[]) => ReactNode;
    /**
     * The per-turn identity line (author + time). Rendered ABOVE the body as
     * `[data-chat-message-meta]`. `continued` is true when this turn comes from
     * the same author as the turn before it, so a fill (or host CSS) can show
     * the identity once per run instead of on every turn. Unfilled ⇒ no meta.
     */
    messageMeta?: (message: ChatMessage, api: MessageMetaApi) => ReactNode;
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
    /**
     * Shown while the reader has scrolled away from the latest turn (`<ChatView follow>`).
     * `unseen` is true once new content has arrived below. Unfilled ⇒ a plain button.
     */
    jumpToLatest?: (api: JumpToLatestApi) => ReactNode;
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

/** What a `jumpToLatest` fill receives. */
export interface JumpToLatestApi {
    /** Scroll the message list to its end (instant under reduced motion). */
    jump: () => void;
    /** True when content arrived while the reader was scrolled up. */
    unseen: boolean;
}

/** How a turn shows who wrote it (owner ruling 2026-11-02, owner-review-20261026 ticket 17, item 1). */
export type ChatIdentity = 'byline' | 'avatar';

/**
 * How the view sits in its container (owner ruling 2026-11-02, owner-review-20261026 ticket 17, item 3C). `bleed` (the
 * default): the view fills its container edge to edge with no frame of its own, the message list
 * scrolls at the container's edge, and the turns and composer share one centred reading column
 * (host CSS caps it, conventionally via `--chat-column`). `contained`: the view draws its own
 * box, for a mount that sits beside other content. Recorded as `data-frame`.
 */
export type ChatFrame = 'bleed' | 'contained';

/** What a `messageMeta` fill receives beside the message. */
export interface MessageMetaApi {
    /** True when the previous turn has the same author (`author.id`, else `role`). */
    continued: boolean;
    /**
     * The view's identity layout (`<ChatView identity>`): `byline` (name + time above the turn,
     * the default) or `avatar` (an author mark in a gutter beside the turn). A fill renders the
     * mark only for `avatar`; host CSS keys the gutter layout off `[data-identity='avatar']`.
     */
    identity: ChatIdentity;
    /** True while this turn is still streaming. */
    streaming: boolean;
}

/**
 * What `threadRowChrome` receives: the derived node, plus the two pieces of
 * reader state the view owns.
 */
export interface ThreadRowApi {
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
