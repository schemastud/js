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

it('a fall requires an explicit baseline reduction before comparison passes', () => {
    const root = fixture();
    writeFileSync(join(root, 'src/view.tsx'), 'export const View = () => <p>Hello</p>');
    expect(run(root, '--write').status).toBe(0);
    writeFileSync(join(root, 'src/view.tsx'), 'export const View = () => <p className="hello world" data-state="ready">{t("fixture::messages.hello")}</p>');
    writeFileSync(join(root, 'src/view.test.tsx'), 'const test = <p>Test copy</p>');
    const before = readFileSync(join(root, 'baseline.json'), 'utf8');
    const stale = run(root);
    expect(stale.status).toBe(1);
    expect(stale.stderr).toContain('stale baseline');
    expect(readFileSync(join(root, 'baseline.json'), 'utf8')).toBe(before);
    expect(run(root, '--write').status).toBe(0);
    expect(JSON.parse(readFileSync(join(root, 'baseline.json'), 'utf8')).counts.fixture).toBe(0);
    expect(run(root).status).toBe(0);
    writeFileSync(join(root, 'src/view.tsx'), 'export const View = () => <p>Hello</p>');
    expect(run(root).status).toBe(1);
    expect(run(root, '--write').status).toBe(1);
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


const missedShapes: [string, string, string][] = [
    ['logical-and JSX child', 'const View = () => <p>{flag && "And copy"}</p>', 'And copy'],
    ['option object in JSX', 'const View = () => <Select options={[{value: "b", label: "Banana"}]} />', 'Banana'],
    ['module column object', 'const columns = [{key: "name", header: "Column heading"}]', 'Column heading'],
    ['object default fallback', 'const options = {header: own?.header ?? "Name"}', 'Name'],
    ['object shorthand', 'const label = "Shorthand copy"; const options = {label}', 'Shorthand copy'],
    ['binding renamed default', 'function View({heading: name = "Heading default"}) {}', 'Heading default'],
    ['shorthand assignment default', '({label = "Shorthand default"} = options)', 'Shorthand default'],
    ['notice object message', 'notice({message: "Notice copy"})', 'Notice copy'],
    ['namespaced t parameter', 'messages.t("fixture::key", {name: "Param copy"})', 'Param copy'],
    ['namespaced choice parameter', 'messages.choice("fixture::key", 2, {noun: "Choice copy"})', 'Choice copy'],
    ['translation parameter shorthand', 'const name = "Parameter shorthand"; messages.t("fixture::key", {name})', 'Parameter shorthand'],
    ['translation parameter constant', 'const params = {name: "Parameter constant"}; messages.t("fixture::key", params)', 'Parameter constant'],
    ['returned format literal', 'export function formatMoney() { return "Pricing unknown" }', 'Pricing unknown'],
    ['returned format template', 'export function formatMoney() { return `Total ${count} remaining` }', 'Total … remaining'],
    ['returned conditional format', 'export function formatMoney() { return count ? "Free" : "Not priced" }', 'Free'],
    ['returned format local', 'export function formatMoney() { const replay = "replayed"; return `${amount} ${replay}` }', 'replayed'],
    ['expression-bodied formatter', 'export const formatMoney = () => "Not priced"', 'Not priced'],
    ['DOM aria setAttribute', 'button.setAttribute("aria-label", `Open ${title}`)', 'Open …'],
    ['DOM title setAttribute', 'button.setAttribute("title", "Title copy")', 'Title copy'],
    ['DOM placeholder setAttribute', 'input.setAttribute("placeholder", "Search copy")', 'Search copy'],
    ['DOM alt setAttribute', 'image.setAttribute("alt", "Picture copy")', 'Picture copy'],
    ['DOM textContent assignment', 'node.textContent = "Text copy"', 'Text copy'],
    ['DOM innerText assignment', 'node.innerText = "Inner copy"', 'Inner copy'],
    ['DOM title assignment', 'node.title = "Hover copy"', 'Hover copy'],
    ['DOM placeholder assignment', 'node.placeholder = "Enter copy"', 'Enter copy'],
    ['DOM alt assignment', 'node.alt = "Alternative copy"', 'Alternative copy'],
];
for (const prop of ['heading', 'subtitle', 'text', 'content', 'caption', 'hint', 'emptyState', 'aria-valuetext', 'aria-roledescription', 'aria-placeholder']) {
    missedShapes.push([`JSX ${prop}`, `const View = () => <View ${prop}="Display copy" />`, 'Display copy']);
    missedShapes.push([`object ${prop}`, `const options = {"${prop}": "Display copy"}`, 'Display copy']);
}
it.each(missedShapes)('counts %s through the public CLI', (_name, source, text) => {
    const root = fixture();
    writeFileSync(join(root, 'src/view.tsx'), source);
    const result = run(root, '--write');
    expect(result.status, result.stderr).toBe(0);
    const report = JSON.parse(result.stdout);
    expect(report.findings.fixture.map((item: { text: string }) => item.text)).toContain(text);
    expect(run(root).status).toBe(0);
});

it('technical identifiers and protocol returns are outside display contexts', () => {
    const root = fixture();
    writeFileSync(join(root, 'src/view.tsx'), [
        'const options = {field: "name", key: "column_id", type: "string", className: "text red", id: "thing"};',
        'function getStatus() { return "pending" }',
        'function runCommand() { return {exitCode: 1, message: "Command diagnostic"} }',
        'const refConfig = {resource: "users", value: "id", label: "name", multiple: false, select: "single"};',
        'function classNames() { return "flex gap-2" }',
        'button.setAttribute("data-state", "loading"); button.setAttribute("role", "button");',
        'const View = () => <div className="hello world" data-state="ready" role="status" />;',
        'messages.t("fixture::messages.hello"); messages.choice("fixture::messages.items", count);',
        'messages.choice("fixture::messages.selection", count, {count: "\\uFFF0\\uFFF1"});',
    ].join('\n'));
    const result = run(root, '--write');
    expect(result.status, result.stderr).toBe(0);
    expect(JSON.parse(result.stdout).counts.fixture).toBe(0);
});

it('generated descendants are excluded while configured excluded roots refuse', () => {
    const root = fixture();
    mkdirSync(join(root, 'src/generated'));
    writeFileSync(join(root, 'src/generated/client.tsx'), 'const Generated = <p>Generated copy</p>');
    const result = run(root, '--write');
    expect(result.status, result.stderr).toBe(0);
    expect(JSON.parse(result.stdout).counts.fixture).toBe(0);
    for (const path of ['./src/generated', './build', './testing', './src/generated/../generated']) {
        mkdirSync(join(root, path), { recursive: true });
        writeFileSync(join(root, 'ratchet.json'), JSON.stringify({ version: 1, baseline: './baseline.json', packages: { fixture: [path] } }));
        const refused = run(root, '--write');
        expect(refused.status).toBe(1);
        expect(refused.stderr).toContain('Excluded source root');
    }
});

it('logical-and counts rendered copy but not a technical identifier used as the guard', () => {
    const root = fixture();
    writeFileSync(join(root, 'src/view.tsx'), 'const listId = `${id}-suggestions`; const View = () => <>{listId && <datalist id={listId} />}{cond && "Copy"}</>');
    const result = run(root, '--write');
    expect(result.status, result.stderr).toBe(0);
    const report = JSON.parse(result.stdout);
    expect(report.findings.fixture.map((item: { text: string }) => item.text)).toEqual(['Copy']);
});

it('rich translation parameter sentinels are technical while visible and ordinary parameter copy still counts', () => {
    const root = fixture();
    writeFileSync(join(root, 'src/view.tsx'), `
const marker = '\\u0000title\\u0000';
const message = t('copy', { title: marker });
const ordinary = t('copy', { title: 'Ordinary param copy' });
const visibleMarker = '\\u0000visible\\u0000';
const View = () => <><p>{visibleMarker}</p><p title={'\\u0000Display copy\\u0000'} /></>;
`);
    const result = run(root, '--write');
    expect(result.status, result.stderr).toBe(0);
    const report = JSON.parse(result.stdout);
    expect(report.findings.fixture.map((item: { text: string }) => item.text)).toEqual([
        'Ordinary param copy', '\u0000visible\u0000', '\u0000Display copy\u0000',
    ]);
});
