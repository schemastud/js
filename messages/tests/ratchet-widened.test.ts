import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
import { afterEach, describe, expect, it } from 'vitest';

// frame-foundation 65: the census counts copy that reaches rendered output by five more routes. Each sink has a fixture
// that counts and a technical near-miss that does not; the unscanned shapes are printed on PASS and FAIL; a baseline
// measured by another scanner fails a rise with a re-measure message instead of "display copy increased".
const rooms: string[] = [];
afterEach(() => { for (const room of rooms.splice(0)) rmSync(room, { recursive: true, force: true }); });
const cli = new URL('../bin/schemastud-message-ratchet.mjs', import.meta.url).pathname;
function fixture(extra: Record<string, unknown> = {}) {
    const root = mkdtempSync(join(tmpdir(), 'display-ratchet-widened-')); rooms.push(root);
    mkdirSync(join(root, 'src'));
    writeFileSync(join(root, 'ratchet.json'), JSON.stringify({ version: 1, baseline: './baseline.json', packages: { fixture: ['./src'] }, ...extra }));
    return root;
}
function run(root: string, ...args: string[]) { return spawnSync(process.execPath, [cli, '--config', join(root, 'ratchet.json'), ...args], { encoding: 'utf8' }); }
function texts(root: string, files: Record<string, string>) {
    for (const [name, source] of Object.entries(files)) writeFileSync(join(root, 'src', name), source);
    const result = run(root, '--write');
    expect(result.status, result.stderr).toBe(0);
    return (JSON.parse(result.stdout).findings.fixture as { text: string }[]).map((item) => item.text);
}

const sinks: { name: string; files: Record<string, string>; counts: string[]; misses: string[]; config?: Record<string, unknown> }[] = [
    {
        name: '1. notifier calls (first argument, and a description)',
        files: { 'view.ts': [
            'toast("Toast copy"); toast.success("Saved copy", {description: "Toast description"}); toast.error(`Failed ${name}`);',
            'notify("Notify copy"); notifier.warn("Notifier copy");',
            'toast.dismiss("toast-id"); toast.success("Saved copy 2", {id: "save-toast"}); notify.error("Unlisted callee");',
        ].join('\n') },
        counts: ['Toast copy', 'Saved copy', 'Toast description', 'Failed …', 'Notify copy', 'Notifier copy', 'Saved copy 2'],
        misses: ['toast-id', 'save-toast', 'Unlisted callee'],
    },
    {
        name: '1. a configured notifier list replaces the defaults',
        config: { notifiers: ['notify.*'] },
        files: { 'view.ts': 'notify.error("Configured copy"); toast("Default no longer counted");' },
        counts: ['Configured copy'],
        misses: ['Default no longer counted'],
    },
    {
        name: '2. helpers called in a sink, local or imported by relative path, whatever their name',
        files: {
            'state.ts': [
                'export function envState(set: boolean) { if (set) return "Set in the environment"; return set === false ? "Unset · default" : "Unknown"; }',
                'export const tierWord = (tier: string) => tier === "host" ? "the host file" : "the package";',
                'export function statusClass() { return "status-pill" }',
                'export function nested() { return relabel("Nested two hops") }',
            ].join('\n'),
            'view.tsx': [
                'import { envState, tierWord, statusClass, nested } from "./state";',
                'const local = () => "Local helper copy";',
                'function sortKey() { return "updated_at" }',
                'export const View = ({set, tier}: {set: boolean; tier: string}) => <p className={statusClass()} data-sort={sortKey()} title={tierWord(tier)}>{envState(set)} {local()} {nested()}</p>;',
            ].join('\n'),
        },
        counts: ['Set in the environment', 'Unset · default', 'Unknown', 'the host file', 'the package', 'Local helper copy'],
        misses: ['status-pill', 'updated_at', 'Nested two hops'],
    },
    {
        name: '3. constant lookups (CONST[expr], CONST.prop)',
        files: { 'view.tsx': [
            'const STANDING_NOTE = { shadowed: "Hidden by the host copy", removed: "Removed by a provider" } as const;',
            'const ISSUE = { missing: { label: "File missing", icon: "file-x" } };',
            'const TONE = { ok: "text-green", bad: "text-red" };',
            'let MUTABLE = { a: "Mutable copy" }; MUTABLE = { a: "Changed" };',
            'export const View = ({s, k}: {s: "shadowed" | "removed"; k: "missing"}) => <p className={TONE[s === "shadowed" ? "ok" : "bad"]} title={ISSUE[k].label}>{STANDING_NOTE[s]} {MUTABLE[s]}</p>;',
        ].join('\n') },
        counts: ['Hidden by the host copy', 'Removed by a provider', 'File missing'],
        misses: ['file-x', 'text-green', 'text-red', 'Mutable copy'],
    },
    {
        name: '4. mapped literals: the rendered positions and properties, never React keys',
        files: { 'view.tsx': [
            'const PARTS = [[3, "keys", "Keys copy"], [1, "secrets", "Secrets copy"]] as const;',
            'const VIEWS = [{ key: "outline", label: "Outline copy", icon: "list-tree" }, { key: "canvas", label: "Canvas copy", icon: "network" }];',
            'export const View = () => <div>',
            '  {PARTS.map(([n, kind, word]) => <span key={kind} data-kind={kind}>{n} {word}</span>)}',
            '  {VIEWS.map((view) => <button key={view.key} data-icon={view.icon}>{view.label}</button>)}',
            '</div>;',
        ].join('\n') },
        counts: ['Keys copy', 'Secrets copy', 'Outline copy', 'Canvas copy'],
        misses: ['keys', 'secrets', 'outline', 'canvas', 'list-tree', 'network'],
    },
    {
        name: '4. an untraceable callback counts all of the mapped array',
        files: { 'view.tsx': 'const WORDS = ["First word", "Second word"]; const render = (w: string) => <i>{w}</i>; export const View = () => <p>{WORDS.map(render)}</p>;' },
        counts: ['First word', 'Second word'],
        misses: [],
    },
    {
        name: '5. opted-in error classes (constructor\'s first argument)',
        config: { errorClasses: ['NoticeError'] },
        files: { 'view.ts': 'throw new NoticeError("Clipboard is unavailable"); throw new Error("Internal invariant broke"); throw new TypeError("Bad type");' },
        counts: ['Clipboard is unavailable'],
        misses: ['Internal invariant broke', 'Bad type'],
    },
    {
        name: '5. no error class counts by default',
        files: { 'view.ts': 'throw new NoticeError("Not opted in");' },
        counts: [],
        misses: ['Not opted in'],
    },
];

describe('the widened census', () => {
    it.each(sinks.map((sink) => [sink.name, sink] as const))('%s', (_name, sink) => {
        const found = texts(fixture(sink.config), sink.files);
        for (const text of sink.counts) expect(found, `counts "${text}"`).toContain(text);
        for (const text of sink.misses) expect(found, `does not count "${text}"`).not.toContain(text);
    });

    it('prints the unscanned shapes on PASS and on FAIL', () => {
        const root = fixture();
        writeFileSync(join(root, 'src/view.tsx'), 'export const View = () => <p>Hello</p>;');
        const pass = run(root, '--write');
        expect(pass.status).toBe(0);
        expect(JSON.parse(pass.stdout).unscanned).toHaveLength(4);
        writeFileSync(join(root, 'src/view.tsx'), 'export const View = () => <p>Hello <b>again</b></p>;');
        const fail = run(root);
        expect(fail.status).toBe(1);
        expect(JSON.parse(fail.stderr).unscanned).toEqual(JSON.parse(pass.stdout).unscanned);
        expect(fail.stderr).toContain('display copy increased');
    });

    it('a rise under another scanner asks for a re-measure; --write re-measures and records the scanner', () => {
        const root = fixture();
        writeFileSync(join(root, 'src/view.tsx'), 'const NOTE = { a: "Lookup copy" }; export const View = () => <p>Hello {NOTE.a}</p>;');
        writeFileSync(join(root, 'baseline.json'), JSON.stringify({ version: 1, counts: { fixture: 1 } }));
        const widened = run(root);
        expect(widened.status).toBe(1);
        expect(widened.stderr).toContain('scanner widened: re-measure with --write');
        expect(widened.stderr).not.toContain('display copy increased');
        const remeasured = run(root, '--write');
        expect(remeasured.status, remeasured.stderr).toBe(0);
        expect(JSON.parse(remeasured.stdout).remeasured).toEqual({ fixture: { from: 1, to: 2 } });
        expect(JSON.parse(readFileSync(join(root, 'baseline.json'), 'utf8'))).toEqual({ version: 1, scanner: 2, counts: { fixture: 2 } });
        expect(run(root).status).toBe(0);
    });

    it('any scanner mismatch asks for a re-measure, even when no count rose', () => {
        const root = fixture();
        writeFileSync(join(root, 'src/view.tsx'), 'export const View = () => <p>Hello</p>;');
        writeFileSync(join(root, 'baseline.json'), JSON.stringify({ version: 1, counts: { fixture: 1 } }));
        const unchanged = run(root);
        expect(unchanged.status).toBe(1);
        expect(unchanged.stderr).toContain('scanner widened: re-measure with --write (baseline scanner 1, scanner 2)');
        expect(run(root, '--write').status).toBe(0);
        expect(JSON.parse(readFileSync(join(root, 'baseline.json'), 'utf8')).scanner).toBe(2);
        expect(run(root).status).toBe(0);
    });

    it('a ProseMirror content expression is technical in a content sink only', () => {
        const found = texts(fixture(), { 'schema.ts': [
            'const spec = { content: "inline*", group: "block" }; spec.content = "(paragraph | heading)+";',
            'function contentFor(leaf: boolean) { return leaf ? "block+ inline*" : "text*" }',
            'const node = { content: contentFor(true) };',
            'const card = { content: "Read more?", title: "inline*" };',
        ].join('\n') });
        for (const text of ['inline*', '(paragraph | heading)+', 'block+ inline*', 'text*']) expect(found.filter((t) => t === text).length, text).toBe(text === 'inline*' ? 1 : 0);
        expect(found).toContain('Read more?');
    });

    it('a matched scanner behaves as before: a rise is new copy and --write refuses it', () => {
        const root = fixture();
        writeFileSync(join(root, 'src/view.tsx'), 'export const View = () => <p>Hello</p>;');
        expect(run(root, '--write').status).toBe(0);
        writeFileSync(join(root, 'src/view.tsx'), 'export const View = () => <p title="More">Hello</p>;');
        const rise = run(root);
        expect(rise.status).toBe(1);
        expect(rise.stderr).toContain('display copy increased');
        expect(run(root, '--write').status).toBe(1);
    });

    it('refuses a malformed notifier or error-class list', () => {
        for (const extra of [{ notifiers: 'toast' }, { errorClasses: [1] }, { notifiers: [''] }, { notifiers: [] }]) {
            const root = fixture(extra);
            writeFileSync(join(root, 'src/view.tsx'), 'export const View = () => <p>Hello</p>;');
            const result = run(root, '--write');
            expect(result.status).toBe(1);
            expect(result.stderr).toContain('Invalid ratchet config v1');
        }
    });
});
