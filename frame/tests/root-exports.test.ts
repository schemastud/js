// @vitest-environment node
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import { expect, it } from 'vitest';

/**
 * Each public barrel exports exactly the names in its committed list: the root in `src/index.exports.txt`, and each of
 * ruling 02 §8's subpaths (`/editor`, `/cards`, `/picker`, `/wire`) in `src/subpaths/<name>.exports.txt`. The lists are
 * the reviewed record of what a host can import from `@schemastud/frame` and its subpaths: adding, removing or moving
 * a name fails here until `npm run export-list` regenerates the lists and they are committed with the change. The
 * check compares and never writes.
 *
 * The check builds a TypeScript program over the barrel's whole import graph: about a second on
 * an idle machine, and ten on a loaded one, past vitest's 5 s default. Hence the explicit timeout.
 */
const script = resolve(import.meta.dirname, '../../scripts/export-list.mjs');

it.each([
    ['the root', '../src/index.ts'],
    ['/editor', '../src/subpaths/editor.ts'],
    ['/cards', '../src/subpaths/cards.ts'],
    ['/picker', '../src/subpaths/picker.ts'],
    ['/wire', '../src/subpaths/wire.ts'],
])('%s exports exactly the committed list', { timeout: 60_000 }, (_label, barrel) => {
    const check = spawnSync(process.execPath, [script, resolve(import.meta.dirname, barrel), '--check'], {
        encoding: 'utf8',
    });

    expect(check.status, check.stderr || check.stdout).toBe(0);
});
