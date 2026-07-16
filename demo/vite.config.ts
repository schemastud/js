import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * HOST server — origin A. Serves the host page and a tiny `/whoami` endpoint that
 * echoes back which cookies the request carried. This is the endpoint the cross-site
 * cookie demonstration hits: a request from origin B (the sandbox) must arrive here
 * with NO first-party cookie of origin A. See VERIFY.md.
 */
function whoamiEndpoint(): Plugin {
    return {
        name: 'frame-remote-whoami',
        configureServer(server) {
            server.middlewares.use('/whoami', (req, res) => {
                const cookie = req.headers.cookie ?? '';
                res.setHeader('content-type', 'application/json');
                // Permissive CORS so the browser lets origin B read the response (the
                // credentialed request itself is what we inspect server-side).
                res.setHeader('access-control-allow-origin', req.headers.origin ?? '*');
                res.setHeader('access-control-allow-credentials', 'true');
                console.log('[origin A /whoami] cookie header =', JSON.stringify(cookie));
                res.end(
                    JSON.stringify({
                        origin: 'A (host)',
                        receivedCookieHeader: cookie,
                        sawFirstPartyCookie: cookie.includes('sw_session'),
                    }),
                );
            });
        },
    };
}

export default defineConfig({
    root: 'demo/host',
    plugins: [react(), whoamiEndpoint()],
    server: {
        host: 'frame-remote.test',
        port: 4173,
        strictPort: true,
        cors: true,
    },
});
