import { defineConfig } from 'tsup';

export default defineConfig({
    entry: ['src/index.ts'],
    format: ['esm'],
    dts: true,
    sourcemap: true,
    clean: true,
    // React stays external; the consumer provides the single copy.
    external: ['react', 'react-dom'],
});
