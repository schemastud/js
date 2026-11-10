#!/usr/bin/env node
// frame-vocabulary [--widgets <module>]... [--readers <module>]... [--out <path>] [--write]
//
// Writes (with --write) or compares the host's frame vocabulary: what each kit's registry binds, per name and
// context (ruling 05 §2; ticket 33). Exit 0: written, or current. Exit 1: missing or different. Exit 2: a usage
// error, an invalid --widgets function, or an invalid --readers map of wire keys to reader functions.
//
// A --widgets or --readers value that starts with ./, ../ or /, or names an existing file relative to cwd, is a source module
// and loads through the host's own Vite. Anything else is a package specifier. Vite and every package go through
// ONE resolver, resolveFromHost: the host's node_modules chain and the package's `exports`, taking `import`, then
// `node`, then `default`, as the host's own `import` would (Node 22.13, no flags).
import { existsSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { isAbsolute, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { runVocabulary } from '../dist/vocabulary.js';

const USAGE = 'usage: frame-vocabulary [--widgets <module>]... [--readers <module>]... [--out <path>] [--write]';

function parseArgs(argv) {
    const options = { widgets: [], readers: [], out: 'resources/frame/vocabulary.json', write: false };
    for (let i = 0; i < argv.length; i++) {
        const arg = argv[i];
        if (arg === '--write') options.write = true;
        else if (arg === '--widgets' || arg === '--readers' || arg === '--out') {
            const value = argv[++i];
            if (!value || value.startsWith('--')) throw new Error(`${arg} needs a value.`);
            if (arg === '--widgets') options.widgets.push(value);
            else if (arg === '--readers') options.readers.push(value);
            else options.out = value;
        } else if (arg.startsWith('--widgets=')) options.widgets.push(arg.slice('--widgets='.length));
        else if (arg.startsWith('--readers=')) options.readers.push(arg.slice('--readers='.length));
        else if (arg.startsWith('--out=')) options.out = arg.slice('--out='.length);
        else throw new Error(`unknown argument "${arg}".`);
    }
    return options;
}

class ResolveError extends Error {
    constructor(message, code) {
        super(message);
        this.code = code;
    }
}

function splitSpecifier(spec) {
    const parts = spec.split('/');
    const count = spec.startsWith('@') ? 2 : 1;
    const rest = parts.slice(count).join('/');
    return { name: parts.slice(0, count).join('/'), subpath: rest ? `./${rest}` : '.' };
}

const CONDITIONS = new Set(['import', 'node', 'default']);

/** The first matching condition's target, in the object's own key order, through nested objects and arrays. */
function pickTarget(entry) {
    if (typeof entry === 'string') return entry;
    if (Array.isArray(entry)) {
        for (const item of entry) {
            const found = pickTarget(item);
            if (found) return found;
        }
        return undefined;
    }
    if (entry && typeof entry === 'object') {
        for (const [key, value] of Object.entries(entry)) {
            if (!CONDITIONS.has(key)) continue;
            const found = pickTarget(value);
            if (found) return found;
        }
    }
    return undefined;
}

/** Node's PATTERN_KEY_COMPARE: negative when `a` is more specific than `b` (sorts first). */
function patternKeyCompare(a, b) {
    const baseA = a.indexOf('*') + 1;
    const baseB = b.indexOf('*') + 1;
    if (baseA > baseB) return -1;
    if (baseB > baseA) return 1;
    if (a.length > b.length) return -1;
    if (b.length > a.length) return 1;
    return 0;
}

function exportsTarget(exportsField, subpath, spec, root) {
    const conditionsOnly =
        exportsField && typeof exportsField === 'object' && !Array.isArray(exportsField) &&
        Object.keys(exportsField).every((key) => !key.startsWith('.'));
    const map = typeof exportsField === 'string' || Array.isArray(exportsField) || conditionsOnly
        ? { '.': exportsField }
        : exportsField;

    // An exact key wins over any pattern. Among patterns, Node's PACKAGE_EXPORTS_RESOLVE takes the most specific
    // match by PATTERN_KEY_COMPARE: the longest base before the '*', then the longest key. Never insertion order.
    let entry = Object.hasOwn(map, subpath) && !subpath.includes('*') ? map[subpath] : undefined;
    let star;
    if (entry === undefined) {
        let best;
        for (const key of Object.keys(map)) {
            const at = key.indexOf('*');
            if (at < 0 || key.indexOf('*', at + 1) >= 0) continue;
            const head = key.slice(0, at);
            const tail = key.slice(at + 1);
            // Node's own condition: the base is a prefix, the subpath is at least as long as the key, and it ends with
            // the trailer.
            const matches = subpath.startsWith(head) && subpath.length >= key.length && subpath.endsWith(tail);
            if (matches && (best === undefined || patternKeyCompare(best, key) > 0)) best = key;
        }
        if (best !== undefined) {
            const at = best.indexOf('*');
            entry = map[best];
            star = subpath.slice(at, subpath.length - (best.length - at - 1));
        }
    }
    if (entry === undefined) {
        throw new ResolveError(
            `Package subpath '${subpath}' is not defined by "exports" in ${root}/package.json (${spec})`,
            'ERR_PACKAGE_PATH_NOT_EXPORTED',
        );
    }
    const target = pickTarget(entry);
    if (!target) {
        throw new ResolveError(
            `No "import", "node" or "default" condition for '${subpath}' in ${root}/package.json (${spec})`,
            'ERR_PACKAGE_PATH_NOT_EXPORTED',
        );
    }
    return star === undefined ? target : target.split('*').join(star);
}

/**
 * The file URL the HOST's `import(spec)` would load: walk the host's node_modules chain (the directory list only,
 * never `require.resolve`, which applies `require` conditions), then the package's `exports`.
 */
function resolveFromHost(spec, cwd) {
    const { name, subpath } = splitSpecifier(spec);
    const paths = createRequire(join(cwd, 'package.json')).resolve.paths(name) ?? [];
    const root = paths.map((dir) => join(dir, name)).find((dir) => existsSync(join(dir, 'package.json')));
    if (!root) throw new ResolveError(`Cannot find package '${name}' imported from ${cwd}`, 'ERR_MODULE_NOT_FOUND');

    const manifest = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
    let target;
    if (manifest.exports !== undefined) target = exportsTarget(manifest.exports, subpath, spec, root);
    else if (subpath === '.') target = manifest.module ?? manifest.main ?? 'index.js';
    else target = subpath;
    return pathToFileURL(join(root, target)).href;
}

const isSourcePath = (value, cwd) =>
    value.startsWith('./') || value.startsWith('../') || isAbsolute(value) || existsSync(resolve(cwd, value));

/** A loader that serves source paths through one Vite server (closed by the caller) and packages through Node. */
function hostLoader(cwd) {
    let vite;
    const load = async (spec) => {
        if (!isSourcePath(spec, cwd)) return import(resolveFromHost(spec, cwd));
        if (!vite) {
            let viteModule;
            try {
                viteModule = await import(resolveFromHost('vite', cwd));
            } catch (error) {
                throw Object.assign(new Error(`Vite is needed to load the source module ${spec}: ${error.message}`), {
                    code: error.code,
                });
            }
            vite = await viteModule.createServer({
                root: cwd,
                appType: 'custom',
                logLevel: 'error',
                server: { middlewareMode: true, hmr: false },
            });
        }
        return vite.ssrLoadModule(resolve(cwd, spec));
    };
    const close = async () => {
        if (vite) await vite.close();
    };
    return { load, close };
}

async function main() {
    let options;
    try {
        options = parseArgs(process.argv.slice(2));
    } catch (error) {
        console.error(`frame-vocabulary: ${error.message}\n${USAGE}`);
        return 2;
    }
    const cwd = process.cwd();
    const loader = hostLoader(cwd);
    const flags = [
        ...options.widgets.flatMap((w) => ['--widgets', w]),
        ...options.readers.flatMap((r) => ['--readers', r]),
        ...(options.out ? ['--out', options.out] : []),
    ];
    try {
        const result = await runVocabulary({
            ...options,
            cwd,
            load: loader.load,
            command: ['frame-vocabulary', ...flags, '--write'].join(' '),
        });
        (result.exitCode === 0 ? console.log : console.error)(result.message);
        return result.exitCode;
    } finally {
        await loader.close();
    }
}

process.exitCode = await main();
