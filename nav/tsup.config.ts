import { defineConfig } from 'tsup';

export default defineConfig({
    entry: ['src/index.ts'],
    format: ['esm'],
    dts: true,
    sourcemap: true,
    clean: true,
    // React is a peer; the consuming app provides the single copy.
    external: ['@schemastud/messages', '@schemastud/messages/react', 'react', 'react/jsx-runtime'],
});
