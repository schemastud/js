#!/usr/bin/env node
/**
 * The import census: which names of a root barrel does any file import BY NAME from that specifier?
 *
 *   node scripts/import-census.mjs [<root>...] [--barrel <specifier>=<entry.ts>]... [--list] [--names a,b,...] [--json]
 *
 *   <root>     a directory to scan for importers (default: this workspace). Pass every tree that may
 *              import the barrel: host apps, starters, other package workspaces.
 *   --barrel   a barrel to count, repeatable (default: the frame root, frame/shadcn and the seam root)
 *   --list     also print every exported name with its importer counts
 *   --names    print the importers of these names, and exit 1 if any file imports one, with or
 *              without --json. Run it before removing names from a barrel.
 *
 * Exit: 0 counted (and, with --names, nothing imports them), 1 a file imports an asked name,
 * 2 usage error or a root that does not exist or cannot be read.
 *   --json     print the whole census as JSON
 *
 * Instrument. Each barrel's export list comes from export-list.mjs. Each scanned file that mentions the
 * specifier is parsed, and `import { a } from '<specifier>'` and `export { a } from '<specifier>'` are
 * counted against the exact specifier, so the same spelling in a comment or from another module is not
 * a hit. What a named import cannot show is reported per file as an "other reference": a namespace
 * import, `export *`, a dynamic `import()`, `require()` and a test mock. With --names, a word match of
 * each name in the files that mention the specifier is printed too; it is a superset to read by eye.
 * An .mdx file is read by pattern instead of parsed, so a docs sample that imports a name counts.
 *
 * A file is a test when it sits under a tests/stories directory or is named *.test.*, *.spec.*,
 * *.stories.* or *.test-d.*; a name imported only by tests still breaks that importer's build if it
 * moves. An importer is a host when an `artisan` file sits at or above its package; otherwise a package.
 *
 * Skipped: node_modules, vendor, dist, build, coverage, storybook-static and every dot-directory (so
 * hidden worktrees are not counted). A directory reached twice through a symlink is counted once.
 */
import { existsSync, readdirSync, readFileSync, realpathSync, statSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import { exportList } from './export-list.mjs';

const WORKSPACE = dirname(dirname(fileURLToPath(import.meta.url)));
const DEFAULT_BARRELS = [
    ['@schemastud/frame', 'frame/src/index.ts'],
    ['@schemastud/frame/shadcn', 'frame/src/shadcn/index.tsx'],
    ['@schemastud/seam', 'seam/src/index.ts'],
];
const SKIP_DIRS = new Set(['node_modules', 'vendor', 'dist', 'build', 'coverage', 'storybook-static']);
const SOURCE_FILE = /\.([cm]?[jt]sx?|mdx)$/;
const TEST_FILE = /(^|\/)(tests?|__tests__|stories|e2e)\/|\.(test|spec|stories|test-d)\.[^/]+$/;
const MOCK_CALLS = new Set(['require', 'vi.mock', 'vi.doMock', 'vi.importActual', 'vi.importMock', 'jest.mock']);

/** Every scannable file under the roots, each real path once. */
function* walk(roots) {
    const seen = new Set();
    const stack = roots.map((root) => resolve(root));
    while (stack.length > 0) {
        let dir;
        try {
            dir = realpathSync(stack.pop());
        } catch {
            continue; // a dangling symlink
        }
        if (seen.has(dir)) continue;
        seen.add(dir);
        for (const entry of readdirSync(dir, { withFileTypes: true })) {
            if (entry.name.startsWith('.') || SKIP_DIRS.has(entry.name)) continue;
            const path = join(dir, entry.name);
            let isDir = entry.isDirectory();
            let isFile = entry.isFile();
            if (entry.isSymbolicLink()) {
                try {
                    const stat = statSync(path);
                    isDir = stat.isDirectory();
                    isFile = stat.isFile();
                } catch {
                    continue;
                }
            }
            if (isDir) stack.push(path);
            else if (isFile && SOURCE_FILE.test(entry.name) && !seen.has(path)) {
                seen.add(path);
                yield path;
            }
        }
    }
}

/** What one file takes from one specifier: the names it imports, and the references a name cannot show. */
function referencesIn(file, text, specifier) {
    const names = [];
    const other = [];
    if (file.endsWith('.mdx')) {
        const quoted = specifier.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&');
        const statement = new RegExp(`\\b(?:import|export)\\s+(?:type\\s+)?\\{([^}]*)\\}\\s*from\\s*['"]${quoted}['"]`, 'g');
        for (const [, list] of text.matchAll(statement)) {
            for (const item of list.split(',')) {
                const name = item.trim().replace(/^type\s+/, '').split(/\s+as\s+/)[0];
                if (name) names.push(name);
            }
        }
        return { names, other };
    }
    const source = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, false);
    const isSpecifier = (node) => node && ts.isStringLiteralLike(node) && node.text === specifier;

    const visit = (node) => {
        if (ts.isImportDeclaration(node) && isSpecifier(node.moduleSpecifier)) {
            const bindings = node.importClause?.namedBindings;
            if (bindings && ts.isNamedImports(bindings)) {
                for (const el of bindings.elements) names.push((el.propertyName ?? el.name).text);
            } else {
                other.push(bindings ? 'namespace import' : 'import without names');
            }
        } else if (ts.isExportDeclaration(node) && isSpecifier(node.moduleSpecifier)) {
            if (node.exportClause && ts.isNamedExports(node.exportClause)) {
                for (const el of node.exportClause.elements) names.push((el.propertyName ?? el.name).text);
            } else {
                other.push('export *');
            }
        } else if (ts.isCallExpression(node) && isSpecifier(node.arguments[0])) {
            const callee = node.expression.kind === ts.SyntaxKind.ImportKeyword ? 'import()' : node.expression.getText(source);
            if (callee === 'import()' || MOCK_CALLS.has(callee)) other.push(callee);
        }
        ts.forEachChild(node, visit);
    };
    visit(source);
    return { names, other };
}

/** The package a file belongs to (its nearest package.json), and whether that package is a host app. */
const importerCache = new Map();
function importerOf(file) {
    const start = dirname(file);
    if (importerCache.has(start)) return importerCache.get(start);
    let root = null;
    let host = false;
    for (let dir = start; ; dir = dirname(dir)) {
        if (root === null && existsSync(join(dir, 'package.json'))) root = dir;
        if (existsSync(join(dir, 'artisan'))) host = true;
        if (existsSync(join(dir, '.git')) || dir === dirname(dir)) break;
    }
    const importer = { root: tilde(root ?? start), host };
    importerCache.set(start, importer);
    return importer;
}

function tilde(path) {
    return path.startsWith(homedir()) ? `~${path.slice(homedir().length)}` : path;
}

export function census(roots, barrels) {
    const results = barrels.map(([specifier, entry]) => {
        const exported = exportList(entry).map((line) => {
            const [kind, name] = line.split(' ');
            return { name, kind, source: [], tests: [] };
        });
        return { specifier, entry, exported, byName: new Map(exported.map((e) => [e.name, e])), notExported: [], other: [], mentions: [] };
    });

    for (const file of walk(roots)) {
        const text = readFileSync(file, 'utf8');
        const hits = results.filter((r) => text.includes(r.specifier));
        if (hits.length === 0) continue;
        const importer = importerOf(file);
        const isTest = TEST_FILE.test(file);
        for (const result of hits) {
            const { names, other } = referencesIn(file, text, result.specifier);
            result.mentions.push({ file, text });
            if (other.length > 0) result.other.push({ file: tilde(file), references: [...new Set(other)] });
            for (const name of new Set(names)) {
                const entry = result.byName.get(name);
                const hit = { file: tilde(file), ...importer };
                if (!entry) result.notExported.push({ name, ...hit });
                else (isTest ? entry.tests : entry.source).push(hit);
            }
        }
    }
    return results;
}

function summarize(result) {
    const { exported } = result;
    const bySource = exported.filter((e) => e.source.length > 0);
    const importers = new Map();
    for (const e of exported) for (const hit of [...e.source, ...e.tests]) importers.set(hit.root, hit.host);
    return {
        exported: exported.length,
        values: exported.filter((e) => e.kind === 'value').length,
        types: exported.filter((e) => e.kind === 'type').length,
        bySource: bySource.length,
        byHostSource: bySource.filter((e) => e.source.some((hit) => hit.host)).length,
        byTestsOnly: exported.filter((e) => e.source.length === 0 && e.tests.length > 0).length,
        byNothing: exported.filter((e) => e.source.length === 0 && e.tests.length === 0).length,
        hosts: [...importers].filter(([, host]) => host).map(([root]) => root).sort(),
        packages: [...importers].filter(([, host]) => !host).map(([root]) => root).sort(),
    };
}

function printSummary(result) {
    const s = summarize(result);
    console.log(`${result.specifier}  (${tilde(resolve(result.entry))})`);
    console.log(`  exported                    ${s.exported} (${s.values} values, ${s.types} types)`);
    console.log(`  imported by a source file   ${s.bySource} (${s.byHostSource} by a host, ${s.bySource - s.byHostSource} by packages only)`);
    console.log(`  by tests or stories only    ${s.byTestsOnly}`);
    console.log(`  by nothing                  ${s.byNothing}`);
    console.log(`  importing hosts (${s.hosts.length})${s.hosts.map((r) => `\n    ${r}`).join('')}`);
    console.log(`  importing packages (${s.packages.length})${s.packages.map((r) => `\n    ${r}`).join('')}`);
    console.log(`  other references            ${result.other.length} files (namespace, export *, dynamic import, require, mock)`);
    for (const o of result.other) console.log(`    ${o.file}: ${o.references.join(', ')}`);
    if (result.notExported.length > 0) {
        console.log(`  imported but not exported   ${result.notExported.length}`);
        for (const n of result.notExported) console.log(`    ${n.name}  ${n.file}`);
    }
}

function printList(result) {
    for (const e of result.exported) {
        const roots = [...new Set([...e.source, ...e.tests].map((hit) => hit.root))];
        console.log(`  ${e.kind.padEnd(5)} ${e.name.padEnd(34)} source ${String(e.source.length).padStart(3)}  tests ${String(e.tests.length).padStart(3)}  ${roots.join(' ')}`);
    }
}

/** Every import of one asked name, from source files and tests alike. */
function importsOf(result, name) {
    const entry = result.byName.get(name);
    return entry ? [...entry.source, ...entry.tests] : result.notExported.filter((n) => n.name === name);
}

/** How many imports of the asked names the census found, across every barrel. */
function countImports(results, names) {
    return results.reduce((sum, result) => sum + names.reduce((n, name) => n + importsOf(result, name).length, 0), 0);
}

/** Importers of the asked names, and a word match of each name in the files that mention the specifier. */
function printNames(result, names) {
    for (const name of names) {
        const entry = result.byName.get(name);
        const hits = importsOf(result, name);
        const importing = new Set(hits.map((hit) => hit.file));
        const word = new RegExp(`(?<![\\w$])${name.replace(/[$]/g, '\\$&')}(?![\\w$])`);
        const mentioned = result.mentions.filter((m) => word.test(m.text) && !importing.has(tilde(m.file)));
        if (hits.length === 0 && mentioned.length === 0) continue;
        console.log(`  ${name}${entry ? '' : '  (not exported)'}`);
        for (const hit of hits) console.log(`    imports   ${hit.file}`);
        for (const m of mentioned) console.log(`    mentions  ${tilde(m.file)}`);
    }
}

/** An explicit scan root must be a readable directory: a missing tree is not a tree with no importers. */
function unreadableRoot(root) {
    try {
        if (!statSync(root).isDirectory()) return 'not a directory';
        readdirSync(root);
        return null;
    } catch (error) {
        return error.code ?? String(error);
    }
}

function main(argv) {
    const roots = [];
    const barrels = [];
    let names = null;
    let list = false;
    let json = false;
    for (let i = 0; i < argv.length; i++) {
        const arg = argv[i];
        if (arg === '--barrel' && argv[i + 1]?.includes('=')) {
            const value = argv[++i];
            barrels.push([value.slice(0, value.indexOf('=')), value.slice(value.indexOf('=') + 1)]);
        } else if (arg === '--names' && argv[i + 1]) {
            names = argv[++i].split(',').map((n) => n.trim()).filter(Boolean);
        } else if (arg === '--list') list = true;
        else if (arg === '--json') json = true;
        else if (arg.startsWith('--')) {
            console.error('usage: import-census [<root>...] [--barrel <specifier>=<entry.ts>]... [--list] [--names a,b,...] [--json]');
            return 2;
        } else roots.push(arg);
    }

    const unreadable = roots.map((root) => [root, unreadableRoot(root)]).filter(([, why]) => why !== null);
    if (unreadable.length > 0) {
        for (const [root, why] of unreadable) console.error(`cannot scan ${root}: ${why}`);
        console.error('Refusing to count: a root that cannot be read would report its importers as none.');
        return 2;
    }

    const results = census(
        roots.length > 0 ? roots : [WORKSPACE],
        barrels.length > 0 ? barrels : DEFAULT_BARRELS.map(([specifier, entry]) => [specifier, join(WORKSPACE, entry)]),
    );

    // The exit status is the same whatever the output format.
    const imported = names ? countImports(results, names) : 0;
    const status = imported > 0 ? 1 : 0;

    if (json) {
        console.log(JSON.stringify(results.map((r) => ({
            specifier: r.specifier,
            entry: r.entry,
            summary: summarize(r),
            exported: r.exported,
            notExported: r.notExported,
            other: r.other,
            ...(names ? { asked: Object.fromEntries(names.map((name) => [name, importsOf(r, name)])) } : {}),
        })), null, 2));
        return status;
    }

    for (const result of results) {
        printSummary(result);
        if (list) printList(result);
        if (names) printNames(result, names);
        console.log('');
    }
    if (names) console.log(imported === 0 ? 'No file imports any of the asked names.' : `${imported} imports of the asked names.`);
    return status;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
    process.exitCode = main(process.argv.slice(2));
}
