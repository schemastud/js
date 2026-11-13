---
'@schemastud/facets': minor
'@schemastud/chat': minor
'@schemastud/mainframe': minor
'@schemastud/blockdoc': minor
'@schemastud/combobox': minor
'@schemastud/breadcrumb': minor
'@schemastud/frame-remote': minor
'@schemastud/nav': minor
'@schemastud/seam': patch
---

Add the required @schemastud/messages ^0.1.0 peer and ./messages catalog exports
to the remaining packages. Hosts must install and dedupe the shared messages
runtime/context. Preserve caller-copy overrides and translate mounted surfaces.

Chat's public formatMessageTime, default message timestamps and mainframe Clock
deliberately use en-US without a MessageProvider, rather than the runtime locale.
For example, a de_DE runtime's 15:04 now renders as 3:04 PM without a provider;
mount a provider with the desired locale to retain locale-specific formatting.

Blockdoc requires @schemastud/seam ^1.0.0 for useFormValidator. The existing
seam-messages.md minor plus the pending train's peer-dependent propagation
computes seam 1.0.0 (from 0.2.2). Its development-only file:../seam link tests
the unreleased workspace source. The peer range follows the computed train-end
release; if root changes release policy so seam ships 0.3.0, this range is updated
in the release commit.

The standalone, non-workspace @schemastud/big-calendar requires a separate minor
release from 0.1.0 to 0.2.0 at train end (package and own lock metadata), before
publication. It gains the same required peer/catalog export and lazily loads
non-English date data. This changeset cannot version a non-workspace package.
