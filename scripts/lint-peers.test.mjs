// frame-foundation 80: scripts/lint-peers.mjs, the sibling peer range check. Fixture trees are written to a temp dir per case.
// Run: node --test scripts/lint-peers.test.mjs (npm run test:scripts).
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { spawnSync, execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { after, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { lintPeers } from './lint-peers.mjs';

// Release-mode unit tests about manifest semantics: tags were read, and none matter here (ruling (3) has its own tests).
const NO_TAGS = new Map();


const made = [];
after(() => {
    for (const dir of made) rmSync(dir, { recursive: true, force: true });
});

/** A workspace tree: `packages` maps a dir to its manifest; `root` overrides the root manifest; `files` adds other files. */
function tree({ workspaces, packages, files = {} }) {
    const root = mkdtempSync(join(tmpdir(), 'lint-peers-'));
    made.push(root);
    const write = (path, value) => {
        mkdirSync(dirname(join(root, path)), { recursive: true });
        writeFileSync(join(root, path), typeof value === 'string' ? value : JSON.stringify(value, null, 2));
    };
    write('package.json', { name: 'fixture-root', private: true, workspaces: workspaces ?? Object.keys(packages) });
    for (const [dir, manifest] of Object.entries(packages)) write(`${dir}/package.json`, manifest);
    for (const [path, value] of Object.entries(files)) write(path, value);
    return root;
}

const pkg = (name, version, peerDependencies = {}, optional = [], other = {}) => ({
    name,
    version,
    peerDependencies,
    ...other,
    ...(optional.length ? { peerDependenciesMeta: Object.fromEntries(optional.map((d) => [d, { optional: true }])) } : {}),
});

const CHANGESET_CONFIG = {
    $schema: 'https://unpkg.com/@changesets/config@3.0.0/schema.json',
    changelog: false,
    commit: false,
    access: 'public',
    baseBranch: 'main',
    updateInternalDependencies: 'patch',
    ignore: [],
};

describe('lint:peers', () => {
    it('is RED at c64c712\'s shape: chat\'s optional seam peer excludes the workspace\'s seam 0.5.2, named with its range', async () => {
        const root = tree({
            packages: {
                seam: pkg('@schemastud/seam', '0.5.2'),
                chat: pkg('@schemastud/chat', '0.1.0', { '@schemastud/seam': '^0.2.0 || ^0.3.0' }, ['@schemastud/seam']),
            },
        });
        const { failures } = await lintPeers(root);
        assert.equal(failures.length, 1);
        assert.match(failures[0], /@schemastud\/chat peerDependencies\["@schemastud\/seam"\] "\^0\.2\.0 \|\| \^0\.3\.0" \(optional peer\) excludes the workspace's @schemastud\/seam 0\.5\.2/);
    });

    it('is GREEN once chat\'s range covers the sibling (the fix)', async () => {
        const root = tree({
            packages: {
                seam: pkg('@schemastud/seam', '0.5.2'),
                chat: pkg('@schemastud/chat', '0.1.0', { '@schemastud/seam': '^0.2.0 || ^0.3.0 || ^0.4.0 || ^0.5.0 || ^0.6.0' }, ['@schemastud/seam']),
            },
        });
        const { failures, checked } = await lintPeers(root);
        assert.deepEqual(failures, []);
        assert.equal(checked.length, 1);
    });

    it('checks a REQUIRED peer the same way', async () => {
        const root = tree({
            packages: { combobox: pkg('@schemastud/combobox', '0.1.0'), facets: pkg('@schemastud/facets', '0.2.2', { '@schemastud/combobox': '^0.2.0' }) },
        });
        const { failures } = await lintPeers(root);
        assert.equal(failures.length, 1);
        assert.match(failures[0], /^@schemastud\/facets peerDependencies\["@schemastud\/combobox"\] "\^0\.2\.0" excludes the workspace's @schemastud\/combobox 0\.1\.0$/);
    });

    it('counts a PENDING changeset: a sibling the next release lifts into range passes, and --current shows the lag', async () => {
        const files = {
            '.changeset/config.json': CHANGESET_CONFIG,
            '.changeset/seam-minor.md': "---\n'@schemastud/seam': minor\n---\n\nThe next seam minor.\n",
        };
        const root = tree({
            packages: { seam: pkg('@schemastud/seam', '0.2.2'), blockdoc: pkg('@schemastud/blockdoc', '0.1.1', { '@schemastud/seam': '^0.3.0' }, ['@schemastud/seam']) },
            files,
        });
        assert.deepEqual((await lintPeers(root)).failures, []);
        const current = await lintPeers(root, { release: true, tags: NO_TAGS });
        assert.equal(current.failures.length, 1);
        assert.match(current.failures[0], /excludes the workspace's @schemastud\/seam 0\.2\.2/);
    });

    it('counts a pending bump that pushes a sibling OUT of range (planned version named beside the manifest one)', async () => {
        const root = tree({
            packages: { seam: pkg('@schemastud/seam', '0.3.4'), chat: pkg('@schemastud/chat', '0.1.0', { '@schemastud/seam': '^0.3.0' }, ['@schemastud/seam']) },
            files: { '.changeset/config.json': CHANGESET_CONFIG, '.changeset/seam-minor.md': "---\n'@schemastud/seam': minor\n---\n\nx\n" },
        });
        const { failures } = await lintPeers(root);
        assert.equal(failures.length, 1);
        assert.match(failures[0], /seam 0\.4\.0 \(planned by the pending changesets; 0\.3\.4 in the manifest\)/);
    });

    it('fails a workspace: spec (npm can neither install nor publish it)', async () => {
        const root = tree({ packages: { seam: pkg('@schemastud/seam', '0.2.2'), chat: pkg('@schemastud/chat', '0.1.0', { '@schemastud/seam': 'workspace:*' }) } });
        const { failures } = await lintPeers(root);
        assert.equal(failures.length, 1);
        assert.match(failures[0], /a workspace: spec is not a range npm can install or publish/);
    });

    it('fails an invalid range', async () => {
        const root = tree({ packages: { seam: pkg('@schemastud/seam', '0.2.2'), chat: pkg('@schemastud/chat', '0.1.0', { '@schemastud/seam': 'not a range' }) } });
        assert.match((await lintPeers(root)).failures[0], /not a valid semver range/);
    });

    it('applies npm\'s PRERELEASE semantics: ^0.6.0 does not cover 0.6.0-beta.1; ^0.6.0-beta.0 does', async () => {
        const make = (range) =>
            tree({ packages: { seam: pkg('@schemastud/seam', '0.6.0-beta.1'), chat: pkg('@schemastud/chat', '0.1.0', { '@schemastud/seam': range }) } });
        assert.equal((await lintPeers(make('^0.6.0'))).failures.length, 1);
        assert.deepEqual((await lintPeers(make('^0.6.0-beta.0'))).failures, []);
    });

    it('notes, and does not fail, a peer on a package that is in the repository but not a workspace (npm resolves it from the registry)', async () => {
        const root = tree({
            workspaces: ['chat'],
            packages: { chat: pkg('@schemastud/chat', '0.1.0', { '@schemastud/big-calendar': '^9.0.0' }), 'big-calendar': pkg('@schemastud/big-calendar', '0.1.0') },
        });
        const { failures, notes: all, checked } = await lintPeers(root);
        // this tree is not a git checkout: planned mode also notes that its release-mode warnings read manifests only
        const notes = all.filter((n) => !n.startsWith('release-mode warnings read manifest versions only'));
        assert.equal(all.length - notes.length, 1);
        assert.deepEqual(failures, []);
        assert.equal(checked.length, 0);
        assert.equal(notes.length, 1);
        assert.match(notes[0], /@schemastud\/big-calendar has a manifest here but is not a workspace/);
    });

    it('ignores a peer on a non-sibling (react) and reads one-level "dir/*" workspace globs', async () => {
        const root = tree({
            workspaces: ['packages/*'],
            packages: {
                'packages/seam': pkg('@schemastud/seam', '0.2.2'),
                'packages/chat': pkg('@schemastud/chat', '0.1.0', { react: '^19.0.0', '@schemastud/seam': '^0.1.0' }),
            },
        });
        const { failures, checked } = await lintPeers(root);
        assert.equal(checked.length, 1);
        assert.equal(failures.length, 1);
        assert.match(failures[0], /excludes the workspace's @schemastud\/seam 0\.2\.2/);
    });

    it('RELEASE mode reads every field at the MANIFEST versions: c64c712\'s messages 0.0.0 under siblings\' ^0.1.0 dev ranges', async () => {
        const root = tree({
            packages: {
                messages: pkg('@schemastud/messages', '0.0.0'),
                ui: pkg('@schemastud/ui', '0.1.2', { '@schemastud/messages': '>=0.1.0 <1' }, [], { devDependencies: { '@schemastud/messages': '^0.1.0' } }),
            },
        });
        const release = await lintPeers(root, { release: true, tags: NO_TAGS });
        assert.equal(release.failures.length, 2);
        assert.ok(release.failures.some((f) => /ui devDependencies\["@schemastud\/messages"\] "\^0\.1\.0" excludes the workspace's @schemastud\/messages 0\.0\.0/.test(f)));
        assert.ok(release.failures.some((f) => /ui peerDependencies\["@schemastud\/messages"\] ">=0\.1\.0 <1" excludes/.test(f)));
        // the CI mode reads peers only (changesets rewrites the other internal ranges at version time)
        assert.equal((await lintPeers(root)).failures.length, 1);
    });

    it('notes, and does not check, a spec that is not a range (file:, a git pin); an npm: alias OF A SIBLING is checked as that sibling (review L3)', async () => {
        const root = tree({
            packages: {
                seam: pkg('@schemastud/seam', '0.2.2'),
                messages: pkg('@schemastud/messages', '0.1.0'),
                ui: pkg('@schemastud/ui', '0.1.0', {}, [], {
                    devDependencies: { '@schemastud/seam': 'file:../seam', '@schemastud/messages': 'github:schemastud/js#91d2a7fd&path:/messages' },
                    dependencies: { '@schemastud/seam': 'npm:@schemastud/seam@^0.2.0' },
                }),
            },
        });
        const { failures, notes, checked } = await lintPeers(root, { release: true, tags: NO_TAGS });
        assert.deepEqual(failures, []);
        assert.equal(checked.length, 1, 'the npm: alias of seam is checked');
        assert.equal(checked[0].range, '^0.2.0');
        assert.equal(notes.length, 2);
    });

    it('an npm: alias of a sibling that excludes it fails, under any key (review L3)', async () => {
        const root = tree({
            packages: {
                seam: pkg('@schemastud/seam', '0.5.2'),
                ui: pkg('@schemastud/ui', '0.1.0', {}, [], { dependencies: { 'seam-old': 'npm:@schemastud/seam@^0.2.0' } }),
            },
        });
        const { failures } = await lintPeers(root, { release: true, tags: NO_TAGS });
        assert.equal(failures.length, 1);
        assert.match(failures[0], /dependencies\["seam-old"\] "npm:@schemastud\/seam@\^0\.2\.0" excludes the workspace's @schemastud\/seam 0\.5\.2/);
    });

    it('a workspace: spec fails on a key that is NOT a sibling too (review L3)', async () => {
        const root = tree({ packages: { ui: pkg('@schemastud/ui', '0.1.0', {}, [], { dependencies: { '@schemastud/gone': 'workspace:*' } }) } });
        const { failures } = await lintPeers(root, { release: true, tags: NO_TAGS });
        assert.equal(failures.length, 1);
        assert.match(failures[0], /"@schemastud\/gone"\] "workspace:\*": a workspace: spec is not a range/);
    });

    it('the CI mode prints the release-mode gaps as WARNINGS, not failures (review M2)', async () => {
        const root = tree({
            packages: {
                messages: pkg('@schemastud/messages', '0.0.0'),
                ui: pkg('@schemastud/ui', '0.1.2', {}, [], { devDependencies: { '@schemastud/messages': '^0.1.0' } }),
            },
        });
        const r = await lintPeers(root);
        assert.deepEqual(r.failures, []);
        assert.equal(r.warnings.length, 1);
        assert.match(r.warnings[0], /^release mode would refuse: @schemastud\/ui devDependencies/);
    });

    it('--package scopes a release to that package: its own ranges and every sibling\'s range on it', async () => {
        const root = tree({
            packages: {
                seam: pkg('@schemastud/seam', '0.5.2'),
                combobox: pkg('@schemastud/combobox', '0.1.0'),
                chat: pkg('@schemastud/chat', '0.1.0', { '@schemastud/seam': '^0.2.0' }),
                facets: pkg('@schemastud/facets', '0.2.2', { '@schemastud/combobox': '^0.2.0' }),
            },
        });
        const seam = await lintPeers(root, { release: true, tags: NO_TAGS, only: '@schemastud/seam' });
        assert.equal(seam.failures.length, 1);
        assert.match(seam.failures[0], /chat peerDependencies\["@schemastud\/seam"\]/);
        const chat = await lintPeers(root, { release: true, tags: NO_TAGS, only: '@schemastud/chat' });
        assert.equal(chat.failures.length, 1);
        assert.deepEqual((await lintPeers(root, { release: true, tags: NO_TAGS, only: '@schemastud/facets' })).failures.length, 1);
        // a --package that is not a workspace (big-calendar's case) checks nothing and passes, with a note (review H2)
        const outside = await lintPeers(root, { release: true, tags: NO_TAGS, only: '@schemastud/nope' });
        assert.deepEqual(outside.failures, []);
        assert.match(outside.notes[0], /is not a workspace package/);
    });

    it('runs with NOTHING installed in the tree when SEMVER_MODULE names a semver entry (the release tool\'s case), and exits 1 naming the range', () => {
        const root = tree({
            packages: { seam: pkg('@schemastud/seam', '0.5.2'), chat: pkg('@schemastud/chat', '0.1.0', { '@schemastud/seam': '^0.2.0 || ^0.3.0' }, ['@schemastud/seam']) },
        });
        const script = join(dirname(fileURLToPath(import.meta.url)), 'lint-peers.mjs');
        const semverEntry = createRequire(import.meta.url).resolve('semver');
        const run = spawnSync(process.execPath, [script, '--root', root, '--release', '--manifest-only', '--package', '@schemastud/seam'], {
            cwd: root,
            encoding: 'utf8',
            env: { ...process.env, SEMVER_MODULE: semverEntry },
        });
        assert.equal(run.status, 1, run.stderr + run.stdout);
        assert.match(run.stderr, /FAIL: @schemastud\/chat peerDependencies\["@schemastud\/seam"\] "\^0\.2\.0 \|\| \^0\.3\.0" \(optional peer\) excludes the workspace's @schemastud\/seam 0\.5\.2/);
    });

    it('passes on THIS repository (every sibling peer covered at its planned version)', async () => {
        const root = join(dirname(fileURLToPath(import.meta.url)), '..');
        const { failures, checked } = await lintPeers(root);
        assert.deepEqual(failures, []);
        assert.ok(checked.length > 0);
    });
});

describe('ruling (3): --release checks a PEER against the later of the manifest version and the latest release tag', () => {
    const tags = (o) => new Map(Object.entries(o));
    const script = join(dirname(fileURLToPath(import.meta.url)), 'lint-peers.mjs');
    const semverEntry = createRequire(import.meta.url).resolve('semver');

    it('a peer the release line satisfies passes, and names the tag (main\'s combobox peers)', async () => {
        const root = tree({ packages: { combobox: pkg('@schemastud/combobox', '0.1.0'), facets: pkg('@schemastud/facets', '0.2.2', { '@schemastud/combobox': '^0.2.0' }) } });
        const r = await lintPeers(root, { release: true, tags: tags({ 'combobox@': ['0.1.0', '0.2.0', '0.2.2'] }) });
        assert.deepEqual(r.failures, []);
        assert.equal(r.checked.find((c) => c.dep === '@schemastud/combobox').version, '0.2.2');
        assert.equal(r.tags, 'release tags (peers)');
    });

    it('c64c712 STAYS RED: messages 0.0.0 under siblings\' ^0.1.0 dev range (dependency fields keep the manifest), chat\'s seam peer excludes even the latest tag', async () => {
        const root = tree({
            packages: {
                messages: pkg('@schemastud/messages', '0.0.0'),
                seam: pkg('@schemastud/seam', '0.5.2'),
                ui: pkg('@schemastud/ui', '0.1.2', {}, [], { devDependencies: { '@schemastud/messages': '^0.1.0' } }),
                chat: pkg('@schemastud/chat', '0.1.0', { '@schemastud/seam': '^0.2.0 || ^0.3.0' }),
            },
        });
        // messages@0.1.0 was tagged BEFORE c64c712; it must not lift the devDependency
        const r = await lintPeers(root, { release: true, tags: tags({ 'messages@': ['0.1.0'], 'seam@': ['0.5.2', '0.5.3'] }) });
        assert.equal(r.failures.length, 2, r.failures.join('\n'));
        assert.match(r.failures.join('\n'), /@schemastud\/ui devDependencies\["@schemastud\/messages"\] "\^0\.1\.0" excludes the workspace's @schemastud\/messages 0\.0\.0$/m);
        assert.match(r.failures.join('\n'), /@schemastud\/chat peerDependencies\["@schemastud\/seam"\] "\^0\.2\.0 \|\| \^0\.3\.0" excludes the workspace's @schemastud\/seam 0\.5\.3 \(its latest release, tag seam@0\.5\.3; 0\.5\.2 in the manifest\)/);
    });

    it('a manifest AHEAD of the release line is used as is (the later of the two)', async () => {
        const root = tree({ packages: { seam: pkg('@schemastud/seam', '0.6.0'), chat: pkg('@schemastud/chat', '0.1.0', { '@schemastud/seam': '^0.5.0' }) } });
        const r = await lintPeers(root, { release: true, tags: tags({ 'seam@': ['0.5.3'] }) });
        assert.match(r.failures[0], /excludes the workspace's @schemastud\/seam 0\.6\.0$/);
    });

    it('only the sibling\'s OWN <dir>@ prefix counts', async () => {
        const root = tree({ packages: { seam: pkg('@schemastud/seam', '0.2.2'), chat: pkg('@schemastud/chat', '0.1.0', { '@schemastud/seam': '^0.5.0' }) } });
        const r = await lintPeers(root, { release: true, tags: tags({ 'seam-legacy@': ['0.5.9'], 'chat@': ['0.5.0'], 'frame@': ['0.5.1'] }) });
        assert.equal(r.failures.length, 1);
        assert.match(r.failures[0], /excludes the workspace's @schemastud\/seam 0\.2\.2$/);
    });

    it('compares by semver, not by text or date: 0.10.0 is later than 0.9.0', async () => {
        const root = tree({ packages: { seam: pkg('@schemastud/seam', '0.2.2'), chat: pkg('@schemastud/chat', '0.1.0', { '@schemastud/seam': '^0.10.0' }) } });
        const r = await lintPeers(root, { release: true, tags: tags({ 'seam@': ['0.9.0', '0.10.0', '0.2.2'] }) });
        assert.deepEqual(r.failures, []);
    });

    it('ignores a prerelease tag unless the manifest is itself a prerelease', async () => {
        const stable = tree({ packages: { seam: pkg('@schemastud/seam', '0.2.2'), chat: pkg('@schemastud/chat', '0.1.0', { '@schemastud/seam': '^0.3.0-beta.0' }) } });
        assert.equal((await lintPeers(stable, { release: true, tags: tags({ 'seam@': ['0.3.0-beta.1'] }) })).failures.length, 1, 'a stable manifest ignores 0.3.0-beta.1');
        const pre = tree({ packages: { seam: pkg('@schemastud/seam', '0.3.0-beta.0'), chat: pkg('@schemastud/chat', '0.1.0', { '@schemastud/seam': '^0.3.0-beta.1' }) } });
        assert.deepEqual((await lintPeers(pre, { release: true, tags: tags({ 'seam@': ['0.3.0-beta.1'] }) })).failures, [], 'a prerelease manifest reads 0.3.0-beta.1');
    });

    it('fails CLOSED: no git, or a git checkout with zero tags, exits 2; with tags it reads them; --manifest-only is the only way to skip them', () => {
        const root = tree({ packages: { combobox: pkg('@schemastud/combobox', '0.1.0'), facets: pkg('@schemastud/facets', '0.2.2', { '@schemastud/combobox': '^0.2.0' }) } });
        const cli = (...args) => spawnSync(process.execPath, [script, '--root', root, '--release', ...args], { encoding: 'utf8', env: { ...process.env, SEMVER_MODULE: semverEntry } });
        const noGit = cli();
        assert.equal(noGit.status, 2, noGit.stdout + noGit.stderr);
        assert.match(noGit.stderr, /release tags cannot be read/);
        const git = (...a) => execFileSync('git', ['-C', root, ...a], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
        git('init', '-q'); git('config', 'user.email', 'fixture@example.test'); git('config', 'user.name', 'Fixture');
        git('add', '-A'); git('commit', '-qm', 'tree');
        const noTags = cli();
        assert.equal(noTags.status, 2, noTags.stdout + noTags.stderr);
        assert.match(noTags.stderr, /has no tags: fetch them/);
        git('tag', 'combobox@0.2.2');
        const tagged = cli();
        assert.equal(tagged.status, 0, tagged.stdout + tagged.stderr);
        const manifestOnly = cli('--manifest-only');
        assert.equal(manifestOnly.status, 1, 'explicitly manifest-only: the lagging peer fails');
        assert.match(manifestOnly.stderr, /excludes the workspace's @schemastud\/combobox 0\.1\.0/);
    });
});
