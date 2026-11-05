/* eslint-disable */
// =============================================================================
// story-harness — the shared Storybook fixtures for the @schemastud/chat catalog
// (component-seams map, ticket 20). NOT part of the shipped package: tsup builds only
// the explicit `core`/`react` index entries, so this file (imported solely by the
// colocated *.stories.tsx) never enters `dist`.
//
// WHY A HARNESS AT ALL. Chat is HEADLESS by construction — `<ChatView>` / `<Composer>`
// render only `data-*`-anchored primitives and inject NO design-system primitive set
// (unlike facets/frame, which carry a four-kind / FacetsInjection contract). So there is
// no provider, no QueryClient, no mock primitive bundle to build. What a story DOES need
// is a bound `chat: UseChat` pinned to a specific fold state — empty / populated /
// streaming / escalated — so every state-axis story renders the REAL <ChatView> against a
// realistic snapshot without spinning a live transport per story.
//
// TWO fixture flavours, both here:
//   1. `fakeChat(snapshot)` — a STATIC `UseChat` over a hand-built `ChatSnapshot`. This is
//      what every state story uses: deterministic, no async, VR captures settled content.
//   2. `useScriptedChat(script)` — a LIVE `useChat` bound to a scripted mock transport that
//      emits canonical wire events on a timer. This drives the ONE deliberate "streaming"
//      story so the affordance is catalogued; its `play` awaits the settled turn so a future
//      VR baseline captures the finished conversation, never a mid-stream token flash.
//
// The `.storybook` preview seeds Tailwind + the `--splice-*`→semantic token layer and the
// light⊗dark `colorScheme` toolbar (ticket 14) — chat's data-attributes carry no colour of
// their own, so a story that wants visible chrome adds a thin `ChatChrome` wrapper (below)
// that maps the stable `data-chat-*` anchors onto semantic-token classes. That chrome is a
// STORY concern (it lives here, never ships) — exactly the "styling belongs to the host"
// contract the package documents.
// =============================================================================
import { useRef, useState, type CSSProperties, type ReactNode } from 'react';
import type {
    ChatMessage,
    ChatSnapshot,
    ChatTransport,
    ChatWireEvent,
    EscalationState,
    Participant,
} from '../core/index';
import { emptySnapshot } from '../core/index';
import { useChat, type UseChat } from './use-chat';

// ── Static fixture: a `UseChat` pinned to a snapshot ────────────────────────────
// The state stories don't need a running core — they need <ChatView> to fold a KNOWN
// snapshot. `fakeChat` returns the `UseChat` shape with inert capabilities (send/hydrate/
// requestHuman resolve to no-op) so the composer's disabled/enabled logic still reads the
// real `streaming`/`escalated` flags off the snapshot.
export function fakeChat(snapshot: ChatSnapshot): UseChat {
    const noopAsync = async () => {};
    return {
        snapshot,
        send: noopAsync,
        hydrate: () => {},
        requestHuman: noopAsync,
        // The store is unused by <ChatView>; a minimal stub keeps the type honest.
        core: {
            subscribe: () => () => {},
            getSnapshot: () => snapshot,
            hydrate: () => {},
            send: noopAsync,
            requestHuman: noopAsync,
        },
    };
}

// ── Snapshot builders ───────────────────────────────────────────────────────────
export function snapshotOf(partial: Partial<ChatSnapshot>): ChatSnapshot {
    return { ...emptySnapshot(), ...partial };
}

let idSeq = 0;
const nextId = () => `m_story_${(idSeq++).toString(36)}`;

export function userMsg(content: string): ChatMessage {
    return { id: nextId(), role: 'user', content };
}
export function assistantMsg(content: string, extra: Partial<ChatMessage> = {}): ChatMessage {
    return { id: nextId(), role: 'assistant', content, ...extra };
}

// A representative populated thread: a user question, a rich assistant turn carrying a
// tool_call/tool_result pair + citations, and a short follow-up. Exercises the envelope's
// flat-content path AND its interleaved-segment path in one snapshot.
export const DEMO_MESSAGES: ChatMessage[] = [
    userMsg('How do I provision a new tenant?'),
    assistantMsg('', {
        segments: [
            { type: 'text', text: 'Run the provisioning pipeline — it builds the schema and seeds it. ' },
            { type: 'tool_call', toolId: 't1', toolName: 'lookupDocs', arguments: { topic: 'tenancy' } },
            { type: 'tool_result', toolId: 't1', toolName: 'lookupDocs', result: { hits: 2 } },
            { type: 'text', text: 'Then verify at the tenant subdomain.' },
        ],
        citations: [
            { id: 'c1', name: 'Tenancy runbook', authority: 'docs', sectionTitle: 'Provisioning' },
            { id: 'c2', name: 'CLAUDE.md', authority: 'repo' },
        ],
    }),
    userMsg('Thanks!'),
    assistantMsg('Happy to help. Anything else?'),
];

export const DEMO_ROSTER: Participant[] = [
    { id: 'u1', label: 'You', kind: 'user' },
    { id: 'a1', label: 'Ada (assistant)', kind: 'assistant' },
];

export const DEMO_ROSTER_WITH_AGENT: Participant[] = [
    ...DEMO_ROSTER,
    { id: 'ag1', label: 'Sam (support)', kind: 'agent' },
];

export const DEMO_ESCALATION: EscalationState = { reason: 'visitor_request' };

// A snapshot mid-stream: the trailing assistant turn still `streaming.partial`, so the
// derived top-level `streaming` flag is true (drives the loading slot + composer-disabled).
export const STREAMING_SNAPSHOT: ChatSnapshot = snapshotOf({
    messages: [
        userMsg('Summarise the last deploy.'),
        assistantMsg('The last deploy shipped the chat catalog and', {
            streaming: { partial: true },
            segments: [{ type: 'text', text: 'The last deploy shipped the chat catalog and' }],
        }),
    ],
    roster: DEMO_ROSTER,
    streaming: true,
});

// ── Scripted live transport (for the deliberate streaming story only) ────────────
// A `ChatTransport` whose default JSON/SSE parsing is bypassed: it hands the core a
// Response the DEFAULT adapter reads as an SSE stream of the scripted events. We keep it
// simple by supplying `adapt` directly, so the store folds our scripted `ChatWireEvent`s
// on a timer regardless of the shipped wire format.
export interface ScriptStep {
    event: ChatWireEvent;
    delayMs: number;
}

export function scriptedTransport(steps: ScriptStep[]): ChatTransport {
    return {
        kind: 'story-script',
        // `send` is never used to fetch — `adapt` ignores the response and replays the script.
        send: async () => new Response(null, { headers: { 'content-type': 'text/event-stream' } }),
        adapt: async function* (_response: Response) {
            void _response;
            for (const step of steps) {
                await new Promise((r) => setTimeout(r, step.delayMs));
                yield step.event;
            }
        },
    };
}

/** Bind a live core to a scripted transport for the streaming affordance story. */
export function useScriptedChat(steps: ScriptStep[]): UseChat {
    const transportRef = useRef<ChatTransport | null>(null);
    if (!transportRef.current) {
        transportRef.current = scriptedTransport(steps);
    }
    return useChat({ transport: transportRef.current });
}

// ── Story chrome ────────────────────────────────────────────────────────────────
// A thin, non-shipped wrapper that maps chat's stable `data-chat-*` anchors onto
// semantic-token utility classes so the catalog renders as visible, on-brand chat chrome
// (and re-skins under `.dark`) instead of an unstyled data-attribute dump. This is exactly
// the "host owns the styling" contract — it lives in the harness, never in the package.
const CHROME_CSS = `
[data-chat-view] { display:flex; flex-direction:column; gap:0.5rem; width:100%; max-width:44rem;
  background:var(--card); color:var(--card-foreground); border:1px solid var(--border);
  border-radius:var(--radius,0.5rem); padding:0.75rem; }
[data-chat-view][data-layout="popover"] { max-width:22rem; box-shadow:0 8px 30px rgb(0 0 0 / 0.12); }
[data-chat-view][data-layout="site-ask"] { max-width:32rem; }
[data-chat-header] { font-weight:600; padding-bottom:0.25rem; border-bottom:1px solid var(--border); }
[data-chat-participants] ul, [data-chat-roster] { display:flex; gap:0.5rem; list-style:none;
  margin:0; padding:0; font-size:0.75rem; color:var(--muted-foreground); }
[data-chat-participant-banner], [data-chat-joining-banner] { font-size:0.8125rem;
  color:var(--muted-foreground); font-style:italic; }
[data-chat-messages] { display:flex; flex-direction:column; gap:0.5rem; min-height:2rem; }
[data-chat-message] { padding:0.5rem 0.625rem; border-radius:0.5rem; max-width:85%; }
[data-chat-message][data-role="user"] { align-self:flex-end; background:var(--primary);
  color:var(--primary-foreground); }
[data-chat-message][data-role="assistant"] { align-self:flex-start; background:var(--secondary);
  color:var(--secondary-foreground); }
[data-chat-tool-call], [data-chat-tool-result] { font-family:ui-monospace,monospace; font-size:0.75rem;
  background:var(--muted); color:var(--muted-foreground); border-radius:0.25rem; padding:0.125rem 0.375rem;
  margin:0.25rem 0; display:inline-block; }
[data-chat-citations] { font-size:0.75rem; color:var(--muted-foreground); margin-top:0.25rem; }
[data-chat-empty] { color:var(--muted-foreground); text-align:center; padding:1rem; }
[data-chat-loading], [data-chat-loading-indicator] { color:var(--muted-foreground); font-style:italic; }
[data-chat-escalated], [data-chat-escalated-notice] { font-size:0.8125rem; color:var(--foreground);
  background:var(--accent); border-radius:0.375rem; padding:0.375rem 0.5rem; }
[data-chat-composer], [data-chat-composer-standard] { display:flex; flex-direction:column; gap:0.375rem;
  border-top:1px solid var(--border); padding-top:0.5rem; }
[data-chat-composer-label-text] { display:block; font-size:0.75rem; color:var(--muted-foreground);
  margin-bottom:0.25rem; }
[data-chat-composer-input] { width:100%; min-height:2.5rem; resize:vertical; border:1px solid var(--border);
  border-radius:0.375rem; background:var(--background); color:var(--foreground); padding:0.375rem 0.5rem;
  font:inherit; }
[data-chat-composer-actions] { display:flex; gap:0.5rem; justify-content:flex-end; }
[data-chat-composer-actions] button { border-radius:0.375rem; padding:0.375rem 0.75rem; font:inherit;
  border:1px solid var(--border); cursor:pointer; }
[data-chat-composer-send] { background:var(--primary); color:var(--primary-foreground); border-color:transparent; }
[data-chat-composer-send][disabled] { opacity:0.5; cursor:not-allowed; }
[data-chat-composer-request-human] { background:var(--background); color:var(--foreground); }
`;

export function ChatChrome({ children }: { children: ReactNode }): ReactNode {
    return (
        <>
            <style>{CHROME_CSS}</style>
            <div style={{ width: '100%', display: 'flex', justifyContent: 'center' }}>{children}</div>
        </>
    );
}

// ── Threads fixtures + reference skin (owner-review-20261026 ticket 17, ruled 2026-11-02) ──
// A thread with authored, timed turns, so the byline runs, the avatar mark and the latest-reply
// anchor all have something to show. Times are fixed so VR stays stable.
const ANALYST = { id: 'ag_policy', label: 'Policy Analyst', kind: 'agent' as const };
const t = (m: number) => `2026-11-02T14:${String(m).padStart(2, '0')}:00Z`;

export const THREAD_MESSAGES: ChatMessage[] = [
    { id: 'th_u1', role: 'user', content: 'Which of our policies cover remote contractors?', createdAt: t(2) },
    { id: 'th_u2', role: 'user', content: 'Especially the ones outside the EU.', createdAt: t(2) },
    {
        id: 'th_a1',
        role: 'assistant',
        author: ANALYST,
        createdAt: t(3),
        content: '',
        segments: [
            { type: 'tool_call', toolId: 's1', toolName: 'search', arguments: { q: 'remote contractor policy' } },
            { type: 'tool_result', toolId: 's1', toolName: 'search', result: { hits: 3 } },
            {
                type: 'text',
                text: 'Three policies apply. The Contractor Engagement Policy sets the agreement terms, the Data Handling Standard covers access from outside the EU, and the Equipment Policy covers loaned hardware.',
            },
        ],
    },
    { id: 'th_a2', role: 'assistant', author: ANALYST, createdAt: t(3), content: 'Want me to compare their review cycles?' },
    { id: 'th_u3', role: 'user', content: 'Yes, and flag anything overdue.', createdAt: t(5) },
    {
        id: 'th_a3',
        role: 'assistant',
        author: ANALYST,
        createdAt: t(6),
        content: 'The Data Handling Standard is overdue: its last review was fourteen months ago, against a twelve-month cycle. The other two are current.',
    },
];

/** Mid-reply: the latest turn is still arriving, so the caret follows its tail. */
export const THREAD_STREAMING: ChatSnapshot = snapshotOf({
    messages: [
        ...THREAD_MESSAGES.slice(0, 5),
        {
            id: 'th_a3',
            role: 'assistant',
            author: ANALYST,
            createdAt: t(6),
            content: 'The Data Handling Standard is overdue: its last review was fourteen',
            streaming: { partial: true },
        },
    ],
    streaming: true,
});

/** After send, before the first token: the user spoke last and the view is streaming. */
export const THREAD_AWAITING: ChatSnapshot = snapshotOf({ messages: THREAD_MESSAGES.slice(0, 5), streaming: true });

export const THREAD_AGENT = ANALYST.label;

// A reference host skin for the ruled Threads experience. It keys off the package's documented
// contract (README "View options and the data-* contract") and nothing else, so the catalog shows
// what a host can do with it. Like ChatChrome it lives here and never ships.
const THREADS_CSS = `
[data-story-threads] { height:var(--story-pane-height,100dvh); display:flex; flex-direction:column; background:var(--background);
  color:var(--foreground); --chat-column:46rem; font-size:15px; }
[data-story-threads] [data-chat-view] { display:flex; flex-direction:column; flex:1 1 auto; min-height:0; position:relative; }
[data-story-threads] [data-chat-view][data-frame='contained'] { margin:1.5rem auto; width:min(100% - 2rem, 44rem);
  border:1px solid var(--border); border-radius:var(--radius,0.5rem); background:var(--card); overflow:hidden; }
[data-story-threads] [data-chat-messages] { flex:1 1 auto; min-height:0; overflow-y:auto; display:flex; flex-direction:column;
  gap:0.875rem; padding:1rem 1rem 1.5rem; }
[data-story-threads] [data-frame='bleed'] [data-chat-messages] { padding-inline:max(1rem, calc((100% - var(--chat-column)) / 2)); }
[data-story-threads] [data-chat-message] { display:flex; flex-direction:column; gap:0.25rem; max-width:85%; align-self:flex-start; }
[data-story-threads] [data-chat-message][data-role='user'] { align-self:flex-end; align-items:flex-end; }
[data-story-threads] [data-chat-message][data-continued] { margin-top:-0.625rem; }
[data-story-threads] [data-chat-message][data-continued] [data-chat-message-meta] { display:none; }
[data-story-threads] [data-chat-message-meta] { display:flex; align-items:baseline; gap:0.5rem; min-height:1.25rem; }
[data-story-threads] [data-chat-message][data-role='user'] [data-chat-author] { position:absolute; width:1px; height:1px; overflow:hidden; clip-path:inset(50%); }
[data-story-threads] [data-chat-author] { font-size:13px; font-weight:600; }
[data-story-threads] [data-chat-time] { font-family:var(--font-mono,ui-monospace,monospace); font-size:11px; font-variant-numeric:tabular-nums;
  color:color-mix(in oklab, var(--foreground) 72%, transparent); }
[data-story-threads] [data-chat-message-body] { line-height:1.55; }
[data-story-threads] [data-chat-message][data-role='user'] [data-chat-message-body] { background:var(--muted); border-radius:0.75rem;
  padding:0.5rem 0.875rem; }
[data-story-threads] [data-chat-tool-call] { font-family:var(--font-mono,ui-monospace,monospace); font-size:12px; color:var(--muted-foreground);
  border:1px solid var(--border); border-radius:0.375rem; padding:0.25rem 0.5rem; margin-bottom:0.375rem; display:inline-block; }
[data-story-threads] [data-chat-tool-result] { display:none; }
/* identity="avatar": the mark sits in a gutter beside the reply. */
[data-story-threads] [data-identity='avatar'] [data-chat-message]:not([data-role='user']) { display:grid;
  grid-template-columns:1.75rem minmax(0,1fr); column-gap:0.75rem; row-gap:0.25rem; max-width:calc(85% + 2.5rem); }
[data-story-threads] [data-identity='avatar'] [data-chat-message]:not([data-role='user']) > * { grid-column:2; }
[data-story-threads] [data-identity='avatar'] [data-chat-message]:not([data-role='user']) > [data-chat-message-meta] { display:contents; }
[data-story-threads] [data-identity='avatar'] [data-chat-message][data-continued]:not([data-role='user']) > [data-chat-message-meta] > * { display:none; }
[data-story-threads] [data-chat-avatar] { grid-column:1; grid-row:1 / span 2; align-self:start; display:grid; place-items:center;
  width:1.75rem; height:1.75rem; border-radius:9999px; font-family:var(--font-mono,ui-monospace,monospace); font-size:10.5px; font-weight:500;
  background:color-mix(in oklab, var(--foreground) 8%, transparent); color:color-mix(in oklab, var(--foreground) 80%, transparent); }
/* 2A: actions reveal on hover or focus; the latest reply and touch keep them shown. */
[data-story-threads] [data-chat-message-toolbar] { opacity:0; transition:opacity 150ms ease; }
[data-story-threads] [data-chat-message]:hover [data-chat-message-toolbar],
[data-story-threads] [data-chat-message]:focus-within [data-chat-message-toolbar],
[data-story-threads] [data-chat-message][data-latest] [data-chat-message-toolbar] { opacity:1; }
@media (hover:none) { [data-story-threads] [data-chat-message-toolbar] { opacity:1; } }
[data-story-threads] [data-story-actions] { display:flex; gap:0.5rem; }
[data-story-threads] [data-story-actions] button { position:relative; min-width:2rem; height:2rem; padding:0 0.5rem; border-radius:0.375rem;
  border:0; background:transparent; color:var(--muted-foreground); font:inherit; font-size:13px; cursor:pointer; }
[data-story-threads] [data-story-actions] button::after { content:''; position:absolute; inset:-4px; }
[data-story-threads] [data-chat-message]:has([data-chat-message-toolbar]) { gap:0.125rem; }
[data-story-threads] [data-story-actions] button:hover { background:var(--muted); color:var(--foreground); }
[data-story-threads] [data-story-actions] button:focus-visible { outline:2px solid var(--ring,var(--primary)); outline-offset:1px; }
/* 4B: the live caret follows the tail; static under reduced motion. */
[data-story-threads] [data-chat-tail]:not(:has(> *))::after,
[data-story-threads] [data-chat-tail] > :last-child::after { content:''; display:inline-block; width:0.5em; height:1.05em;
  margin-inline-start:0.125em; vertical-align:-0.15em; border-radius:1px; background:currentColor; opacity:0.55;
  animation:story-caret 1.1s ease-in-out infinite; }
@keyframes story-caret { 50% { opacity:0.2; } }
@media (prefers-reduced-motion:reduce) { [data-story-threads] [data-chat-tail]::after, [data-story-threads] [data-chat-tail] *::after { animation:none; } }
/* 4A: the jump pill docks on the composer's top edge. */
[data-story-threads] [data-chat-jump] { position:relative; height:0; z-index:2; display:flex; justify-content:center; }
[data-story-threads] [data-chat-jump] > * { position:absolute; bottom:0.5rem; min-height:2.5rem; padding:0 0.875rem; border-radius:9999px;
  border:1px solid var(--border); background:var(--card); color:var(--foreground); font:inherit; font-size:13px; cursor:pointer;
  box-shadow:0 1px 3px rgb(0 0 0 / 0.08); }
/* The composer: one docked card in the reading column. */
[data-story-threads] [data-chat-composer] { padding:0.25rem 1rem 1rem; }
[data-story-threads] [data-frame='bleed'] [data-chat-composer] { padding-inline:max(1rem, calc((100% - var(--chat-column)) / 2)); }
[data-story-threads] [data-chat-composer-standard] { display:flex; gap:0.5rem; align-items:flex-end; border:1px solid var(--border);
  border-radius:0.75rem; background:var(--card); padding:0.5rem; }
[data-story-threads] [data-chat-composer-standard] label { flex:1 1 auto; }
[data-story-threads] [data-chat-composer-label-text] { position:absolute; width:1px; height:1px; overflow:hidden; clip-path:inset(50%); }
[data-story-threads] [data-chat-composer-input] { width:100%; min-height:2.75rem; resize:none; border:0; background:transparent;
  color:var(--foreground); font:inherit; padding:0.5rem; }
[data-story-threads] [data-chat-composer-input]::placeholder { color:color-mix(in oklab, var(--foreground) 70%, transparent); }
[data-story-threads] [data-chat-composer-actions] button { min-height:2.75rem; padding:0 1.125rem; border-radius:0.5rem; border:0;
  background:var(--primary); color:var(--primary-foreground); font:inherit; cursor:pointer; }
[data-story-threads] [data-chat-composer-actions] button[disabled] { opacity:0.5; cursor:not-allowed; }
[data-story-threads] [data-story-status] { display:flex; align-items:center; gap:0.375rem; min-height:1.25rem; padding:0 0.25rem 0.375rem;
  font-size:13px; color:color-mix(in oklab, var(--foreground) 72%, transparent); }
[data-story-threads] [data-story-inflight] { width:0.375rem; height:0.375rem; border-radius:9999px; background:var(--info);
  animation:story-caret 1.4s ease-in-out infinite; }
@media (prefers-reduced-motion:reduce) { [data-story-threads] [data-story-inflight] { animation:none; } }
`;

/** A Threads-like pane: the reference skin around a fixed-height mount. */
export function ThreadsChrome({ children, height }: { children: ReactNode; height?: string }): ReactNode {
    return (
        <>
            <style>{THREADS_CSS}</style>
            <div data-story-threads style={height ? ({ '--story-pane-height': height } as CSSProperties) : undefined}>
                {children}
            </div>
        </>
    );
}

/** A minimal 2A action row (Copy, and Regenerate on replies): the reveal is the skin's job. */
export function StoryActions({ message }: { message: ChatMessage }): ReactNode {
    if (message.role === 'user') return <div data-story-actions><button type="button">Edit</button></div>;
    return (
        <div data-story-actions>
            <button type="button" aria-label="Copy message">Copy</button>
            <button type="button" aria-label="Regenerate response">Retry</button>
        </div>
    );
}

// Small util a state story reuses: keep the id sequence stable across a single render tree.
export function withResetIds<T>(fn: () => T): T {
    idSeq = 0;
    return fn();
}

export { useState };
