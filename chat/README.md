# @schemastud/chat

The fleet's single **chat substrate** — a headless-core + slotted-view chat UI package. A peer
contribution at the seam socket ([ADR-0078](https://github.com/schemastud)), owning its own per-medium
document model (the chat message envelope, ADR-0079). **Not** built on `@schemastud/blockdoc`; blockdoc
is an optional per-medium widget peer, a plug in the same socket.

## Subpaths

- **`@schemastud/chat/core`** — the headless, framework-agnostic state machine. Owns the message
  envelope, streaming fold, roster, transport binding, and session capabilities. No React reachable
  from here (enforced by test).
- **`@schemastud/chat/react`** — the view: `useChat`, the one slotted `<ChatView>`, the fixed slot
  sockets, the four named presets, and the standard `<Composer>`. May depend on `./core`; the arrow
  never inverts.

```ts
import { createChatCore } from '@schemastud/chat/core';
import { ChatView, useChat, type ChatSlots } from '@schemastud/chat/react';

function ThreadsViewport({ transport }) {
  const chat = useChat(transport); // subscribes to core snapshots; exposes send/hydrate/requestHuman
  const slots: ChatSlots = {
    header: () => <ThreadHeader />,
    messageToolbar: (m) => <ThreadsMsgActions msg={m} />,
    renderSegment: { tool_call: ToolStep, tool_result: ToolStep },
    citationChrome: (cites) => <ThreadCitations items={cites} />,
    composer: (api) => <RichComposer onSend={api.send} disabled={api.streaming} />,
  };
  return <ChatView chat={chat} layout="viewport" slots={slots} />;
}
```

`useChat(transport)` (or `useChat({ core })`) wraps `createChatCore` in `useSyncExternalStore` and
returns `{ snapshot, send, hydrate, requestHuman, core }`. `<ChatView>` renders the message list from
the envelope — flat `content` when a message has no `segments`, the interleaved segments otherwise — and
exposes the **fixed slot inventory** (`ChatSlots`): `header` · `participants` · `messageMeta` ·
`messageToolbar` · `renderSegment[type]` · `citationChrome` · `adjudicationPanel` · `participantBanner` ·
`composer` · `jumpToLatest` · `emptyState` / `loadingState` / `escalatedState`. An unfilled slot uses the minimal, unstyled default
render. Two HITL affordances stay distinct: `participantBanner` (transport-fed live-takeover) and
`adjudicationPanel` (the `@schemastud/verdict` shell) — the latter's socket exists but **ships unfilled**
(`Verdict = unknown`; the verdict shell is a separate effort).

## View options and the `data-*` contract

The package stays headless: it ships no CSS. It records its state as `data-*` attributes, and the host
(or a preset's stylesheet) styles against them. The options below were ruled on 2026-11-02
(owner-review-20261026 ticket 17).

| `<ChatView>` prop | values (default first) | recorded as | what the host does with it |
|---|---|---|---|
| `frame` | `'bleed'` · `'contained'` | `[data-chat-view][data-frame]` | `bleed`: no box of its own. The view fills its container edge to edge, the list scrolls at the container's edge, and turns and composer share one centred column capped by `--chat-column`. `contained`: draw a box, for a mount that sits beside other content. |
| `identity` | `'byline'` · `'avatar'` | `[data-chat-view][data-identity]`, and `MessageMetaApi.identity` | `byline`: name and time above each same-author run. `avatar`: an author mark in a gutter beside the turn. |
| `follow` | `true` · `false` | `[data-chat-messages][data-following]` | The list stays on the latest turn while the reader is within 48px of the end. Once they scroll away, `[data-chat-jump]` renders the `jumpToLatest` slot (unfilled: a plain `[data-chat-jump-latest]` button). The jump is instant under `prefers-reduced-motion`. Make `[data-chat-messages]` the scroll container, and key the view by conversation (`<ChatView key={threadId}>`) so follow state never carries into another thread. |

**The `--chat-column` convention.** Under `frame="bleed"` the host sets `--chat-column` on the mount (the
flagship uses `46rem`) and pads the list and the composer to it. For example,
`padding-inline: max(0.25rem, calc((100% - var(--chat-column)) / 2))`. The scrollbar stays at the
container's edge and the text keeps a reading measure.

**Per-row anchors** on `[data-chat-message]`:

| anchor | set when | used for |
|---|---|---|
| `data-role` | always (`user` · `assistant` · `system`) | alignment and bubble treatment |
| `data-continued` | the previous turn has the same author (`author.id`, else `role`) | hide the repeated meta, tuck the turn up |
| `data-streaming`, `aria-busy="true"` | the turn is still arriving (`streaming.partial`) | the live state |
| `data-latest` | the latest non-user turn, while nothing streams | keep that turn's actions visible when every other row's actions reveal on hover or focus |
| `[data-chat-message-meta]` | `messageMeta` is filled (the `viewport` preset fills `renderMessageMeta`) | the byline: `[data-chat-author]`, `time[data-chat-time]`, `[data-chat-avatar]` |
| `[data-chat-tail]` | on a streaming turn: the flat `[data-chat-content]`, or the trailing segment when it is `text` | where the live caret goes. A trailing tool call gets no tail, so no caret follows a tool card |

A caret drawn from the tail. It covers the default renders and an override whose last child is the
final paragraph. An override that wraps its paragraphs in one more element targets that element's last
block instead (the flagship uses `[data-chat-tail] [data-chat-text] > :last-child::after`).

```css
[data-chat-tail]:not(:has(> *))::after,
[data-chat-tail] > :last-child::after { content: ''; display: inline-block; width: 0.5em; height: 1.05em;
  vertical-align: -0.15em; background: currentColor; opacity: 0.55; animation: caret 1.1s ease-in-out infinite; }
@media (prefers-reduced-motion: reduce) { [data-chat-tail] *::after, [data-chat-tail]::after { animation: none; } }
```

**Message actions (2A).** Rows' `[data-chat-message-toolbar]` rest hidden and reveal on `:hover` and
`:focus-within`. `[data-latest]` keeps its row shown, and so does `@media (hover: none)` for touch. Hide
with `opacity`, never `display` or `visibility`, so the buttons stay in the tab order and reveal on focus.

**Before the first token** nothing is drawn in the list unless `loadingState` is filled. A host that
puts the wait in its composer (as the Threads composer does) shows that status only until the reply's
first token. After that, the caret is the one moving signal.

## Presets + the standard `<Composer>`

The four named presets are plain-code `{ layout?, slots }` bundles a host spreads onto `<ChatView>` and
overrides any slot on top of — one component, config-only variants:

```tsx
import { ChatView, useChat, presets, viewport } from '@schemastud/chat/react';

// One line — the preset carries the layout + its slot fills.
function SiteAskPopover({ transport }) {
  const chat = useChat(transport);
  return <ChatView chat={chat} {...presets.siteAsk} />;
}

// Spread a preset, override just the slots this surface needs.
function ThreadsViewport({ transport }) {
  const chat = useChat(transport);
  return (
    <ChatView
      chat={chat}
      {...viewport}
      slots={{ ...viewport.slots, messageToolbar: (m) => <ThreadsMsgActions msg={m} /> }}
    />
  );
}
```

| Preset | `layout` | HITL affordance | Composer | Participants |
|---|---|---|---|---|
| `viewport` (threads) | `viewport` | adjudication panel (**wired, unfilled**) | standard `<Composer>` | roster |
| `popover` | `popover` | participant banner | standard `<Composer>` | none |
| `siteAsk` | `site-ask` | participant banner | standard `<Composer>` | none |
| `support` | `support` | banner + escalated state (+ request-human) | standard `<Composer>` | roster |

The standard **`<Composer>`** is a preset **fill** for the flat `composer(api)` slot — never baked into
`<ChatView>`. Swapping it for a bespoke input UX (e.g. the threads 3-tab rich composer) is a one-slot
override: `slots={{ ...viewport.slots, composer: (api) => <Rich {...api} /> }}`. It is host-agnostic (a
plain input + labeled Send, reflecting `streaming`/`escalated`, optional `allowRequestHuman`) — no native
`<select>`, no app vocabulary.

## Status

Core (CH-02) + `<ChatView>` + slots + `useChat` (CH-04) + the four presets + the standard `<Composer>`
(CH-05) landed. The `viewport` preset wires the `adjudicationPanel` socket but ships it unfilled until the
`@schemastud/verdict` shell exists.

## Dependency arrows (ADR-0078)

- `@schemastud/chat` **→ `@schemastud/seam`** — the medium-neutral socket (widget registry + intent bus
  + `SchemaForm` + `SelectionChrome`). Slot-injected schema composers, the intent bus, turn/participant
  chrome. rjsf is **out** of this package — slot-injected via the seam, never a chat dependency.
- `@schemastud/chat` **⇢ `@schemastud/blockdoc/react`** — an optional peer widget, used only to render a
  rich prose `body?` on a `text` segment.
- `@schemastud/chat` is **upstream of** `@splicewire/embed-chat` (which becomes a thin adapter).

## Scripts

- `npm run build` — bundle both subpaths with tsup (ESM + d.ts).
- `npm test` — run the vitest suite.
- `npm run typecheck` — `tsc --noEmit`.

## License

MIT.
