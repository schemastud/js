import { defineConfig } from 'tsup';

export default defineConfig({
    entry: ['src/index.ts', 'src/vite.ts'],
    format: ['esm'],
    dts: true,
    sourcemap: true,
    clean: true,
    // Peers stay external; consumers provide the single copy.
    // `vite` is external for the same reason the peers are: the consumer owns the single copy. It is
    // only reachable from `src/vite.ts` (the `./vite` subpath), which is Node-only and never enters a
    // browser bundle.
    external: ['react', 'react-dom', '@rjsf/core', '@rjsf/shadcn', '@rjsf/utils', '@rjsf/validator-ajv8', 'vite'],
});
