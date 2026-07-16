import { defineConfig } from 'tsup';

export default defineConfig({
    entry: ['src/index.ts'],
    format: ['esm'],
    dts: true,
    sourcemap: true,
    clean: true,
    // Peers stay external; the consuming app provides the single copy of each.
    external: ['react', 'react-dom', '@tanstack/react-query', 'lucide-react'],
});
