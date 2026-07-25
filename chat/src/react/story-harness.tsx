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
import { useRef, useState, type ReactNode } from 'react';
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

// Small util a state story reuses: keep the id sequence stable across a single render tree.
export function withResetIds<T>(fn: () => T): T {
    idSeq = 0;
    return fn();
}

export { useState };
