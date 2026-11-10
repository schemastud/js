// @vitest-environment node
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { buildVocabulary, runVocabulary, serializeVocabulary, type FrameVocabulary } from '../src/vocabulary';

/**
 * frame-foundation 33 (ruling 05 §2, slice 1): frame's vocabulary, built from source, is the committed default file,
 * and the `frame-vocabulary` bin adds a host kit's names, reports kits that disagree, and refuses what frame cannot
 * read. Runs under Node: the module is build-time and must not need a DOM.
 */

const FRAME = resolve(import.meta.dirname, '..');
const DEFAULT_FILE = join(FRAME, 'vocabulary.default.json');
const REGENERATE = 'pnpm --filter @schemastud/frame frame:vocabulary --write';
const fixture = (name: string) => join(import.meta.dirname, 'fixtures/vocabulary', name);
/** The test's loader: vitest's own import of a TSX module (the bin's Vite path is proved by the bin case below). */
const load = (specifier: string) => import(specifier);
const tmpHost = () => mkdtempSync(join(tmpdir(), 'frame-vocabulary-'));

describe('frame vocabulary', () => {
    it('a registry built from source equals the committed default file', () => {
        expect(existsSync(DEFAULT_FILE), `vocabulary.default.json is missing. Run \`${REGENERATE}\`.`).toBe(true);
        const committed = readFileSync(DEFAULT_FILE, 'utf8');
        expect(committed.trim(), `vocabulary.default.json is empty. Run \`${REGENERATE}\`.`).not.toBe('');
        expect(serializeVocabulary(buildVocabulary()), `vocabulary.default.json is stale. Run \`${REGENERATE}\`.`).toBe(committed);
    });

    it('holds the stock names with their node types, seam’s four, the seven cards and the five column kinds', () => {
        const { widgets, contexts, formModes, reserved, conflicts }: FrameVocabulary = buildVocabulary();

        expect(contexts).toEqual(['edit', 'detail', 'list-column', 'list-item', 'row-cell', 'summary', 'overview']);
        expect(formModes).toEqual(['enriched', 'bare']);
        expect(reserved).toEqual(['row-actions']);
        expect(conflicts).toBeUndefined();

        // RJSF's 25 stock names: each has one unscoped registration naming its node types.
        const stock = Object.entries(widgets).filter(([, regs]) => regs.some((r) => r.contexts === undefined && r.stock));
        expect(stock).toHaveLength(25);
        expect(widgets.textarea).toEqual([{ stock: ['string'] }]);
        expect(widgets.checkbox).toEqual([{ stock: ['boolean'] }]);
        for (const [, regs] of stock) expect(regs.find((r) => r.stock)!.stock!.length).toBeGreaterThan(0);

        for (const name of ['combobox', 'json', 'button-group', 'star-rating']) expect(widgets[name]).toEqual([{}]);
        for (const name of ['stat-row', 'figure-card', 'recent-list', 'record-line', 'nav-tile', 'dashboard-card', 'trend-card']) {
            expect(widgets[name]).toEqual([{}]);
        }

        // Frame's list-column kind first, then seam's stock registration (27).
        // RJSF's own node types for the stock name, by `hasWidget`: `text` is valid on numbers as well as strings.
        expect(widgets.text).toEqual([{ contexts: ['list-column'] }, { stock: ['integer', 'number', 'string'] }]);
        expect(widgets.date).toEqual([{ contexts: ['list-column'] }, { stock: ['string'] }]);
        for (const name of ['badge', 'badges', 'number']) expect(widgets[name]).toEqual([{ contexts: ['list-column'] }]);
    });

    it("a TSX module passed as --widgets adds its names; one kit writes no conflicts key", async () => {
        const host = tmpHost();
        const result = await runVocabulary({ widgets: [fixture('kit-a.tsx')], out: 'vocabulary.json', write: true, cwd: host, load });
        expect(result.exitCode).toBe(0);
        const written = JSON.parse(readFileSync(join(host, 'vocabulary.json'), 'utf8')) as FrameVocabulary;
        expect(written.widgets['host-rating']).toEqual([{}]);
        expect('conflicts' in written).toBe(false);
    });

    it('two kits that bind one name differently put it under conflicts, in KNOWN_CONTEXTS order', async () => {
        const host = tmpHost();
        const result = await runVocabulary({
            widgets: [fixture('kit-a.tsx'), fixture('kit-b.tsx')],
            out: 'vocabulary.json',
            write: true,
            cwd: host,
            load,
        });
        expect(result.exitCode).toBe(0);
        const written = JSON.parse(readFileSync(join(host, 'vocabulary.json'), 'utf8')) as FrameVocabulary;
        expect(written.widgets['shared-name']).toEqual([{}, { stock: ['string'] }]);
        expect(written.conflicts).toEqual({
            'shared-name': ['edit', 'detail', 'list-column', 'list-item', 'row-cell', 'summary', 'overview'],
        });
    });

    it('compares without --write: 1 when missing or different, 0 when current', async () => {
        const host = tmpHost();
        const run = (write: boolean) => runVocabulary({ widgets: [], out: 'vocabulary.json', write, cwd: host, load });

        expect((await run(false)).exitCode).toBe(1);
        expect((await run(true)).exitCode).toBe(0);
        expect((await run(false)).exitCode).toBe(0);
        writeFileSync(join(host, 'vocabulary.json'), readFileSync(join(host, 'vocabulary.json'), 'utf8').replace('"badge"', '"bagde"'));
        const stale = await run(false);
        expect(stale.exitCode).toBe(1);
        expect(stale.message).toContain('frame-vocabulary --write');
    });

    it('a registration scoped to a context frame does not know exits 2, naming it', async () => {
        const result = await runVocabulary({ widgets: [fixture('kit-nope.tsx')], out: 'vocabulary.json', write: true, cwd: tmpHost(), load });
        expect(result.exitCode).toBe(2);
        expect(result.message).toContain('"nope"');
    });

    it('the built bin resolves an import-only package from the host, and refuses an unexported subpath', () => {
        // A host outside frame whose node_modules alone holds an import-only kit package.
        const host = tmpHost();
        writeFileSync(join(host, 'package.json'), JSON.stringify({ name: 'host', private: true, type: 'module' }));
        const kit = join(host, 'node_modules/@fixture/kit');
        mkdirSync(kit, { recursive: true });
        writeFileSync(join(kit, 'package.json'), JSON.stringify({ name: '@fixture/kit', type: 'module', exports: { '.': { import: './index.mjs' } } }));
        writeFileSync(
            join(kit, 'index.mjs'),
            "export default function widgets(registry) { registry.registerWidget('fixture-kit-name', 'textarea'); }\n",
        );
        const bin = join(FRAME, 'bin/frame-vocabulary.mjs');
        const run = (spec: string) =>
            spawnSync(process.execPath, [bin, '--widgets', spec, '--out', join(host, 'vocabulary.json'), '--write'], {
                cwd: host,
                encoding: 'utf8',
            });

        const ok = run('@fixture/kit');
        expect(ok.status, ok.stderr).toBe(0);
        const written = JSON.parse(readFileSync(join(host, 'vocabulary.json'), 'utf8')) as FrameVocabulary;
        expect(written.widgets['fixture-kit-name']).toEqual([{ stock: ['string'] }]);

        const refused = run('@fixture/kit/nope');
        expect(refused.status).toBe(2);
        expect(refused.stderr).toContain('ERR_PACKAGE_PATH_NOT_EXPORTED');
    }, 60_000);
});
