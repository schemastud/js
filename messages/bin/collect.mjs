import { createHash } from 'node:crypto';
import { existsSync, readFileSync, realpathSync, readdirSync } from 'node:fs';
import { dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { canonicalize, parseJson } from './jcs.mjs';

const read = path => parseJson(readFileSync(path, 'utf8'));
const digest = value => 'sha256:' + createHash('sha256').update(canonicalize(value), 'utf8').digest('hex');
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const fail = message => { throw new Error(message); };
const inside = (root, path) => { const rel = relative(root, path); return rel !== '' && !isAbsolute(rel) && rel !== '..' && !rel.startsWith('..' + sep); };

function installed(name, from) {
    for (let at = from; ; at = dirname(at)) {
        const path = join(at, 'node_modules', ...name.split('/'));
        if (existsSync(join(path, 'package.json'))) return realpathSync(path);
        if (dirname(at) === at) return null;
    }
}

function workspaces(root, manifest) {
    const patterns = Array.isArray(manifest.workspaces) ? manifest.workspaces : manifest.workspaces?.packages ?? [];
    const members = [];
    for (const pattern of patterns) {
        if (typeof pattern !== 'string' || pattern.includes('**')) fail('Unsupported workspace declaration');
        const parts = pattern.replace(/^\.\//, '').split('/');
        let paths = [root];
        for (const part of parts) {
            paths = paths.flatMap(at => part === '*'
                ? readdirSync(at, { withFileTypes: true }).filter(entry => entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules').map(entry => join(at, entry.name))
                : [resolve(at, part)]);
        }
        for (const path of paths) if (existsSync(join(path, 'package.json'))) members.push(realpathSync(path));
    }
    return members;
}

function catalogPath(root, manifest) {
    const marker = manifest.schemastud?.messages;
    if (!marker) return null;
    if (marker.version !== 1 || marker.catalog !== './messages') fail('Unsupported catalog discovery marker');
    let target = manifest.exports?.[marker.catalog];
    if (object(target)) target = target.import ?? target.default;
    if (typeof target !== 'string' || !target.startsWith('./') || !target.endsWith('.json')) fail('Catalog export must be a static JSON file');
    const path = realpathSync(resolve(root, target));
    if (!inside(root, path)) fail('Unsafe catalog export outside its package');
    return path;
}

function packageCatalog(manifest, catalog) {
    if (!object(catalog) || catalog.version !== 1 || catalog.sourceLocale !== 'en' || catalog.package !== manifest.name
        || typeof catalog.namespace !== 'string' || !/^[a-z0-9]+(?:[-_][a-z0-9]+)*$/.test(catalog.namespace)
        || !(catalog.sharesWith === null || typeof catalog.sharesWith === 'string' && /^[a-z0-9_.-]+\/[a-z0-9_.-]+$/.test(catalog.sharesWith))
        || !object(catalog.messages)) fail('Invalid version1 package catalog');
    for (const [key, text] of Object.entries(catalog.messages)) {
        if (!key.startsWith(catalog.namespace + '::') || !validItem(key.slice(catalog.namespace.length + 2)) || typeof text !== 'string') fail('Invalid catalog key/default: ' + key);
    }
}
function validItem(key) {
    return /^[A-Za-z0-9_:/-]+(?:\.[A-Za-z0-9_:/-]+)+$/.test(key)
        && !['resources', 'data', 'enums', 'actions', 'nav', 'groups'].includes(key.split('.')[0]);
}

/** Read declared root dependencies (including dev), transitive production dependencies and public workspaces, never execute catalog JS. */
export function collect(root, hostCatalog, exclusions = []) {
    root = realpathSync(root);
    const host = read(join(root, 'package.json'));
    const excluded = new Set(exclusions);
    const queue = [root, ...workspaces(root, host).filter(at => !read(join(at, 'package.json')).private)];
    const visited = new Set(); const runtimes = new Set();
    const packages = new Map(); const namespaceOwners = new Map(); const messages = Object.create(null);
    for (let cursor = 0; cursor < queue.length; cursor++) {
        const at = realpathSync(queue[cursor]);
        if (visited.has(at)) continue;
        visited.add(at);
        const manifest = read(join(at, 'package.json'));
        if (at !== root && excluded.has(manifest.name)) {
            if (Object.hasOwn(manifest.schemastud ?? {}, 'messages')) fail('Excluded package carries a catalog: ' + manifest.name);
            continue;
        }
        if (manifest.name === '@schemastud/messages') {
            if (manifest.schemastud?.messages?.runtimeAbi !== 1) fail('Incompatible messages runtime ABI');
            runtimes.add(at);
            if (runtimes.size > 1) fail('More than one installed @schemastud/messages runtime');
        }
        const path = catalogPath(at, manifest);
        if (path) {
            const catalog = read(path); packageCatalog(manifest, catalog);
            const owner = catalog.sharesWith ?? manifest.name;
            const admitted = namespaceOwners.get(catalog.namespace);
            if (admitted !== undefined && admitted !== owner) fail('Conflicting namespace ownership: ' + catalog.namespace);
            namespaceOwners.set(catalog.namespace, owner);
            const record = { name: manifest.name, namespace: catalog.namespace, sharesWith: catalog.sharesWith, catalogDigest: digest(catalog) };
            const previous = packages.get(manifest.name);
            if (previous && canonicalize(previous) !== canonicalize(record)) fail('Conflicting catalog copies: ' + manifest.name);
            packages.set(manifest.name, record);
            for (const [key, text] of Object.entries(catalog.messages)) {
                const entry = { default: text, owner: manifest.name };
                if (Object.hasOwn(messages, key) && canonicalize(messages[key]) !== canonicalize(entry)) fail('Conflicting catalog default/owner: ' + key);
                messages[key] = entry;
            }
        }
        const dependencies = { ...(at === root ? manifest.devDependencies : {}), ...manifest.dependencies, ...manifest.optionalDependencies, ...manifest.peerDependencies };
        for (const name of Object.keys(dependencies)) {
            const dependency = installed(name, at);
            if (dependency) queue.push(dependency);
            else if (!excluded.has(name) && !Object.hasOwn(manifest.optionalDependencies ?? {}, name) && !manifest.peerDependenciesMeta?.[name]?.optional) fail('Missing installed production dependency: ' + name);
        }
    }
    if (hostCatalog) {
        const catalog = read(resolve(root, hostCatalog));
        if (!object(catalog) || catalog.version !== 1 || catalog.sourceLocale !== 'en' || !object(catalog.messages)
            || Object.hasOwn(catalog, 'namespace') || Object.hasOwn(catalog, 'package')) fail('Invalid host catalog');
        for (const [key, text] of Object.entries(catalog.messages)) {
            if (key.includes('::') || !validItem(key) || typeof text !== 'string') fail('Invalid host key/default: ' + key);
            if (Object.hasOwn(messages, key)) fail('Conflicting host key: ' + key);
            messages[key] = { default: text, owner: host.name ?? '@host' };
        }
    }
    const ordered = [...packages.values()].sort((a, b) => a.name < b.name ? -1 : a.name > b.name ? 1 : a.namespace < b.namespace ? -1 : a.namespace > b.namespace ? 1 : 0);
    const payload = { version: 1, packages: ordered, messages };
    return canonicalize({ payload, digest: digest(payload) }) + '\n';
}
