# @schemastud/blockdoc

## 0.2.0

### Minor Changes

- 77daa17: Add the required @schemastud/messages >=0.1.0 <1 peer and ./messages catalog exports
  to the remaining packages. Hosts must install and dedupe the shared messages
  runtime/context. Preserve caller-copy overrides and translate mounted surfaces.

  Chat's public formatMessageTime, default message timestamps and mainframe Clock
  deliberately use en-US without a MessageProvider, rather than the runtime locale.
  For example, a de_DE runtime's 15:04 now renders as 3:04 PM without a provider;
  mount a provider with the desired locale to retain locale-specific formatting.

  Blockdoc requires @schemastud/seam ^0.3.0 for useFormValidator. The existing
  seam-messages.md minor advances seam 0.2.2 to 0.3.0 under the owner's corrected
  0.x release policy. Its development-only file:../seam link tests the unreleased
  workspace source. The peer range follows the computed train-end release.

  The standalone, non-workspace @schemastud/big-calendar requires a separate minor
  release from 0.1.0 to 0.2.0 at train end (package and own lock metadata), before
  publication. It gains the same required peer/catalog export and lazily loads
  non-English date data. This changeset cannot version a non-workspace package.

### Patch Changes

- 8852ccd: Widen the `@schemastud/messages` devDependency range from `^0.1.0` to `>=0.1.0 <1`, the shape these packages' messages
  peer already has (frame-foundation 81). A messages minor such as 0.2.1 then stays inside every sibling's range, so the
  workspace installs at its release commit instead of fetching messages from the registry.

  Also widen chat's optional `@schemastud/blockdoc` peer to `^0.1.0 || ^0.2.0 || ^0.3.0`: blockdoc's release line is at 0.3.0, and
  chat imports nothing from blockdoc (a comment and a bundler external only), so every released blockdoc minor works with it.

- 3fcfa0f: Widen the optional `@schemastud/seam` peer range to the 0.x minors the package works with (frame-foundation 80): chat
  `^0.2.0 || ^0.3.0 || ^0.4.0 || ^0.5.0 || ^0.6.0` (it imports nothing from seam), blockdoc `^0.3.0 || ^0.5.1 || ^0.6.0`
  (it needs seam's `useFormValidator`: in this tree's seam, which the next seam minor releases as 0.3.0 here, and in the tagged
  `seam@0.5.1` onwards; the tagged `seam@0.3.0` and `seam@0.4.0` of the release line do not export it, so 0.4 is left out). At the seam@0.5.2 release commit the
  old ranges excluded the workspace's own seam and its `npm ci` failed.
