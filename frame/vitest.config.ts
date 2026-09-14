import { defineConfig } from 'vitest/config';

export default defineConfig({
    // Linked workspace facets must share the renderer and query context with Frame.
    resolve: { dedupe: ['react', 'react-dom', '@tanstack/react-query'] },
    test: {
        environment: 'jsdom',
        server: { deps: { inline: true } },
    },
});
