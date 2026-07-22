import { defineConfig } from 'tsup';

export default defineConfig({
    entry: ['src/index.ts'],
    format: ['esm'],
    dts: true,
    sourcemap: true,
    clean: true,
    // React is a peer; the consuming app provides the single copy.
    external: ['react', 'react/jsx-runtime'],
});
