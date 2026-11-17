---
"@schemastud/messages": patch
---

The display-copy ratchet bin now runs when reached through a symlink: a pnpm host's `node_modules/@schemastud/messages` link or a `.bin` link. Its entry guard compared the link path with the real path, so `main()` never ran and every pnpm host's `lint:messages` passed vacuously. It now compares real paths; importing the module still runs nothing.
