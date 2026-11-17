---
'@schemastud/messages': minor
---

`MessageProvider` accepts `value: ClientCatalog | null`. With `null` it re-provides the outer provider's options unchanged (the same object, so consumers don't re-render) and ignores its own `pseudo`, inheriting the outer setting; at the root, `null` behaves exactly like no provider. It always renders the same Provider element, so a host can render `<MessageProvider value={catalog ?? null}>` and keep one tree shape (and its state) when a page gains or loses a catalog, instead of switching between a fragment and a provider. Adds `jsdom` as a dev dependency for the remount test.
