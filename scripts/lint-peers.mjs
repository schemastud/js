#!/usr/bin/env node
/**
 * Sibling ranges (frame-foundation 80): a range a workspace package declares on a WORKSPACE SIBLING must cover the version that
 * sibling carries. Which fields, and which version, depend on the commit (below).
 *
 * Why: at `c64c712` (the release commit tagged `seam@0.5.2`) the workspace's own `npm ci` could not install.
 *   - chat peered `"@schemastud/seam": "^0.2.0 || ^0.3.0"` while the workspace's seam was 0.5.2: npm tried to place a
 *     registry seam 0.2.2 for chat's optional peer beside the linked 0.5.2 (ERESOLVE);
 *   - `messages` was 0.0.0 while ten siblings required `^0.1.0` (dev) / `>=0.1.0 <1` (peer): npm went to the registry for a
 *     messages that is not published (404), even with --legacy-peer-deps.
 * Nothing caught it: CI ran on main, where the versions fit, and the release path checked nothing across siblings.
 *
 * The two modes:
 *   - default (CI on main and PRs): `peerDependencies`, against the CHANGESETS RELEASE PLAN's version
 *     (`@changesets/get-release-plan`, the plan `changeset version` applies). On an ordinary commit a sibling's manifest can
 *     lag its source: `blockdoc` peers `seam ^0.3.0` because it imports `useFormValidator`, which published seam 0.2.2 lacks
 *     and the pending `seam-messages` minor ships; checking the lagging manifest would fail CORRECT ranges. Only peers: at
 *     version time changesets rewrites the internal `dependencies` / `devDependencies` / `optionalDependencies` ranges
 *     itself (`updateInternalDependencies`), but a peer only when it leaves range, by forcing a MAJOR on the dependent: the
 *     case to catch first.
 *   - `--release` (the release path: eco's tools/js-release/release-package at the commit it tags, and the tag-push
 *     workflow): ALL four fields, against the MANIFEST versions, exactly what that tree carries and `npm ci` resolves.
 *     The release path runs it UNSCOPED (the whole workspace must install at a release commit: review M1). `--package
 *     <name>` narrows it to that package's ranges and every sibling's range on it, for diagnosis; a `--package` that is not
 *     a workspace (big-calendar: tracked here, released on its own, not linked by npm) is a note and exits 0 (review H2).
 *   In the default mode the release-mode gaps (all fields, manifest versions) are printed as WARNINGS, not failures: the
 *   release path refuses them; CI shows them early (review M2: eco's release-plan edits only the released package's version
 *   and its own peer ranges, so nothing rewrites a sibling's dependency ranges before a release is cut).
 *
 * Rules (each failure names the package, the field, the dependency, the range and the version):
 *   - `--fields a,b` overrides the mode's fields; OPTIONAL peers are checked like the rest (c64c712's was one);
 *   - `semver.satisfies(version, range)` with npm's semantics: a PRERELEASE sibling is covered only by a range naming a
 *     prerelease of the same major.minor.patch (`^0.6.0-beta.0`), so a prerelease sibling under a plain range is RED;
 *   - a `workspace:` spec fails on ANY key: npm does not understand it, and a published manifest would carry it as is;
 *   - an `npm:` alias OF A SIBLING (`"x": "npm:@schemastud/seam@^0.2.0"`) is checked as that sibling's range (review L3);
 *   - a spec that is not a range (`file:`, `link:`, a git or URL pin, an `npm:` alias of a non-sibling) resolves by its own spec, not by the
 *     sibling's version: reported as a note, not checked;
 *   - an invalid range, or a sibling version that is not semver, fails;
 *   - a dependency on a package that has a manifest in this repository but is NOT a workspace (npm does not link it) is a
 *     note: it resolves from the registry, not from this tree;
 *   - if the release plan cannot be computed, the check fails (closed); it never silently falls back to the manifests.
 *
 * Runs with nothing installed in `--release` mode when `SEMVER_MODULE` names a `semver` entry file (the release tool passes
 * its own): no install and no writes, only reads of the tree's manifests. Otherwise it imports the workspace's `semver`.
 *
 * usage: node scripts/lint-peers.mjs [--root <workspace root>] [--release [--package <name>]] [--fields <a,b,...>] [--json]
 * exit: 0 every sibling range covered; 1 a range misses (listed); 2 the check could not run.
 */
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

/** The manifest fields each mode reads. */
export const PLANNED_FIELDS = ['peerDependencies'];
export const RELEASE_FIELDS = ['dependencies', 'optionalDependencies', 'devDependencies', 'peerDependencies'];
const KNOWN_FIELDS = RELEASE_FIELDS;
/** A spec npm resolves by itself, not against the sibling's version. */
const NOT_A_RANGE = /^(?:file:|link:|git(?:\+[a-z]+)?:|github:|gitlab:|bitbucket:|https?:|npm:)|^[\w.-]+\/[\w.-]+(?:#.*)?$/;

function readJson(path) {
    return JSON.parse(readFileSync(path, 'utf8'));
}

async function loadSemver() {
    const explicit = process.env.SEMVER_MODULE;
    const mod = explicit ? await import(pathToFileURL(resolve(explicit)).href) : await import('semver');
    return mod.default ?? mod;
}

/** The workspace directories: `workspaces` as an array or `{ packages }`, each entry a path or a one-level `dir/*` glob. */
export function workspaceDirs(root) {
    const manifest = readJson(join(root, 'package.json'));
    const entries = Array.isArray(manifest.workspaces) ? manifest.workspaces : (manifest.workspaces?.packages ?? []);
    const dirs = [];
    for (const entry of entries) {
        if (entry.endsWith('/*')) {
            const base = join(root, entry.slice(0, -2));
            if (!existsSync(base)) continue;
            for (const name of readdirSync(base).sort()) {
                const dir = join(base, name);
                if (statSync(dir).isDirectory() && existsSync(join(dir, 'package.json'))) dirs.push(dir);
            }
        } else if (/[*?[\]{}!]/.test(entry)) {
            throw new Error(`workspace entry "${entry}": only plain paths and one-level "dir/*" globs are supported`);
        } else if (existsSync(join(root, entry, 'package.json'))) {
            dirs.push(join(root, entry));
        }
    }
    return dirs;
}

/** Package manifests in the repository's top-level directories that are NOT workspaces (npm does not link them). */
function outsideWorkspaces(root, workspaceSet) {
    const found = new Map();
    for (const name of readdirSync(root).sort()) {
        const dir = join(root, name);
        if (name === 'node_modules' || name.startsWith('.') || !statSync(dir).isDirectory()) continue;
        const path = join(dir, 'package.json');
        if (!existsSync(path) || workspaceSet.has(dir)) continue;
        const manifest = readJson(path);
        if (manifest.name) found.set(manifest.name, manifest.version ?? null);
    }
    return found;
}

/** The release plan's versions. changesets' own warnings (printed while it builds the plan) are captured and returned as notes. */
async function plannedVersions(root) {
    if (!existsSync(join(root, '.changeset'))) return { versions: new Map(), said: [] };
    const { default: getReleasePlan } = await import('@changesets/get-release-plan');
    const said = [];
    const saved = { log: console.log, warn: console.warn, error: console.error, info: console.info };
    for (const k of Object.keys(saved)) console[k] = (...args) => said.push(args.map(String).join(' '));
    let plan;
    try {
        plan = await getReleasePlan(root);
    } finally {
        Object.assign(console, saved);
    }
    return { versions: new Map(plan.releases.filter((r) => r.type !== 'none').map((r) => [r.name, r.newVersion])), said };
}

export async function lintPeers(root, { release = false, fields = release ? RELEASE_FIELDS : PLANNED_FIELDS, only = null } = {}) {
    const unknown = fields.filter((f) => !KNOWN_FIELDS.includes(f));
    if (unknown.length) throw new Error(`unknown field(s) ${unknown.join(', ')} (known: ${KNOWN_FIELDS.join(', ')})`);
    const semver = await loadSemver();
    const dirs = workspaceDirs(root);
    const packages = dirs.map((dir) => ({ dir, manifest: readJson(join(dir, 'package.json')) }));
    const version = new Map(packages.map(({ manifest }) => [manifest.name, manifest.version]));
    if (only && !version.has(only)) {
        return { root, mode: release ? 'release' : 'planned', package: only, fields, checked: [], failures: [], warnings: [],
            notes: [`--package ${only} is not a workspace package (npm does not link it; it installs and releases on its own): nothing to check`] };
    }
    const plan = release ? { versions: new Map(), said: [] } : await plannedVersions(root);
    const outside = outsideWorkspaces(root, new Set(dirs));
    const failures = [];
    const notes = plan.said.map((line) => `changesets (building the release plan): ${line}`);
    const checked = [];
    for (const { manifest } of packages) {
        const optional = manifest.peerDependenciesMeta ?? {};
        for (const field of fields) {
            for (let [dep, range] of Object.entries(manifest[field] ?? {})) {
                const what = `${manifest.name} ${field}["${dep}"] "${range}"${field === 'peerDependencies' && optional[dep]?.optional ? ' (optional peer)' : ''}`;
                if (typeof range === 'string' && range.startsWith('workspace:') && !version.has(dep)) {
                    failures.push(`${manifest.name} ${field}["${dep}"] "${range}": a workspace: spec is not a range npm can install or publish`);
                    continue;
                }
                const alias = typeof range === 'string' ? /^npm:(@[^@/]+\/[^@]+|[^@]+)@(.+)$/.exec(range) : null;
                if (alias && version.has(alias[1])) {
                    [dep, range] = [alias[1], alias[2]];
                }
                if (only && manifest.name !== only && dep !== only) continue;
                if (!version.has(dep)) {
                    if (outside.has(dep)) notes.push(`${what}: ${dep} has a manifest here but is not a workspace (npm resolves it from the registry, not this tree); not checked`);
                    continue;
                }
                const now = version.get(dep);
                const carried = plan.versions.get(dep) ?? now;
                const at = carried === now ? `${carried}` : `${carried} (planned by the pending changesets; ${now} in the manifest)`;
                if (typeof range !== 'string') {
                    failures.push(`${what}: not a string range`);
                    continue;
                }
                if (range.startsWith('workspace:')) {
                    failures.push(`${what}: a workspace: spec is not a range npm can install or publish; name the range that covers ${at}`);
                    continue;
                }
                if (NOT_A_RANGE.test(range)) {
                    notes.push(`${what}: not a version range (resolved by its own spec, not by the sibling's version); not checked`);
                    continue;
                }
                checked.push({ package: manifest.name, field, dep, range, version: carried });
                if (!semver.validRange(range)) failures.push(`${what}: not a valid semver range`);
                else if (!semver.valid(carried)) failures.push(`${what}: the sibling's version "${carried}" is not valid semver`);
                else if (!semver.satisfies(carried, range)) failures.push(`${what} excludes the workspace's ${dep} ${at}`);
            }
        }
    }
    const warnings = release ? [] : (await lintPeers(root, { release: true, only })).failures.map((f) => `release mode would refuse: ${f}`);
    return { root, mode: release ? 'release' : 'planned', package: only, fields, checked, failures, warnings, notes };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
    const argv = process.argv.slice(2);
    const opt = (name) => {
        const i = argv.indexOf(name);
        return i >= 0 ? argv[i + 1] : undefined;
    };
    const root = resolve(opt('--root') ?? join(dirname(fileURLToPath(import.meta.url)), '..'));
    const release = argv.includes('--release');
    const fields = opt('--fields') ? opt('--fields').split(',').map((f) => f.trim()).filter(Boolean) : release ? RELEASE_FIELDS : PLANNED_FIELDS;
    if (argv.includes('--package') && (!opt('--package') || opt('--package').startsWith('--'))) {
        console.error('lint:peers could not run: --package needs a package name');
        process.exit(2);
    }
    if (opt('--package') && !release) {
        console.error('lint:peers could not run: --package applies only with --release');
        process.exit(2);
    }
    let result;
    try {
        result = await lintPeers(root, { release, fields, only: opt('--package') ?? null });
    } catch (error) {
        console.error(`lint:peers could not run: ${error instanceof Error ? error.message : error}`);
        process.exit(2);
    }
    if (argv.includes('--json')) {
        console.log(JSON.stringify(result, null, 2));
    } else {
        for (const note of result.notes) console.log(`note: ${note}`);
        for (const warning of result.warnings) console.log(`warning: ${warning}`);
        for (const failure of result.failures) console.error(`FAIL: ${failure}`);
        console.log(
            `lint:peers (${result.mode} versions${result.package ? `, ${result.package}` : ''}; ${result.fields.join(', ')}): ${result.checked.length} sibling range(s) checked, ${result.failures.length} failing${result.warnings.length ? `, ${result.warnings.length} release-mode warning(s)` : ''}`,
        );
    }
    process.exit(result.failures.length ? 1 : 0);
}
