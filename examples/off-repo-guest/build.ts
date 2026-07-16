/**
 * Build the off-repo component the way an external publisher would — proving the
 * published SDK entry is authorable from outside the repo, not just via a relative
 * `../src` shortcut.
 *
 * The fidelity that matters: `component.ts` imports `@schemastud/frame-remote/sdk` by
 * its PACKAGE NAME. For that specifier to resolve, the package must be INSTALLED, not
 * reached through a sibling path. So this builder:
 *   1. stages a throwaway project in a temp dir with a `file:` dependency on the
 *      built package (the same install an `npm install @schemastud/frame-remote`
 *      would do off-repo, minus the registry round-trip);
 *   2. copies the author source in;
 *   3. bundles it with esbuild, resolving `@schemastud/frame-remote/sdk` through the
 *      installed package's `exports` map → `dist/sdk.js`.
 * The result is a single self-contained guest source string, ready to `vm.load(...)`.
 *
 * `npm run build` MUST have produced `dist/` first (the `file:` install links to it);
 * the builder asserts that so the failure is legible rather than a resolve error.
 */
import { execFileSync } from 'node:child_process';
import { cpSync, existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
/** The frame-remote package root (two levels up from examples/off-repo-guest). */
const packageRoot = resolve(here, '..', '..');

export interface OffRepoBuildResult {
    /** The bundled guest source, ready to load into a `GuestVm`. */
    source: string;
    /** Whether the bundle resolved the SDK through the installed package (not src). */
    resolvedThroughPackage: boolean;
}

/**
 * Stage a `file:`-installed consumer of the built package and bundle the off-repo
 * component against `@schemastud/frame-remote/sdk`. Returns the guest source string.
 */
export async function buildOffRepoGuest(): Promise<OffRepoBuildResult> {
    if (!existsSync(join(packageRoot, 'dist', 'sdk.js'))) {
        throw new Error(
            'off-repo-guest build: dist/sdk.js is missing — run `npm run build` first. ' +
                'The off-repo install links against the built dist via the package `exports`.',
        );
    }

    const stage = mkdtempSync(join(tmpdir(), 'frame-remote-off-repo-'));
    try {
        // A throwaway external project that depends on the built package by `file:`.
        writeFileSync(
            join(stage, 'package.json'),
            JSON.stringify(
                {
                    name: 'off-repo-guest-fixture',
                    version: '0.0.0',
                    private: true,
                    type: 'module',
                    dependencies: { '@schemastud/frame-remote': `file:${packageRoot}` },
                },
                null,
                2,
            ),
        );
        cpSync(join(here, 'component.ts'), join(stage, 'component.ts'));

        // Install ONLY the package under test — no scripts, no audit, no package-lock
        // churn. This materializes node_modules/@schemastud/frame-remote from `file:`.
        execFileSync('npm', ['install', '--no-audit', '--no-fund', '--ignore-scripts', '--silent'], {
            cwd: stage,
            stdio: 'ignore',
        });

        // Bundle the author source. `@schemastud/frame-remote/sdk` now resolves through
        // the INSTALLED package's exports map (node_modules), exactly as it would for a
        // real external consumer — never through this repo's src.
        //
        // We invoke the esbuild CLI in a child process rather than the in-process API:
        // this builder is imported from a vitest suite whose environment is jsdom, and
        // esbuild's in-process API asserts a `TextEncoder`/`Uint8Array` invariant that
        // jsdom's realm breaks. A child `node` process has pristine globals. The bundle
        // + metafile land on disk and we read them back.
        const outFile = join(stage, 'bundle.mjs');
        const metaFile = join(stage, 'meta.json');
        const esbuildBin = resolve(packageRoot, 'node_modules', '.bin', 'esbuild');
        execFileSync(
            esbuildBin,
            [
                join(stage, 'component.ts'),
                '--bundle',
                '--format=esm',
                '--platform=neutral',
                `--outfile=${outFile}`,
                `--metafile=${metaFile}`,
                '--log-level=silent',
            ],
            { cwd: stage, stdio: 'ignore' },
        );

        const source = readFileSync(outFile, 'utf8');
        const meta = JSON.parse(readFileSync(metaFile, 'utf8')) as { inputs: Record<string, unknown> };
        // Confirm the bare package specifier resolved through the `exports` map to the
        // BUILT dist entry — not to any in-repo `src/`. (A `file:` install symlinks
        // node_modules, so esbuild records the symlink target: the package's real
        // `dist/sdk.js`. The load-bearing fact is that `@schemastud/frame-remote/sdk`
        // — a bare package specifier — resolved at all, and landed on `dist/sdk.js`,
        // which only the package `exports` map can do; a src-relative import couldn't
        // even name that specifier.)
        const inputs = Object.keys(meta.inputs);
        const resolvedThroughPackage =
            inputs.some((p) => p.replace(/\\/g, '/').includes('/dist/sdk.js')) &&
            !inputs.some((p) => p.replace(/\\/g, '/').includes('/src/'));

        return { source, resolvedThroughPackage };
    } finally {
        rmSync(stage, { recursive: true, force: true });
    }
}
