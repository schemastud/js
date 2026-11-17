---
'@schemastud/messages': patch
---

The published declarations are two self-contained files again (`index.d.ts`, `react.d.ts`), with no hashed shared chunk. A consumer whose hook infers its return type from `useMessages` (`ReturnType<typeof useMessages<…>>`) can name `Messages` again, so its own declaration build no longer fails with TS2742.
