# @schemastud/messages

## 0.2.0

### Minor Changes

- e9b5f62: Add the shared message runtime and explicit catalog collector. ui now peer-requires @schemastud/messages; hosts must install and dedupe one copy before upgrading. Publish messages before or with ui. MoneyFormat.locale is optional: explicit locale → message locale → en-US; currency remains explicit.
- c99033c: Read shared UI and frame copy through package catalogs on the one messages peer. Preserve caller copy overrides, standalone English and explicit money currency/locale. Add a Node-only AST display-copy ratchet with read-only comparison and a baseline that may only fall. Hosts install/dedupe the released messages peer; data-only host baselines are wired after train-end publication.

  Expand display-position coverage to logical children, object defaults, message parameters, formatting helpers and DOM copy; refuse stale baselines and run the read-only comparison in CI. Translate complete picker, status, trend and money sentences. DateCell deliberately uses en-US without a message provider rather than the browser locale.
