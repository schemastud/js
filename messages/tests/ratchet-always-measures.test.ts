import { mkdtempSync, mkdirSync, writeFileSync, rmSync, symlinkSync, existsSync, chmodSync, realpathSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
import { afterEach, describe, expect, it } from 'vitest';

/*
 * frame-foundation 79: the message ratchet never passes without measuring.
 *  - The bin always runs: no entry-point guard decides, so a pnpm shell shim, a wrapper or a loader reaches the gate.
 *  - A run that measures no package fails and names the config.
 *  - The library (`@schemastud/messages/ratchet`) is a module whose import runs nothing.
 */

const rooms: string[] = [];
afterEach(() => { for (const room of rooms.splice(0)) rmSync(room, { recursive: true, force: true }); });
const packageDir = dirname(dirname(new URL('../bin/schemastud-message-ratchet.mjs', import.meta.url).pathname));
const direct = join(packageDir, 'bin/schemastud-message-ratchet.mjs');

/**
 * A host laid out as pnpm lays it out: node_modules/@schemastud/messages links to the package, and node_modules/.bin holds
 * the shell shim pnpm generates for the bin (the shape of a real pnpm 10 `.bin` entry: a POSIX sh script that execs node on
 * `$basedir/../<package>/<bin>`; only the absolute NODE_PATH entries are replaced by this host's own).
 */
function host(packages: Record<string, string[]> = { fixture: ['./src'] }) {
    const root = realpathSync(mkdtempSync(join(tmpdir(), 'display-ratchet-79-'))); rooms.push(root);
    mkdirSync(join(root, 'src'));
    mkdirSync(join(root, 'node_modules/@schemastud'), { recursive: true });
    mkdirSync(join(root, 'node_modules/.bin'));
    symlinkSync(packageDir, join(root, 'node_modules/@schemastud/messages'), 'dir');
    const nodePath = join(root, 'node_modules');
    const shim = join(root, 'node_modules/.bin/schemastud-message-ratchet');
    writeFileSync(shim, `#!/bin/sh
basedir=$(dirname "$(echo "$0" | sed -e 's,\\\\,/,g')")

case \`uname\` in
    *CYGWIN*) basedir=\`cygpath -w "$basedir"\`;;
esac

if [ -z "$NODE_PATH" ]; then
  export NODE_PATH="${nodePath}"
else
  export NODE_PATH="${nodePath}:$NODE_PATH"
fi
if [ -x "$basedir/node" ]; then
  exec "$basedir/node"  "$basedir/../@schemastud/messages/bin/schemastud-message-ratchet.mjs" "$@"
else
  exec node  "$basedir/../@schemastud/messages/bin/schemastud-message-ratchet.mjs" "$@"
fi
`);
    chmodSync(shim, 0o755);
    writeFileSync(join(root, 'ratchet.json'), JSON.stringify({ version: 1, baseline: './baseline.json', packages }));
    return root;
}
const config = (root: string) => join(root, 'ratchet.json');
const node = (root: string, script: string, ...args: string[]) =>
    spawnSync(process.execPath, [script, '--config', config(root), ...args], { cwd: root, encoding: 'utf8' });
/** The shim run as a host's `pnpm exec` / `scripts` entry runs it: through sh, with node on PATH. */
const shim = (root: string, ...args: string[]) =>
    spawnSync('/bin/sh', [join(root, 'node_modules/.bin/schemastud-message-ratchet'), '--config', config(root), ...args], {
        cwd: root, encoding: 'utf8', env: { ...process.env, PATH: `${dirname(process.execPath)}:${process.env.PATH ?? ''}` },
    });

/** A baseline at one display string, then a second string planted: over the baseline. */
function overBaseline(root: string) {
    writeFileSync(join(root, 'src/view.tsx'), 'export const View = () => <p>Hello</p>');
    expect(node(root, direct, '--write').status).toBe(0);
    writeFileSync(join(root, 'src/view.tsx'), 'export const View = () => <p title="Planted">Hello</p>');
}

describe('a run that measures no package fails and names the config', () => {
    it('no packages at all', () => {
        const root = host({});
        for (const args of [[], ['--write']]) {
            const result = node(root, direct, ...args);
            expect(result.status).toBe(1);
            expect(result.stderr).toContain('Nothing measured');
            expect(result.stderr).toContain(config(root));
        }
        expect(existsSync(join(root, 'baseline.json'))).toBe(false);
    });

    it('every root matching no source file (empty, or holding only excluded and non-source files)', () => {
        const root = host();
        mkdirSync(join(root, 'src/generated'));
        writeFileSync(join(root, 'src/generated/client.tsx'), 'export const Generated = () => <p>Generated copy</p>');
        writeFileSync(join(root, 'src/view.test.tsx'), 'const test = <p>Test copy</p>');
        writeFileSync(join(root, 'src/notes.md'), 'Not a source file');
        for (const args of [['--write'], []]) {
            const result = node(root, direct, ...args);
            expect(result.status, result.stdout).toBe(1);
            expect(result.stderr).toContain('Nothing measured');
            expect(result.stderr).toContain(config(root));
            expect(result.stderr).toContain('fixture');
            expect(result.stdout).not.toContain('PASS');
        }
        expect(existsSync(join(root, 'baseline.json'))).toBe(false);
    });

    it('one package of several measuring nothing still fails, naming that package', () => {
        const root = host({ fixture: ['./src'], hollow: ['./hollow'] });
        mkdirSync(join(root, 'hollow'));
        writeFileSync(join(root, 'src/view.tsx'), 'export const View = () => <p>Hello</p>');
        const result = node(root, direct, '--write');
        expect(result.status).toBe(1);
        expect(result.stderr).toContain('Nothing measured');
        expect(result.stderr).toContain('hollow');
        expect(result.stderr).not.toContain('fixture,');
    });

    it('a package with source files and no display copy is measured, and passes at 0', () => {
        const root = host();
        writeFileSync(join(root, 'src/ids.ts'), 'export const id = 1;');
        const result = node(root, direct, '--write');
        expect(result.status, result.stderr).toBe(0);
        expect(JSON.parse(result.stdout).counts.fixture).toBe(0);
    });
});

describe('the bin always runs, however it is reached', () => {
    it("through pnpm's generated shell shim, an over-baseline run prints 'display copy increased' and exits non-zero", () => {
        const root = host();
        overBaseline(root);
        const result = shim(root);
        expect(result.status, result.stdout + result.stderr).toBe(1);
        expect(result.stderr).toContain('display copy increased');
    });

    it('through a wrapper whose argv[1] is not the bin, it still measures (no entry-point guard to miss)', () => {
        const root = host();
        overBaseline(root);
        const wrapper = join(root, 'wrapper.mjs');
        writeFileSync(wrapper, `await import(${JSON.stringify(join(root, 'node_modules/@schemastud/messages/bin/schemastud-message-ratchet.mjs'))});\n`);
        const result = node(root, wrapper);
        expect(result.status, result.stdout + result.stderr).toBe(1);
        expect(result.stderr).toContain('display copy increased');
    });

    it('through the shim, a clean run passes with counts (the gate is not merely failing)', () => {
        const root = host();
        writeFileSync(join(root, 'src/view.tsx'), 'export const View = () => <p>Hello</p>');
        expect(node(root, direct, '--write').status).toBe(0);
        const result = shim(root);
        expect(result.status, result.stderr).toBe(0);
        expect(JSON.parse(result.stdout)).toMatchObject({ status: 'PASS', counts: { fixture: 1 } });
    });
});

describe('the library module', () => {
    it('`@schemastud/messages/ratchet` resolves to the library, and importing it runs nothing', () => {
        const root = host();
        writeFileSync(join(root, 'src/view.tsx'), 'export const View = () => <p>Hello</p>');
        const importer = join(root, 'importer.mjs');
        writeFileSync(importer, [
            "const m = await import('@schemastud/messages/ratchet');",
            "console.log(import.meta.resolve('@schemastud/messages/ratchet').endsWith('/bin/ratchet-lib.mjs'));",
            "console.log(['scanDisplayStrings', 'scanConfig', 'runRatchet'].map(name => typeof m[name]).join(','));",
        ].join('\n'));
        // argv carries a full gate invocation; an import that ran it would write the baseline or print a report.
        const result = node(root, importer, '--write');
        expect(result.stderr).toBe('');
        expect(result.status).toBe(0);
        expect(result.stdout).toBe('true\nfunction,function,function\n');
        expect(existsSync(join(root, 'baseline.json'))).toBe(false);
    });
});
