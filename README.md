# @schemastud/chat

The fleet's single **chat substrate** — a headless-core + slotted-view chat UI package. A peer
contribution at the seam socket ([ADR-0078](https://github.com/schemastud)), owning its own per-medium
document model (the chat message envelope, ADR-0079). **Not** built on `@schemastud/blockdoc`; blockdoc
is an optional per-medium widget peer, a plug in the same socket.

## Subpaths

- **`@schemastud/chat/core`** — the headless, framework-agnostic state machine. Owns the message
  envelope, streaming fold, roster, transport binding, and session capabilities. No React reachable
  from here (enforced by test).
- **`@schemastud/chat/react`** — the view: `<ChatView>`, the slot sockets, and the named presets. May
  depend on `./core`; the arrow never inverts.

```ts
import { CHAT_CORE } from '@schemastud/chat/core';
import { CHAT_REACT } from '@schemastud/chat/react';
```

## Status

Scaffold (CH-01). The envelope + wire union + fold engine land in CH-02; `<ChatView>` + slots in CH-04;
the four presets + `<Composer>` in CH-05.

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
