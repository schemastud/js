import { defineConfig } from 'tsup';

export default defineConfig({
    // Object form so the entries keep distinct output names (dist/index.js, dist/shadcn.js,
    // dist/testing.js); a bare array would collide on the `index` basename.
    entry: { index: 'src/index.ts', shadcn: 'src/shadcn/index.tsx', testing: 'src/testing/index.ts' },
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
