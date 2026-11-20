---
'@schemastud/blockdoc': patch
'@schemastud/breadcrumb': patch
'@schemastud/chat': patch
'@schemastud/combobox': patch
'@schemastud/facets': patch
'@schemastud/frame': patch
'@schemastud/frame-remote': patch
'@schemastud/mainframe': patch
'@schemastud/nav': patch
'@schemastud/seam': patch
'@schemastud/ui': patch
---

Widen the `@schemastud/messages` devDependency range from `^0.1.0` to `>=0.1.0 <1`, the shape these packages' messages
peer already has (frame-foundation 81). A messages minor such as 0.2.1 then stays inside every sibling's range, so the
workspace installs at its release commit instead of fetching messages from the registry.

Also widen chat's optional `@schemastud/blockdoc` peer to `^0.1.0 || ^0.2.0 || ^0.3.0`: blockdoc's release line is at 0.3.0, and
chat imports nothing from blockdoc (a comment and a bundler external only), so every released blockdoc minor works with it.
