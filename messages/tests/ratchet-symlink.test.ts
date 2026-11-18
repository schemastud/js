import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync, symlinkSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { afterEach, expect, it } from 'vitest';

/*
 * frame-foundation 74: the ratchet bin runs whenever it is the entry point, however it was reached. Under pnpm a host reaches
 * it through the node_modules/@schemastud/messages SYMLINK (the .bin shim runs node on that path), and npm links .bin entries
 * to the file. Before the fix, the main guard compared the link path with the real path, main() never ran, and the gate
 * exited 0 on any input.
 */

const rooms: string[] = [];
afterEach(() => { for (const room of rooms.splice(0)) rmSync(room, { recursive: true, force: true }); });
const packageDir = dirname(dirname(new URL('../bin/schemastud-message-ratchet.mjs', import.meta.url).pathname));
const direct = join(packageDir, 'bin/schemastud-message-ratchet.mjs');

/** A host laid out as pnpm lays it out: node_modules/@schemastud/messages is a symlink to the package; .bin links to the bin. */
function host() {
    const root = mkdtempSync(join(tmpdir(), 'display-ratchet-link-')); rooms.push(root);
    mkdirSync(join(root, 'src'));
    mkdirSync(join(root, 'node_modules/@schemastud'), { recursive: true });
    mkdirSync(join(root, 'node_modules/.bin'));
    symlinkSync(packageDir, join(root, 'node_modules/@schemastud/messages'), 'dir');
    symlinkSync('../@schemastud/messages/bin/schemastud-message-ratchet.mjs', join(root, 'node_modules/.bin/schemastud-message-ratchet'));
    writeFileSync(join(root, 'ratchet.json'), JSON.stringify({ version: 1, baseline: './baseline.json', packages: { fixture: ['./src'] } }));
    return root;
}
const run = (root: string, bin: string, ...args: string[]) =>
    spawnSync(process.execPath, [bin, '--config', join(root, 'ratchet.json'), ...args], { encoding: 'utf8' });

it('runs through a symlinked package and a .bin link, so a planted display string fails the gate', () => {
    const root = host();
    writeFileSync(join(root, 'src/view.tsx'), 'export const View = () => <p>{label}</p>');
    expect(run(root, direct, '--write').status).toBe(0);
    writeFileSync(join(root, 'src/view.tsx'), 'export const View = () => <p>Planted copy</p>');

    for (const bin of [
        join(root, 'node_modules/@schemastud/messages/bin/schemastud-message-ratchet.mjs'),
        join(root, 'node_modules/.bin/schemastud-message-ratchet'),
    ]) {
        const result = run(root, bin);
        expect(result.status, bin).toBe(1);
        expect(result.stderr, bin).toContain('display copy increased');
    }
    // the direct path, as before
    expect(run(root, direct).status).toBe(1);
});

// frame-foundation 79: the library moved to bin/ratchet-lib.mjs (the bin now always runs, so it is not imported).
it('importing the library has no side effect, through the symlinked package', () => {
    const root = host();
    const importer = join(root, 'importer.mjs');
    const linked = join(root, 'node_modules/@schemastud/messages/bin/ratchet-lib.mjs');
    writeFileSync(importer, `const m = await import(${JSON.stringify(pathToFileURL(linked).href)});\nconsole.log(typeof m.scanDisplayStrings);\n`);
    const result = spawnSync(process.execPath, [importer, '--config', join(root, 'ratchet.json'), '--write'], { cwd: root, encoding: 'utf8' });
    expect(result.status).toBe(0);
    expect(result.stdout).toBe('function\n');
    expect(result.stderr).toBe('');
    expect(existsSync(join(root, 'baseline.json'))).toBe(false);
    expect(readFileSync(join(root, 'ratchet.json'), 'utf8')).toContain('"baseline":"./baseline.json"');
});
