---
'@schemastud/frame': patch
---

The `link` list-column kind now draws as a link: its anchor, the default one or the host's `renderLink`, takes the
card links' `text-primary hover:underline` class. It also links only a site-relative href, an `http:` / `https:` URL,
or a protocol-relative `//host` / `/\host`, judged after trimming and dropping the tab and newline characters browsers
ignore; any other href (`javascript:`, `data:`, `vbscript:`, any other scheme, a bare relative path) renders as `text`.
