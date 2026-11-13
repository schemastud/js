import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
import { afterEach, expect, it } from 'vitest';

const rooms: string[] = [];
afterEach(() => { for (const room of rooms.splice(0)) rmSync(room, { recursive: true, force: true }); });
const cli = new URL('../bin/schemastud-message-ratchet.mjs', import.meta.url).pathname;
function fixture() {
    const root = mkdtempSync(join(tmpdir(), 'display-ratchet-')); rooms.push(root);
    mkdirSync(join(root, 'src'));
    writeFileSync(join(root, 'ratchet.json'), JSON.stringify({ version: 1, baseline: './baseline.json', packages: { fixture: ['./src'] } }));
    return root;
}
function run(root: string, ...args: string[]) { return spawnSync(process.execPath, [cli, '--config', join(root, 'ratchet.json'), ...args], { encoding: 'utf8' }); }

it('comparison is read-only and new JSX or display-prop copy fails the package baseline', () => {
    const root = fixture();
    writeFileSync(join(root, 'src/view.tsx'), 'export const View = () => <p>Hello</p>');
    expect(run(root, '--write').status).toBe(0);
    const before = readFileSync(join(root, 'baseline.json'), 'utf8');
    expect(run(root).status).toBe(0);
    expect(readFileSync(join(root, 'baseline.json'), 'utf8')).toBe(before);
    writeFileSync(join(root, 'src/view.tsx'), 'export const View = () => <p title="Greeting">Hello</p>');
    expect(run(root).status).toBe(1);
    expect(run(root, '--write').status).toBe(1);
    expect(readFileSync(join(root, 'baseline.json'), 'utf8')).toBe(before);
});

it('a baseline may fall and technical attributes, tests and catalog values do not count', () => {
    const root = fixture();
    writeFileSync(join(root, 'src/view.tsx'), 'export const View = () => <p>Hello</p>');
    expect(run(root, '--write').status).toBe(0);
    writeFileSync(join(root, 'src/view.tsx'), 'export const View = () => <p className="hello world" data-state="ready">{t("fixture::messages.hello")}</p>');
    writeFileSync(join(root, 'src/view.test.tsx'), 'const test = <p>Test copy</p>');
    expect(run(root, '--write').status).toBe(0);
    expect(JSON.parse(readFileSync(join(root, 'baseline.json'), 'utf8')).counts.fixture).toBe(0);
    expect(run(root).status).toBe(0);
});

it('templates, fallbacks, local constants and display defaults count while technical values do not', () => {
    const root = fixture();
    writeFileSync(join(root, 'src/view.tsx'), 'const greeting = "Welcome"; export function View({label = "Name"}) { return <p title={label ?? "Guest"}>{greeting}{`Hello ${name}`}</p> }');
    expect(run(root, '--write').status).toBe(0);
    expect(JSON.parse(readFileSync(join(root, 'baseline.json'), 'utf8')).counts.fixture).toBe(4);
});

it('missing roots, invalid config and unknown package baselines refuse instead of reporting zero', () => {
    const root = fixture();
    writeFileSync(join(root, 'baseline.json'), JSON.stringify({ version: 1, counts: { stale: 0 } }));
    expect(run(root).status).toBe(1);
    writeFileSync(join(root, 'ratchet.json'), JSON.stringify({ version: 1, baseline: './baseline.json', packages: { fixture: ['./missing'] } }));
    expect(run(root, '--write').status).toBe(1);
    writeFileSync(join(root, 'ratchet.json'), JSON.stringify({ version: 2, baseline: './baseline.json', packages: { fixture: ['./src'] } }));
    expect(run(root).status).toBe(1);
});
