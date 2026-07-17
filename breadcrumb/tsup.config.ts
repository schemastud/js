import { defineConfig } from 'tsup';

export default defineConfig({
    entry: ['src/index.ts'],
    format: ['esm'],
    dts: true,
    sourcemap: true,
    clean: true,
    // React + the sibling combobox stay external; the consumer provides single copies.
    external: ['react', 'react-dom', '@schemastud/combobox'],
});
