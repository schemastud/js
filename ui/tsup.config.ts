import { defineConfig } from 'tsup';

export default defineConfig({
    // The card board ships from its own entry (`@schemastud/ui/card-board`) so the root entry never imports its optional
    // peer `@dnd-kit/core`.
    entry: { index: 'src/index.ts', 'card-board': 'src/card-board/index.ts' },
    format: ['esm'],
    dts: true,
    sourcemap: true,
    clean: true,
    // React, Radix, TanStack Table and lucide stay external — the consumer provides the
    // single copy (Radix/Table are React-context-bearing; a duplicated copy breaks them).
    external: ['@schemastud/messages', 'react', 'react-dom', '@dnd-kit/core'],
});
