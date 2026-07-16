import { defineConfig } from 'tsup';

export default defineConfig({
    // Three entrypoints: the umbrella (`.`), the guest SDK (runs inside the VM /
    // worker), and the host receiver (paints from the allowlist). Object form keeps
    // distinct output basenames.
    entry: {
        index: 'src/index.ts',
        guest: 'src/guest/index.ts',
        host: 'src/host/index.ts',
    },
    format: ['esm'],
    dts: true,
    sourcemap: true,
    clean: true,
    // Peers + heavy runtime deps stay external — the WASM module and remote-dom are
    // resolved at runtime by the consumer, never inlined into our dist.
    external: [
        'react',
        'react-dom',
        '@remote-dom/core',
        '@remote-dom/core/receivers',
        '@remote-dom/core/elements',
        'quickjs-emscripten',
        // The frame vocabulary seam stays external — resolved at runtime by the
        // consumer, exactly as @schemastud/frame keeps seam external.
        '@schemastud/seam',
    ],
});
