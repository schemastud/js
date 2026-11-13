import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
import { afterEach, expect, it } from 'vitest';

const rooms: string[] = [];
afterEach(() => { for (const room of rooms.splice(0)) rmSync(room, { recursive: true, force: true }); });
function write(path: string, value: unknown) { mkdirSync(join(path, '..'), { recursive: true }); writeFileSync(path, JSON.stringify(value)); }
function fixture() {
    const root = mkdtempSync(join(tmpdir(), 'messages-collector-')); rooms.push(root);
    write(join(root, 'package.json'), { name: 'fixture-host', dependencies: { '@fixtures/one': '1', '@fixtures/two': '1' } });
    for (const [name, text] of [['one', 'One'], ['two', 'Two']]) {
        const at = join(root, 'node_modules', '@fixtures', name);
        write(join(at, 'package.json'), { name: '@fixtures/' + name, version: '1.0.0', exports: { './messages': './messages.default.json' }, schemastud: { messages: { version: 1, catalog: './messages' } } });
        write(join(at, 'messages.default.json'), { version: 1, package: '@fixtures/' + name, sourceLocale: 'en', namespace: name, sharesWith: null, messages: { [name + '::messages.label']: text } });
    }
    return root;
}
const cli = new URL('../bin/schemastud-messages.mjs', import.meta.url).pathname;
function run(root: string, ...args: string[]) { return spawnSync(process.execPath, [cli, 'collect', '--out', 'resources/beam/messages.json', ...args], { cwd: root, encoding: 'utf8' }); }

it('collects two exported package catalogs and compares without rewriting the host artifact', () => {
    const root = fixture();
    expect(run(root, '--write').status).toBe(0);
    const target = join(root, 'resources/beam/messages.json');
    const before = readFileSync(target, 'utf8');
    expect(JSON.parse(before).payload.messages).toEqual({
        'one::messages.label': { default: 'One', owner: '@fixtures/one' },
        'two::messages.label': { default: 'Two', owner: '@fixtures/two' },
    });
    expect(run(root).status).toBe(0);
    expect(readFileSync(target, 'utf8')).toBe(before);
});

it('comparison fails on changed English without rewriting the existing artifact; versions alone do not drift', () => {
    const root = fixture();
    expect(run(root, '--write').status).toBe(0);
    const target = join(root, 'resources/beam/messages.json');
    const before = readFileSync(target, 'utf8');
    const manifestPath = join(root, 'node_modules/@fixtures/one/package.json');
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
    write(manifestPath, { ...manifest, version: '1.0.1' });
    expect(run(root).status).toBe(0);
    const catalogPath = join(root, 'node_modules/@fixtures/one/messages.default.json');
    const catalog = JSON.parse(readFileSync(catalogPath, 'utf8'));
    write(catalogPath, { ...catalog, messages: { 'one::messages.label': 'Changed' } });
    expect(run(root).status).not.toBe(0);
    expect(readFileSync(target, 'utf8')).toBe(before);
});

function runtime(at: string, abi = 1) {
    write(join(at, 'package.json'), { name: '@schemastud/messages', version: '0.1.0', exports: { './messages': './messages.default.json' }, schemastud: { messages: { version: 1, catalog: './messages', runtimeAbi: abi } } });
    write(join(at, 'messages.default.json'), { version: 1, package: '@schemastud/messages', sourceLocale: 'en', namespace: 'schemastud-messages', sharesWith: null, messages: {} });
}
function addPeer(root: string, consumer: string) {
    const path = join(root, 'node_modules', '@fixtures', consumer, 'package.json');
    const manifest = JSON.parse(readFileSync(path, 'utf8'));
    write(path, { ...manifest, peerDependencies: { '@schemastud/messages': '^0.1.0' } });
}
it('refuses multiple real runtime instances even when their versions are identical', () => {
    const root = fixture();
    addPeer(root, 'one'); addPeer(root, 'two');
    runtime(join(root, 'node_modules/@schemastud/messages'));
    runtime(join(root, 'node_modules/@fixtures/one/node_modules/@schemastud/messages'));
    const result = run(root, '--write');
    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain('More than one');
});

it('refuses a runtime with an incompatible declared ABI', () => {
    const root = fixture(); addPeer(root, 'one');
    runtime(join(root, 'node_modules/@schemastud/messages'), 2);
    const result = run(root, '--write');
    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain('ABI');
});

it('rejects duplicate JSON members instead of silently choosing the last default', () => {
    const root = fixture();
    expect(run(root, '--write').status).toBe(0);
    const path = join(root, 'node_modules/@fixtures/one/messages.default.json');
    writeFileSync(path, readFileSync(path, 'utf8').replace('{', '{"version":1,'));
    const result = run(root, '--write');
    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain('Duplicate JSON');
});

it('refuses conflicting copies of one catalog, without accepting traversal order', () => {
    const root = fixture();
    const two = join(root, 'node_modules/@fixtures/two/package.json');
    write(two, { ...JSON.parse(readFileSync(two, 'utf8')), dependencies: { '@fixtures/one': '2' } });
    const duplicate = join(root, 'node_modules/@fixtures/two/node_modules/@fixtures/one');
    write(join(duplicate, 'package.json'), JSON.parse(readFileSync(join(root, 'node_modules/@fixtures/one/package.json'), 'utf8')));
    const catalog = JSON.parse(readFileSync(join(root, 'node_modules/@fixtures/one/messages.default.json'), 'utf8'));
    write(join(duplicate, 'messages.default.json'), { ...catalog, messages: { 'one::messages.label': 'Different' } });
    const result = run(root, '--write');
    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain('Conflicting catalog copies');
});
it('includes explicit host keys and explicitly excludes a missing dev-only fixture', () => {
    const root = fixture();
    const path = join(root, 'package.json');
    write(path, { ...JSON.parse(readFileSync(path, 'utf8')), devDependencies: { '@fixtures/missing-story': '1' } });
    write(join(root, 'messages.default.json'), { version: 1, sourceLocale: 'en', messages: { 'messages.profile_updated': 'Profile updated.' } });
    expect(run(root, '--host-catalog', 'messages.default.json', '--exclude', '@fixtures/missing-story', '--write').status).toBe(0);
    expect(JSON.parse(readFileSync(join(root, 'resources/beam/messages.json'), 'utf8')).payload.messages['messages.profile_updated'])
        .toEqual({ default: 'Profile updated.', owner: 'fixture-host' });
});
it('requires --out and never invents a host output location', () => {
    const root = fixture();
    const result = spawnSync(process.execPath, [cli, 'collect'], { cwd: root, encoding: 'utf8' });
    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain('--out is required');
});

it('collects a root devDependency catalog used by production host code', () => {
    const root = fixture();
    write(join(root, 'package.json'), { name: 'fixture-host', dependencies: { '@fixtures/two': '1' }, devDependencies: { '@fixtures/one': '1' } });
    expect(run(root, '--write').status).toBe(0);
    const payload = JSON.parse(readFileSync(join(root, 'resources/beam/messages.json'), 'utf8')).payload;
    expect(payload.messages['one::messages.label']).toEqual({ default: 'One', owner: '@fixtures/one' });
});

it('supports repeatable exclusions for installed dev-only fixtures without catalog markers', () => {
    const root = fixture();
    write(join(root, 'package.json'), { name: 'fixture-host', dependencies: { '@fixtures/one': '1', '@fixtures/two': '1' }, devDependencies: { '@fixtures/story': '1', '@fixtures/test': '1' } });
    for (const name of ['story', 'test']) write(join(root, 'node_modules/@fixtures', name, 'package.json'), { name: '@fixtures/' + name, dependencies: { '@fixtures/uninstalled-story-runtime': '1' } });
    expect(run(root, '--exclude', '@fixtures/story', '--exclude', '@fixtures/test', '--write').status).toBe(0);
});

it('refuses to exclude an installed catalog even when the excluded name is a root devDependency', () => {
    const root = fixture();
    write(join(root, 'package.json'), { name: 'fixture-host', devDependencies: { '@fixtures/one': '1' } });
    const result = run(root, '--exclude', '@fixtures/one', '--write');
    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain('Excluded package carries a catalog');
});

it('does not follow transitive package devDependencies', () => {
    const root = fixture();
    const path = join(root, 'node_modules/@fixtures/one/package.json');
    write(path, { ...JSON.parse(readFileSync(path, 'utf8')), devDependencies: { '@fixtures/uninstalled-test-tool': '1' } });
    expect(run(root, '--write').status).toBe(0);
});
