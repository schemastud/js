import { defineConfig } from 'tsup';

export default defineConfig({
    // Object form so both entries keep distinct output names (dist/index.js +
    // dist/shadcn.js); a bare array would collide on the `index` basename.
    entry: { index: 'src/index.ts', shadcn: 'src/shadcn/index.tsx' },
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
    ],
});
