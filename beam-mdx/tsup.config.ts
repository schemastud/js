import { copyFileSync } from 'node:fs';

import { defineConfig } from 'tsup';

export default defineConfig({
    // Object form keeps distinct output basenames (dist/index.js + dist/vite.js);
    // a bare array would collide two `index` entries. The `vite` entry is the
    // node-side build plugin + MDX preset; `index` is the browser React surface.
    entry: { index: 'src/index.ts', vite: 'src/vite/index.ts' },
    format: ['esm'],
    dts: true,
    sourcemap: true,
    clean: true,
    // Peers + the host's build toolchain stay external — never bundled into dist.
    external: [
        'react',
        'react/jsx-runtime',
        'react-dom',
        '@inertiajs/react',
        'vite',
        '@mdx-js/rollup',
        'remark-frontmatter',
        'remark-mdx-frontmatter',
    ],
    // The base typography rides alongside the JS as a plain, importable stylesheet
    // (`@schemastud/beam-mdx/css`); satellites override the tokens it reads.
    onSuccess: async () => {
        copyFileSync('src/site-prose.css', 'dist/site-prose.css');
    },
});
