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
}
