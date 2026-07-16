import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        environment: 'jsdom',
        // The QuickJS WASM module + real remote-dom take a moment to boot inside the
        // VM; give the isolation/limits tests headroom without masking a real hang.
        testTimeout: 20000,
    },
});
