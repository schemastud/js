import { defineConfig } from 'tsup';

export default defineConfig({
    entry: ['src/index.ts'],
    format: ['esm'],
    dts: true,
    sourcemap: true,
    clean: true,
    // React, Radix, TanStack Table and lucide stay external — the consumer provides the
    // single copy (Radix/Table are React-context-bearing; a duplicated copy breaks them).
    external: ['react', 'react-dom'],
});
