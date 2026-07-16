import { defineConfig } from 'tsup';

export default defineConfig({
    entry: ['src/index.ts'],
    format: ['esm'],
    dts: true,
    sourcemap: true,
    clean: true,
    // Peers stay external; consumers provide the single copy.
    external: ['react', 'react-dom', '@rjsf/core', '@rjsf/shadcn', '@rjsf/utils', '@rjsf/validator-ajv8'],
});
