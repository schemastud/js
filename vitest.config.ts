import { defineConfig } from 'vitest/config';

export default defineConfig({
    resolve: {
        // Keep React resolving to this package's single copy so hooks work when
        // file:-linked peers (seam, blockdoc) bring their own node_modules.
        dedupe: ['react', 'react-dom'],
    },
    test: {
        // Core tests run in node (framework-agnostic); react tests opt into
        // jsdom via a `// @vitest-environment jsdom` docblock at the top of the file.
        environment: 'node',
        setupFiles: ['tests/setup.ts'],
    },
});
