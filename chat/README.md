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
exposes the **fixed slot inventory** (`ChatSlots`): `header` · `participants` · `messageToolbar` ·
`renderSegment[type]` · `citationChrome` · `adjudicationPanel` · `participantBanner` · `composer` ·
`emptyState` / `loadingState` / `escalatedState`. An unfilled slot uses the minimal, unstyled default
render. Two HITL affordances stay distinct: `participantBanner` (transport-fed live-takeover) and
`adjudicationPanel` (the `@schemastud/verdict` shell) — the latter's socket exists but **ships unfilled**
(`Verdict = unknown`; the verdict shell is a separate effort).

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
