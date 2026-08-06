import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        // The seam proof drives a live component tree (mode-swap under a stable host,
        // asserting state survives), so it needs a DOM — not the node default.
        environment: 'jsdom',
        globals: true,
    },
});
