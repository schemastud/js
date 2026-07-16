/**
 * The HOST page (origin A). It loads the sandbox worker from SANDBOX_ORIGIN
 * (origin B) and paints the guest's remote-dom tree from the host-owned allowlist.
 *
 * The Worker is created from a cross-origin URL. Because a classic/module Worker
 * script must be same-origin, we fetch the worker as a Blob from origin B and boot
 * it — the worker's OWN network identity remains origin B (its `fetch`/`importScripts`
 * are origin B), which is the property we want. (In a real deployment the sandbox
 * origin serves a small bootstrap that itself imports the worker module over the
 * network so the worker's origin is unambiguously B; the Blob shim keeps the demo
 * to two vite servers.)
 */
import { createElement, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { HostReceiver } from '../../src/host/receiver.js';
import { RemoteSurface } from '../../src/host/render.js';
import type { HostToWorkerMessage, WorkerToHostMessage } from '../../src/protocol.js';
import { INTERACTIVE_GUEST } from './guest-source.js';

// In the demo the sandbox origin is a second vite server; overridable via the
// `VITE_SANDBOX_ORIGIN` env. In prod this is `SANDBOX_ORIGIN` from src/config.ts.
const SANDBOX_ORIGIN =
    (import.meta.env.VITE_SANDBOX_ORIGIN as string | undefined) ?? 'http://sandbox.frame-remote.test:4174';

async function bootWorker(): Promise<Worker> {
    // Load the worker module from the SANDBOX ORIGIN (B). vite serves TS source
    // directly in dev, so the module lives at `/worker.ts`.
    const workerUrl = new URL('/worker.ts', SANDBOX_ORIGIN).href;
    // A module worker can be pointed cross-origin when the sandbox origin sends
    // permissive CORS (the demo vite server does). If the browser refuses the
    // cross-origin worker script, fall back to a Blob bootstrap that imports it.
    try {
        return new Worker(workerUrl, { type: 'module' });
    } catch {
        const bootstrap = `import ${JSON.stringify(workerUrl)};`;
        const blob = new Blob([bootstrap], { type: 'text/javascript' });
        return new Worker(URL.createObjectURL(blob), { type: 'module' });
    }
}

function App() {
    const [status, setStatus] = useState('booting sandbox…');
    const [host] = useState(() => {
        let workerRef: Worker | null = null;
        const h = new HostReceiver({
            dispatchToGuest: (handlerId, payload) => {
                const msg: HostToWorkerMessage = { type: 'event', handlerId, payload };
                workerRef?.postMessage(msg);
            },
        });
        (h as unknown as { __setWorker: (w: Worker) => void }).__setWorker = (w) => {
            workerRef = w;
        };
        return h;
    });

    useEffect(() => {
        let worker: Worker | null = null;
        let disposed = false;
        void bootWorker().then((w) => {
            if (disposed) {
                w.terminate();
                return;
            }
            worker = w;
            (host as unknown as { __setWorker: (w: Worker) => void }).__setWorker(w);
            // Stash for the manual cross-site-fetch probe in VERIFY.md.
            (window as unknown as { __frameWorker: Worker }).__frameWorker = w;
            w.onmessage = (e: MessageEvent<WorkerToHostMessage>) => {
                const msg = e.data;
                if (msg.type === 'mutate') host.applyMutations(msg.records);
                if (msg.type === 'ready') setStatus('guest running in QuickJS VM on ' + SANDBOX_ORIGIN);
                if (msg.type === 'error') setStatus('guest failed (' + msg.kind + '): ' + msg.message);
            };
            const load: HostToWorkerMessage = { type: 'load', source: INTERACTIVE_GUEST };
            w.postMessage(load);
        });
        return () => {
            disposed = true;
            worker?.terminate();
        };
    }, [host]);

    return createElement(
        'div',
        { style: { fontFamily: 'system-ui, sans-serif', padding: 32 } },
        createElement('h1', { style: { fontSize: 16, color: '#667085' } }, 'HOST editor surface (origin A)'),
        createElement('p', { style: { fontSize: 12, color: '#98a2b3' } }, status),
        createElement(
            'div',
            { style: { padding: 24, background: '#f8f9fb', borderRadius: 16, minWidth: 460, maxWidth: 520 } },
            createElement(RemoteSurface, { host }),
        ),
    );
}

createRoot(document.getElementById('root')!).render(createElement(App));
