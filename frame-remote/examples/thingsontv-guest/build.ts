/**
 * Build the thingsontv guest block the way an external publisher would (RCP-07) — the
 * FIRST CONSUMER of the published guest SDK. Mirrors `examples/off-repo-guest/build.ts`:
 * the point that matters is that `component.ts` imports `@schemastud/frame-remote/sdk` by
 * its PACKAGE NAME, so the package must be INSTALLED (not reached through a sibling
 * `../src` path). This builder:
 *   1. stages a throwaway project with a `file:` dependency on the built package;
 *   2. copies the author source in;
 *   3. bundles it with esbuild, resolving the bare specifier through the installed
 *      package's `exports` map → `dist/sdk.js`.
 *
 * On top of the off-repo builder it does one extra thing the consumer needs: it defines a
 * `__THINGSONTV_REF__` global (the `@id` the seeded host wants this block to resolve),
 * injected as a plain serializable value at build time — NOT a capability, just the ref
 * the block hands to `capability('resolve', { id })`.
 *
 * `npm run build` MUST have produced `dist/` first (the `file:` install links to it).
 */
import { execFileSync } from 'node:child_process';
import { cpSync, existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
/** The frame-remote package root (two levels up from examples/thingsontv-guest). */
const packageRoot = resolve(here, '..', '..');

export interface ThingsontvBuildOptions {
    /**
     * The `@id` the block should resolve through the broker, injected as an in-VM global
     * (`globalThis.__THINGSONTV_REF__`) PREPENDED to the bundle — the plain-value path the
     * real host uses, NOT a build-time constant fold. Omit to keep the block's literal
     * fallback.
     */
    factRef?: string;
}

export interface ThingsontvBuildResult {
    /** The bundled guest source, ready to load into a `GuestVm`. */
    source: string;
    /** Whether the bundle resolved the SDK through the installed package (not src). */
    resolvedThroughPackage: boolean;
}

/**
 * Stage a `file:`-installed consumer of the built package and bundle the thingsontv block
 * against `@schemastud/frame-remote/sdk`. Returns the guest source string + a proof it
 * resolved through the package exports.
 */
export async function buildThingsontvGuest(options: ThingsontvBuildOptions = {}): Promise<ThingsontvBuildResult> {
    if (!existsSync(join(packageRoot, 'dist', 'sdk.js'))) {
        throw new Error(
            'thingsontv-guest build: dist/sdk.js is missing — run `npm run build` first. ' +
                'The consumer install links against the built dist via the package `exports`.',
        );
    }

    const stage = mkdtempSync(join(tmpdir(), 'frame-remote-thingsontv-'));
    try {
        writeFileSync(
            join(stage, 'package.json'),
            JSON.stringify(
                {
                    name: 'thingsontv-guest-fixture',
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

        execFileSync('npm', ['install', '--no-audit', '--no-fund', '--ignore-scripts', '--silent'], {
            cwd: stage,
            stdio: 'ignore',
        });

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

        const bundle = readFileSync(outFile, 'utf8');
        // Inject the resolve-ref as a plain in-VM global PREPENDED to the bundle — exactly
        // how the real host hands the guest a serializable value (never a capability, never
        // a fetch). Only when a ref is supplied; otherwise the block's literal fallback runs.
        const source =
            options.factRef != null
                ? `globalThis.__THINGSONTV_REF__ = ${JSON.stringify(options.factRef)};\n${bundle}`
                : bundle;
        const meta = JSON.parse(readFileSync(metaFile, 'utf8')) as { inputs: Record<string, unknown> };
        const inputs = Object.keys(meta.inputs);
        const resolvedThroughPackage =
            inputs.some((p) => p.replace(/\\/g, '/').includes('/dist/sdk.js')) &&
            !inputs.some((p) => p.replace(/\\/g, '/').includes('/src/'));

        return { source, resolvedThroughPackage };
    } finally {
        rmSync(stage, { recursive: true, force: true });
    }
}
