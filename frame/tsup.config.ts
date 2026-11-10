import { defineConfig } from 'tsup';

export default defineConfig({
    // Object form so the entries keep distinct output names (dist/index.js, dist/shadcn.js, dist/vocabulary.js,
    // dist/testing.js); a bare array would collide on the `index` basename.
    entry: {
        index: 'src/index.ts',
        shadcn: 'src/shadcn/index.tsx',
        testing: 'src/testing/index.ts',
        // Ruling 02 §8's subpaths: what leaves the root without leaving the package.
        editor: 'src/subpaths/editor.ts',
        cards: 'src/subpaths/cards.ts',
        picker: 'src/subpaths/picker.ts',
        wire: 'src/subpaths/wire.ts',
        // The session request (ticket 48): a zero-import module, so its chunk imports no bare specifier.
        session: 'src/subpaths/session.ts',
        // The Node-only build-time subpath (`@schemastud/frame/vocabulary`) the `frame-vocabulary` bin runs.
        vocabulary: 'src/vocabulary.ts',
    },
    format: ['esm'],
    dts: true,
    sourcemap: true,
    clean: true,
    // Peers stay external; seam + facets are bundled deps but resolved at runtime.
    external: [
        'react',
        'react-dom',
        '@tanstack/react-query',
        'lucide-react',
        '@rjsf/core',
        '@rjsf/shadcn',
        '@rjsf/utils',
        '@rjsf/validator-ajv8',
        '@schemastud/seam',
        '@schemastud/facets',
        '@schemastud/ui',
        'zustand',
    ],
});
