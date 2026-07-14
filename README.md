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
  sockets, and (CH-05) the named presets. May depend on `./core`; the arrow never inverts.

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

## Status

Core (CH-02) + `<ChatView>` + slots + `useChat` (CH-04) landed. The four presets + the standard
`<Composer>` land in CH-05 as `Partial<ChatSlots>` bundles spread onto `<ChatView>`.

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
