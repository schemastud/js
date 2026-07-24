import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { defineConfig } from 'vitest/config';

// The §8a isolation mount renders a live react-big-calendar tree, whose drag/overlay
// portals break under duplicate React instances (null hook dispatcher). Pin every shared
// singleton to ONE copy so the portals resolve against the same React — the same
// single-instance guarantee the app's Vite gives at runtime. Deterministic aliases beat
// `dedupe` because RBC + date-fns can be pulled from more than one node_modules root.
const require = createRequire(import.meta.url);
const pkgDir = (id: string) => dirname(require.resolve(`${id}/package.json`));
const react = pkgDir('react');
const reactDom = pkgDir('react-dom');

export default defineConfig({
    resolve: {
        alias: {
            'react/jsx-runtime': join(react, 'jsx-runtime.js'),
            'react/jsx-dev-runtime': join(react, 'jsx-dev-runtime.js'),
            'react-dom/client': join(reactDom, 'client.js'),
            react,
            'react-dom': reactDom,
            '@tanstack/react-query': pkgDir('@tanstack/react-query'),
            'react-big-calendar': pkgDir('react-big-calendar'),
            'date-fns': pkgDir('date-fns'),
        },
    },
    test: {
        environment: 'jsdom',
        globals: true,
        // Inline the view-engine deps so Vite TRANSFORMS them and the single-instance
        // aliases above actually apply (otherwise vitest hands them to node's CJS resolver,
        // which bypasses resolve.alias).
        server: {
            deps: {
                inline: [/react-big-calendar/, /date-fns/],
            },
        },
    },
});
