---
"@schemastud/facets": patch
"@schemastud/frame": patch
---

Isolate resource reads, cached placeholders and pending mutations by injected transport.
Prevent delayed saved-view application from crossing providers, retain existing query prefixes,
and expose resourceQueryKey for transport-specific cache consumers.
