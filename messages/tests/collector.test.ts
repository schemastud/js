import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
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
// frame-foundation 64 (contract agreed with calcucrypt): a same-ABI duplicate runtime is allowed with one warning, the
// copy the host root resolves listed first; mixed ABIs refuse naming each copy; a single copy is unchanged.
const ROOT_COPY = 'node_modules/@schemastud/messages';
const NESTED_COPY = 'node_modules/@fixtures/one/node_modules/@schemastud/messages';
function oneRuntime() {
    const root = fixture(); addPeer(root, 'one'); addPeer(root, 'two');
    runtime(join(root, ROOT_COPY));
    return root;
}
function twoRuntimes(rootAbi = 1, nestedAbi = 1) {
    const root = fixture(); addPeer(root, 'one'); addPeer(root, 'two');
    runtime(join(root, ROOT_COPY), rootAbi);
    runtime(join(root, NESTED_COPY), nestedAbi);
    return root;
}

it('allows two same-ABI runtimes with one warning, the root-resolved copy first, and collects the 1-copy output', () => {
    const single = oneRuntime();
    expect(run(single, '--write').status).toBe(0);
    const root = twoRuntimes();
    const result = run(root, '--write');
    expect(result.status).toBe(0);
    const warnings = result.stderr.split('\n').filter(line => line.includes('More than one installed @schemastud/messages runtime'));
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toContain('(2,');
    // The root-resolved copy is listed first, although the nested path sorts before it.
    expect(warnings[0].indexOf(ROOT_COPY + ',')).toBeGreaterThan(-1);
    expect(warnings[0].indexOf(ROOT_COPY + ',')).toBeLessThan(warnings[0].indexOf(NESTED_COPY));
    expect(warnings[0]).not.toContain(root);
    const collected = readFileSync(join(root, 'resources/beam/messages.json'), 'utf8');
    expect(collected).toBe(readFileSync(join(single, 'resources/beam/messages.json'), 'utf8'));
    // The comparison mode agrees and warns the same way.
    const compare = run(root);
    expect(compare.status).toBe(0);
    expect(compare.stderr).toContain('More than one installed @schemastud/messages runtime');
});

it('refuses runtimes with different ABIs, naming each copy and its ABI, whichever copy is read first', () => {
    for (const [rootAbi, nestedAbi] of [[1, 2], [2, 1]]) {
        const result = run(twoRuntimes(rootAbi, nestedAbi), '--write');
        expect(result.status).not.toBe(0);
        expect(result.stderr).toContain('Mixed @schemastud/messages runtime ABIs');
        expect(result.stderr).toContain(`${ROOT_COPY} (runtimeAbi ${rootAbi})`);
        expect(result.stderr).toContain(`${NESTED_COPY} (runtimeAbi ${nestedAbi})`);
    }
});

it('a single runtime collects as before, with no warning', () => {
    const result = run(oneRuntime(), '--write');
    expect(result.status).toBe(0);
    expect(result.stderr).toBe('');
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


it.each([
    'realms.console.label',
    'realms.console.capabilities.manage.title',
    'realms.console.upsell.pro',
])('refuses reserved realms key %s in package and host catalogs', key => {
    const root = fixture();
    const catalogPath = join(root, 'node_modules/@fixtures/one/messages.default.json');
    const catalog = JSON.parse(readFileSync(catalogPath, 'utf8'));
    write(catalogPath, { ...catalog, messages: { ['one::' + key]: 'Reserved' } });
    const packageResult = run(root, '--write');
    expect(packageResult.status).not.toBe(0);
    expect(packageResult.stderr).toContain('Invalid catalog key/default: one::' + key);
    write(catalogPath, catalog);
    write(join(root, 'messages.default.json'), { version: 1, sourceLocale: 'en', messages: { [key]: 'Reserved' } });
    const hostResult = run(root, '--host-catalog', 'messages.default.json', '--write');
    expect(hostResult.status).not.toBe(0);
    expect(hostResult.stderr).toContain('Invalid host key/default: ' + key);
});

it('keeps explicit messages.realms keys valid outside the reserved derived group', () => {
    const root = fixture();
    write(join(root, 'messages.default.json'), { version: 1, sourceLocale: 'en', messages: { 'messages.realms': 'Realms' } });
    expect(run(root, '--host-catalog', 'messages.default.json', '--write').status).toBe(0);
});

// frame-foundation 67: translator notes. A catalog's optional `notes` ({ key: note }) are validated, carried to a sibling
// `payload.notes` (never inside a {default, owner} entry), and omitted entirely when there are none.
function withNotes(root: string, name: string, notes: unknown) {
    const path = join(root, 'node_modules/@fixtures', name, 'messages.default.json');
    write(path, { ...JSON.parse(readFileSync(path, 'utf8')), notes });
}
const collected = (root: string) => JSON.parse(readFileSync(join(root, 'resources/beam/messages.json'), 'utf8'));

it('carries package and host notes to payload.notes, beside messages and never inside an entry', () => {
    const root = fixture();
    withNotes(root, 'one', { 'one::messages.label': 'A noun: the label of one field, beside its value.' });
    write(join(root, 'messages.default.json'), { version: 1, sourceLocale: 'en', messages: { 'messages.remaining': 'remaining' },
        notes: { 'messages.remaining': 'Shown after an amount drawn separately ("$12.00  remaining").' } });
    expect(run(root, '--host-catalog', 'messages.default.json', '--write').status).toBe(0);
    const { payload } = collected(root);
    expect(payload.notes).toEqual({
        'one::messages.label': 'A noun: the label of one field, beside its value.',
        'messages.remaining': 'Shown after an amount drawn separately ("$12.00  remaining").',
    });
    expect(payload.messages['one::messages.label']).toEqual({ default: 'One', owner: '@fixtures/one' });
    expect(Object.keys(payload)).toEqual(['messages', 'notes', 'packages', 'version']);
});

it('writes no notes member when no catalog has a note, and an empty notes map adds none', () => {
    const root = fixture();
    expect(run(root, '--write').status).toBe(0);
    const plain = collected(root);
    expect(plain.payload).not.toHaveProperty('notes');
    // Golden (REVIEW-67 S1): the base collector (6854b29, before notes) writes exactly these bytes for this fixture.
    const bytes = readFileSync(join(root, 'resources/beam/messages.json'));
    expect(bytes.length).toBe(565);
    expect(createHash('sha256').update(bytes).digest('hex')).toBe('19b089063ecc2a8f2328c778caa782bdaad48ee354328a86a168f28f18b03cf8');
    expect(plain.digest).toBe('sha256:acd0f9c55004d42e853f978b732c9d53135dfff6cdcaaf85f018d7c83f9193bc');
    // An empty map is still a change to that catalog's bytes (its catalogDigest moves), but adds no payload.notes.
    withNotes(root, 'one', {});
    expect(run(root, '--write').status).toBe(0);
    expect(collected(root).payload).not.toHaveProperty('notes');
    expect(collected(root).payload.messages).toEqual(plain.payload.messages);
});

it('refuses a note for an unknown key, a non-string note, an empty note, an over-long note and a non-object notes field', () => {
    for (const [notes, error] of [
        [{ 'one::messages.missing': 'x' }, 'Catalog note for an unknown key: one::messages.missing'],
        [{ 'one::messages.label': 7 }, 'Invalid catalog note'],
        [{ 'one::messages.label': '  ' }, 'Invalid catalog note'],
        [{ 'one::messages.label': 'x'.repeat(501) }, 'Invalid catalog note'],
        [['one::messages.label'], 'Invalid catalog notes: not an object'],
    ] as const) {
        const root = fixture();
        withNotes(root, 'one', notes);
        const result = run(root, '--write');
        expect(result.status, JSON.stringify(notes).slice(0, 60)).not.toBe(0);
        expect(result.stderr).toContain(error);
    }
});

it('refuses a host note for a key the host catalog does not declare', () => {
    const root = fixture();
    write(join(root, 'messages.default.json'), { version: 1, sourceLocale: 'en', messages: { 'messages.saved': 'Saved' }, notes: { 'messages.other': 'x' } });
    const result = run(root, '--host-catalog', 'messages.default.json', '--write');
    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain('Catalog note for an unknown key: messages.other');
});

it('refuses two copies of one catalog that note a key differently, as conflicting catalog copies (REVIEW-67)', () => {
    const root = fixture();
    withNotes(root, 'one', { 'one::messages.label': 'Note A' });
    const copy = join(root, 'node_modules/@fixtures/two/node_modules/@fixtures/one');
    const packagePath = join(root, 'node_modules/@fixtures/two/package.json');
    write(packagePath, { ...JSON.parse(readFileSync(packagePath, 'utf8')), dependencies: { '@fixtures/one': '1' } });
    write(join(copy, 'package.json'), JSON.parse(readFileSync(join(root, 'node_modules/@fixtures/one/package.json'), 'utf8')));
    write(join(copy, 'messages.default.json'), { ...JSON.parse(readFileSync(join(root, 'node_modules/@fixtures/one/messages.default.json'), 'utf8')), notes: { 'one::messages.label': 'Note B' } });
    const result = run(root, '--write');
    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain('Conflicting catalog copies: @fixtures/one');
});
