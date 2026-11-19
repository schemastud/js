---
'@schemastud/chat': patch
'@schemastud/blockdoc': patch
---

Widen the optional `@schemastud/seam` peer range to the 0.x minors the package works with (frame-foundation 80): chat
`^0.2.0 || ^0.3.0 || ^0.4.0 || ^0.5.0 || ^0.6.0` (it imports nothing from seam), blockdoc `^0.3.0 || ^0.5.1 || ^0.6.0`
(it needs seam's `useFormValidator`: in this tree's seam, which the next seam minor releases as 0.3.0 here, and in the tagged
`seam@0.5.1` onwards; the tagged `seam@0.3.0` and `seam@0.4.0` of the release line do not export it, so 0.4 is left out). At the seam@0.5.2 release commit the
old ranges excluded the workspace's own seam and its `npm ci` failed.
