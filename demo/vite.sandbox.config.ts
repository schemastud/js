import { defineConfig } from 'vite';

/**
 * SANDBOX server — origin B. Serves the worker that hosts the QuickJS VM. Runs on a
 * DIFFERENT registrable host than the host server (origin A), so anything the worker
 * does on the network is cross-site.
 *
 * The worker is built as an entry named `worker` so it is reachable at
 * `SANDBOX_ORIGIN/worker.js` from origin A. `cors: true` lets origin A boot it.
 */
export default defineConfig({
    root: 'demo/sandbox',
    server: {
        host: 'sandbox.frame-remote.test',
        port: 4174,
        strictPort: true,
        cors: true,
    },
    build: {
        rollupOptions: {
            input: { worker: 'demo/sandbox/worker.ts', index: 'demo/sandbox/index.html' },
        },
    },
});
