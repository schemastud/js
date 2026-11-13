---
'@schemastud/messages': minor
'@schemastud/ui': minor
---

Add the shared message runtime and explicit catalog collector. ui now peer-requires @schemastud/messages; hosts must install and dedupe one copy before upgrading. Publish messages before or with ui. MoneyFormat.locale is optional: explicit locale → message locale → en-US; currency remains explicit.
