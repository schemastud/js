import { defineConfig } from 'tsup';

export default defineConfig({
    entry: {
        core: 'src/core/index.ts',
        react: 'src/react/index.ts',
    },
    format: ['esm'],
    platform: 'browser',
    dts: true,
    sourcemap: true,
    clean: true,
    // React and the schemastud socket peers (seam, blockdoc) resolve to the
    // HOST's single copies — chat carries no bundled runtime of its own yet.
    // `./core` must stay framework-agnostic: it pulls none of these.
    external: ['react', 'react-dom', 'react/jsx-runtime', '@schemastud/seam', '@schemastud/blockdoc'],
});
