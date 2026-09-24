import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { familyDistSources, familySourceBlock, familySources } from '../src/vite';

/**
 * beam-docs-satellite 63: a bare `@source '<dist>'` makes Tailwind scan `.d.ts` docblocks and `.js.map`
 * `sourcesContent` — five of the 218 classes the flagship's derived list added came from a docblock
 * that documents the migration AWAY from those very utilities. The `@source` the plugin emits must
 * therefore name the runtime files, never the directory.
 */

const CSS = `@import 'tailwindcss';\n.x { color: red; }\n`;

type Source = { negated: boolean; pattern: string };

/** Does one `@source` pattern (a bare directory, or `<dir>/**\/*.<ext>`) reach `file`? */
function matches(pattern: string, file: string): boolean {
    const m = /^(.*)\/\*\*\/\*\.(?:\{([^}]+)\}|([a-z.]+))$/.exec(pattern);
    if (m === null) return file.startsWith(pattern + path.sep);
    const exts = (m[2] ?? m[3]!).split(',');
    return file.startsWith(m[1] + path.sep) && exts.some((ext) => file.endsWith('.' + ext));
}

/** Would Tailwind's scanner reach `file` under the emitted block — some include, and no `not`? */
function scanned(sources: Source[], file: string): boolean {
    return (
        sources.some((s) => !s.negated && matches(s.pattern, file)) &&
        !sources.some((s) => s.negated && matches(s.pattern, file))
    );
}

function emittedSources(root: string): Source[] {
    const plugin = familySources({ root });
    const transform = plugin.transform as (this: unknown, code: string, id: string) => string | null;
    const out = transform.call({}, CSS, path.join(root, 'app.css'));
    if (out === null) return [];
    return [...out.matchAll(/@source (not )?'([^']+)';/g)].map((hit) => ({
        negated: hit[1] !== undefined,
        pattern: hit[2],
    }));
}

describe('familySources() — the scan surface is runtime code, not the dist directory', () => {
    let root: string;
    let dist: string;

    beforeEach(() => {
        root = fs.mkdtempSync(path.join(os.tmpdir(), 'seam-family-sources-'));
        dist = path.join(root, 'node_modules', '@splicewire', 'fixture', 'dist');
        fs.mkdirSync(dist, { recursive: true });
        fs.writeFileSync(path.join(dist, 'index.js'), 'export const c = "pt-12 md:inline";');
        fs.writeFileSync(path.join(dist, 'index.d.ts'), '/** docblock: [&>*]:mx-auto pb-16 */');
        fs.writeFileSync(path.join(dist, 'index.js.map'), '{"sourcesContent":["lg:grid-cols-2"]}');
        fs.writeFileSync(path.join(dist, 'index.css'), '.beam { color: red }');
    });

    afterEach(() => {
        fs.rmSync(root, { recursive: true, force: true });
    });

    it('resolves the fixture dist as a family source', () => {
        expect(familyDistSources(root)).toEqual([dist]);
    });

    it('emits a block per dist that reaches runtime files and not declarations or source maps', () => {
        const sources = emittedSources(root);

        // The include names the DIRECTORY, and the exclusions are `@source not` lines: a positive
        // `<dist>/**\/*.js` glob is silently ignored by Tailwind when the dist sits under the host's
        // gitignored node_modules (measured at the flagship, 2026-09-02 — see the docblock in vite.ts).
        expect(sources.filter((s) => !s.negated).map((s) => s.pattern)).toEqual([dist]);
        expect(sources.filter((s) => s.negated).length).toBeGreaterThan(0);

        expect(scanned(sources, path.join(dist, 'index.js'))).toBe(true);
        expect(scanned(sources, path.join(dist, 'nested', 'chunk.js'))).toBe(true);
        expect(scanned(sources, path.join(dist, 'index.d.ts'))).toBe(false);
        expect(scanned(sources, path.join(dist, 'index.js.map'))).toBe(false);
    });

    it('spells the exclusions as familySourceBlock() does, one block per dist', () => {
        const plugin = familySources({ root });
        const transform = plugin.transform as (this: unknown, code: string, id: string) => string | null;
        const out = transform.call({}, CSS, path.join(root, 'app.css'));
        expect(out).toContain(`@import 'tailwindcss';\n${familySourceBlock(dist)}\n`);
        expect(familySourceBlock(dist)).toBe(
            `@source '${dist}';\n@source not '${dist}/**/*.d.ts';\n@source not '${dist}/**/*.map';`,
        );
    });

    it('leaves a stylesheet without the tailwind import untouched', () => {
        const plugin = familySources({ root });
        const transform = plugin.transform as (this: unknown, code: string, id: string) => string | null;
        expect(transform.call({}, '.x { color: red; }', path.join(root, 'app.css'))).toBeNull();
    });
});

describe('familyDistSources() — the component theme a family package renders through', () => {
    let root: string;

    /** A minimal resolvable `@rjsf/shadcn` at `dir`, with its runtime ESM under `lib/`. */
    function theme(dir: string): string {
        fs.mkdirSync(path.join(dir, 'lib'), { recursive: true });
        fs.writeFileSync(
            path.join(dir, 'package.json'),
            JSON.stringify({ name: '@rjsf/shadcn', main: 'lib/index.js' }),
        );
        fs.writeFileSync(
            path.join(dir, 'lib', 'index.js'),
            'export const c = "dark:data-[state=checked]:bg-primary";',
        );
        return path.join(dir, 'lib');
    }

    function family(dir: string): string {
        fs.mkdirSync(path.join(dir, 'dist'), { recursive: true });
        fs.writeFileSync(path.join(dir, 'package.json'), JSON.stringify({ name: '@schemastud/seam' }));
        fs.writeFileSync(path.join(dir, 'dist', 'index.js'), 'export {};');
        return path.join(dir, 'dist');
    }

    beforeEach(() => {
        root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'seam-family-themes-')));
    });

    afterEach(() => {
        fs.rmSync(root, { recursive: true, force: true });
    });

    it('scans a hoisted @rjsf/shadcn lib once, beside the family dist (npm layout)', () => {
        const dist = family(path.join(root, 'node_modules', '@schemastud', 'seam'));
        const lib = theme(path.join(root, 'node_modules', '@rjsf', 'shadcn'));

        expect(familyDistSources(root)).toEqual([dist, lib]);
    });

    it('finds the theme from the family package real location when it is not hoisted (pnpm layout)', () => {
        const store = path.join(root, 'node_modules', '.pnpm', 'seam@0', 'node_modules');
        family(path.join(store, '@schemastud', 'seam'));
        const lib = theme(path.join(store, '@rjsf', 'shadcn'));
        fs.mkdirSync(path.join(root, 'node_modules', '@schemastud'), { recursive: true });
        fs.symlinkSync(path.join(store, '@schemastud', 'seam'), path.join(root, 'node_modules', '@schemastud', 'seam'));

        const sources = familyDistSources(root);

        expect(sources).toContain(lib);
        expect(sources).toHaveLength(2);
    });

    it('emits no theme source when no family package or host resolves one', () => {
        const dist = family(path.join(root, 'node_modules', '@schemastud', 'seam'));

        expect(familyDistSources(root)).toEqual([dist]);
    });
});
