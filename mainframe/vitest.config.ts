import { defineConfig } from 'vitest/config';

export default defineConfig({
    // @schemastud/frame-remote (the `remote` fill mode's isolation substrate) is a symlinked
    // workspace sibling peering on react/react-dom; dedupe them to a single instance so a
    // consumed RemoteSurface shares this package's React (mirrors beam-mainframe's ticket-01 fix).
    resolve: { dedupe: ['react', 'react-dom'] },
    test: {
        // The seam proof drives a live component tree (mode-swap under a stable host,
        // asserting state survives), so it needs a DOM — not the node default.
        environment: 'jsdom',
        globals: true,
    },
});
