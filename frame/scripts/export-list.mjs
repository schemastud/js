#!/usr/bin/env node
/**
 * What a barrel exports, as a committed list beside it (`src/index.ts` -> `src/index.exports.txt`).
 *
 *   node scripts/export-list.mjs <barrel.ts>           print the list
 *   node scripts/export-list.mjs <barrel.ts> --write   regenerate the committed list
 *   node scripts/export-list.mjs <barrel.ts> --check   compare with the committed list; never writes
 *
 * The committed list makes a change to a package's public names a reviewed line in a diff. A package's
 * test runs `--check`, so an export that is not on the list (or a listed name that is gone) fails the
 * suite until `--write` is run and the new list is committed.
 *
 * One line per exported name, sorted by name: `value <name>` or `type <name>`. The names come from the
 * TypeScript checker (so `export *` is followed); the kind is `type` for a type-only export or a
 * declaration with no runtime value.
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

/** Every name `entry` exports, as sorted `value <name>` / `type <name>` lines. */
export function exportList(entry) {
    const file = resolve(entry);
    const configPath = ts.findConfigFile(dirname(file), ts.sys.fileExists);
    const options = configPath
        ? ts.getParsedCommandLineOfConfigFile(configPath, {}, { ...ts.sys, onUnRecoverableConfigFileDiagnostic: () => {} })?.options ?? {}
        : {};
    const program = ts.createProgram({ rootNames: [file], options: { ...options, noEmit: true } });
    const source = program.getSourceFile(file);
    if (!source) throw new Error(`${entry}: not a TypeScript source file`);

    const checker = program.getTypeChecker();
    const moduleSymbol = checker.getSymbolAtLocation(source);
    if (!moduleSymbol) return [];

    const viaTypeOnlyStar = typeOnlyStarNames(source, checker, new Set());
    return checker
        .getExportsOfModule(moduleSymbol)
        .map((symbol) => `${kindOf(symbol, checker, viaTypeOnlyStar)} ${symbol.getName()}`)
        .sort((a, b) => compareNames(a.split(' ')[1], b.split(' ')[1]));
}

function kindOf(symbol, checker, viaTypeOnlyStar) {
    const typeOnly = (symbol.declarations ?? []).some(
        (d) =>
            (ts.isExportSpecifier(d) && (d.isTypeOnly || d.parent.parent.isTypeOnly)) ||
            (ts.isNamespaceExport(d) && d.parent.isTypeOnly),
    );
    if (typeOnly || viaTypeOnlyStar.has(symbol.getName())) return 'type';
    const target = symbol.flags & ts.SymbolFlags.Alias ? checker.getAliasedSymbol(symbol) : symbol;
    return target.flags & ts.SymbolFlags.Value ? 'value' : 'type';
}

/**
 * The names a file exports only through a type-only star (`export type * from`), directly or
 * through a plain `export *` of a file that does. A star never re-exports a name the file
 * exports itself, so the file's own names are left out.
 */
function typeOnlyStarNames(source, checker, visiting) {
    const names = new Set();
    if (visiting.has(source.fileName)) return names;
    visiting.add(source.fileName);

    const own = new Set();
    for (const statement of source.statements) {
        if (ts.isExportDeclaration(statement)) {
            const clause = statement.exportClause;
            if (clause && ts.isNamedExports(clause)) for (const el of clause.elements) own.add(el.name.text);
            else if (clause && ts.isNamespaceExport(clause)) own.add(clause.name.text);
        } else if (ts.canHaveModifiers(statement) && ts.getModifiers(statement)?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword)) {
            if (statement.name && ts.isIdentifier(statement.name)) own.add(statement.name.text);
            if (ts.isVariableStatement(statement)) {
                for (const d of statement.declarationList.declarations) if (ts.isIdentifier(d.name)) own.add(d.name.text);
            }
        }
    }

    for (const statement of source.statements) {
        if (!ts.isExportDeclaration(statement) || statement.exportClause || !statement.moduleSpecifier) continue;
        const target = checker.getSymbolAtLocation(statement.moduleSpecifier);
        if (!target) continue;
        const reached = statement.isTypeOnly
            ? checker.getExportsOfModule(target).map((s) => s.getName())
            : [...(target.declarations ?? [])]
                  .filter(ts.isSourceFile)
                  .flatMap((file) => [...typeOnlyStarNames(file, checker, visiting)]);
        for (const name of reached) if (!own.has(name)) names.add(name);
    }
    return names;
}

function compareNames(a, b) {
    return a < b ? -1 : a > b ? 1 : 0;
}

/** Where a barrel's committed list lives: beside it. */
export function listPath(entry) {
    return resolve(entry).replace(/\.[cm]?tsx?$/, '.exports.txt');
}

/** The committed lines, without comments or blanks. */
export function readList(path) {
    if (!existsSync(path)) return [];
    return readFileSync(path, 'utf8')
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => line !== '' && !line.startsWith('#'));
}

function render(lines, entry) {
    // The workspace root (this script lives in frame/scripts/), so a list's header names its barrel as frame/src/….
    const root = dirname(dirname(dirname(fileURLToPath(import.meta.url))));
    const header = [
        `# What ${relative(root, resolve(entry))} exports. A test compares this file with the barrel and never writes it.`,
        '# Regenerate with `npm run export-list`, and commit the result with the change that moved a name.',
    ];
    return [...header, ...lines].join('\n') + '\n';
}

function main(argv) {
    const flags = argv.filter((a) => a.startsWith('--'));
    const [entry] = argv.filter((a) => !a.startsWith('--'));
    const unknown = flags.filter((f) => f !== '--write' && f !== '--check');
    if (!entry || unknown.length > 0 || flags.length > 1) {
        console.error('usage: export-list <barrel.ts> [--write | --check]');
        return 2;
    }

    const actual = exportList(entry);
    const path = listPath(entry);

    if (flags[0] === '--write') {
        writeFileSync(path, render(actual, entry));
        console.log(`wrote ${actual.length} names to ${relative(process.cwd(), path)}`);
        return 0;
    }

    if (flags[0] === '--check') {
        const committed = readList(path);
        const unlisted = actual.filter((line) => !committed.includes(line));
        const gone = committed.filter((line) => !actual.includes(line));
        if (unlisted.length === 0 && gone.length === 0) {
            console.log(`${relative(process.cwd(), path)}: ${actual.length} names, matches the barrel`);
            return 0;
        }
        for (const line of unlisted) console.error(`exported but not listed: ${line}`);
        for (const line of gone) console.error(`listed but not exported: ${line}`);
        console.error(`${relative(process.cwd(), path)} differs from the barrel. Run \`npm run export-list\` and commit the list.`);
        return 1;
    }

    console.log(actual.join('\n'));
    return 0;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
    process.exitCode = main(process.argv.slice(2));
}
