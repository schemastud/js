// @vitest-environment node
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import { expect, it } from 'vitest';

/**
 * The root barrel exports exactly the names in `src/index.exports.txt`. The list is the reviewed
 * record of what a host can import from `@schemastud/frame`: adding, removing or moving a root name
 * fails here until `npm run export-list` regenerates the list and it is committed with the change.
 * The check compares and never writes.
 */
it('the root barrel exports exactly the committed list', () => {
    const script = resolve(import.meta.dirname, '../../scripts/export-list.mjs');
    const barrel = resolve(import.meta.dirname, '../src/index.ts');

    const check = spawnSync(process.execPath, [script, barrel, '--check'], { encoding: 'utf8' });

    expect(check.status, check.stderr || check.stdout).toBe(0);
});
