import { defineConfig } from 'vitest/config';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

// `@schemastud/seam` is a symlinked `file:` sibling (mirrors how @schemastud/frame
// depends on seam). Vite follows the symlink and would otherwise resolve seam's
// bare `@rjsf/*` imports from seam's OWN dir (which has none). We only use seam's
// pure `WidgetRegistry` (registry.ts imports types only) — but seam's barrel eagerly
// imports the RJSF theme stack, so we alias those specifiers to frame-remote's own
// installed copies (devDeps) so the symlinked barrel resolves. None of this ships:
// seam stays `external` in tsup, so the RJSF stack never enters our dist.
const linkedDepAlias = Object.fromEntries(
    ['@rjsf/core', '@rjsf/shadcn', '@rjsf/utils', '@rjsf/validator-ajv8'].map((pkg) => [
        pkg,
        require.resolve(pkg),
    ]),
);

export default defineConfig({
    resolve: {
        alias: linkedDepAlias,
        // The symlinked seam barrel imports bare `react`; dedupe resolves it (and
        // keeps a single React copy) from frame-remote's own node_modules rather than
        // seam's (which has none). Frame-remote's own tests import react/react-dom
        // directly and resolve normally — no alias needed for those.
        dedupe: ['react', 'react-dom'],
    },
    test: {
        environment: 'jsdom',
        // The QuickJS WASM module + real remote-dom take a moment to boot inside the
        // VM; give the isolation/limits tests headroom without masking a real hang.
        testTimeout: 20000,
    },
});
