---
'@schemastud/messages': minor
---

Package and host catalogs may carry translator notes: an optional `notes` map of `key → note` (each key in the catalog's `messages`; each note a non-empty string of at most 500 characters). `schemastud-messages collect` validates them and writes them to a sibling `payload.notes` in the collected artifact, never inside a `{default, owner}` entry. With no notes, the artifact and its digest are byte-identical to before. The runtime ignores notes.
