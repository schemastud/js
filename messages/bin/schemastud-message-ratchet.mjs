#!/usr/bin/env node
import { readFileSync, readdirSync, statSync, existsSync, writeFileSync } from 'node:fs';
import { resolve, dirname, relative, extname } from 'node:path';
import { pathToFileURL } from 'node:url';
import ts from 'typescript';

const displayProps = new Set(['title', 'label', 'placeholder', 'description', 'aria-label', 'aria-description', 'alt', 'emptyText', 'emptyMessage', 'loadingText', 'submitText', 'message', 'helperText', 'tooltip', 'header', 'triggerLabel', 'saveLabel', 'savingLabel', 'cancelLabel', 'confirmLabel', 'children', 'heading', 'subtitle', 'text', 'content', 'caption', 'hint', 'emptyState', 'aria-valuetext', 'aria-roledescription', 'aria-placeholder']);
const excluded = /(^|\/)(?:tests?|testing|__tests__|__fixtures__|fixtures|stories|generated|node_modules|vendor|dist|build|coverage|\.git)(\/|$)|\.(?:test|spec|stories|story|d)\.[cm]?[jt]sx?$|(?:story-harness|fixtures)\.[jt]sx?$/;
const sourceExtensions = new Set(['.ts', '.tsx', '.js', '.jsx', '.mts', '.cts', '.mjs', '.cjs']);
const hasCopy = text => /\p{L}/u.test(text);

/** Static AST census: JSX/display props and defaults, not arbitrary English in code. */
export function scanDisplayStrings(filename, contents = readFileSync(filename, 'utf8')) {
    const source = ts.createSourceFile(filename, contents, ts.ScriptTarget.Latest, true,
        /\.[jt]sx$/.test(filename) ? ts.ScriptKind.TSX : /\.[cm]?js$/.test(filename) ? ts.ScriptKind.JS : ts.ScriptKind.TS);
    if (source.parseDiagnostics.length) throw new Error('Cannot parse source: ' + filename);
    const findings = new Map();
    const constants = new Map();
    const assigned = new Set();
    function discover(node) {
        if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.initializer) {
            if (constants.has(node.name.text)) assigned.add(node.name.text);
            else constants.set(node.name.text, node.initializer);
        }
        ts.forEachChild(node, discover);
    }
    discover(source);
    function add(node, text) {
        if (!hasCopy(text)) return;
        const start = node.getStart(source);
        findings.set(start, { file: filename, start, end: node.end, kind: ts.SyntaxKind[node.kind], line: source.getLineAndCharacterOfPosition(start).line + 1, text: text.trim() });
    }
    function display(node, visited = new Set()) {
        if (!node) return;
        if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) add(node, node.text);
        else if (ts.isTemplateExpression(node)) {
            add(node, [node.head.text, ...node.templateSpans.map(span => span.literal.text)].join('…'));
            for (const span of node.templateSpans) display(span.expression, visited);
        }
        else if (ts.isIdentifier(node) && constants.has(node.text) && !assigned.has(node.text) && !visited.has(node.text)) {
            display(constants.get(node.text), new Set([...visited, node.text]));
        } else if (ts.isConditionalExpression(node)) { display(node.whenTrue, visited); display(node.whenFalse, visited); }
        // && renders only its right operand; the left is a condition (often an ID).
        else if (ts.isBinaryExpression(node) && node.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken) display(node.right, visited);
        else if (ts.isBinaryExpression(node) && [ts.SyntaxKind.QuestionQuestionToken, ts.SyntaxKind.BarBarToken, ts.SyntaxKind.PlusToken].includes(node.operatorToken.kind)) {
            display(node.left, visited); display(node.right, visited);
        } else if (ts.isArrayLiteralExpression(node)) { for (const element of node.elements) display(element, visited); }
        else if (ts.isObjectLiteralExpression(node)) {
            for (const property of node.properties) {
                if (ts.isPropertyAssignment(property) && isDisplayProperty(property)) display(property.initializer, visited);
                else if (ts.isShorthandPropertyAssignment(property) && displayProps.has(property.name.text)) display(property.name, visited);
            }
        }
        else if (ts.isParenthesizedExpression(node) || ts.isAsExpression(node) || ts.isSatisfiesExpression(node) || ts.isNonNullExpression(node)) display(node.expression, visited);
    }
    const nameOf = node => node && (ts.isIdentifier(node) || ts.isStringLiteral(node)) ? node.text : undefined;
    function isDisplayProperty(property) {
        const name = nameOf(property.name);
        if (!displayProps.has(name)) return false;
        const object = property.parent;
        if (object && ts.isObjectLiteralExpression(object)) {
            const siblings = new Set(object.properties.map(item => nameOf(item.name)));
            // Process/CLI receipts carry diagnostic messages, not browser display copy.
            if (name === 'message' && siblings.has('exitCode')) return false;
            // Resource reference configuration names the record's label field; it is
            // not a label default. Keep actual option/column labels in the census.
            if (name === 'label' && ['resource', 'value', 'multiple', 'select'].every(key => siblings.has(key))) return false;
        }
        return true;
    }
    const isMessageCall = node => ts.isIdentifier(node) ? ['t', 'choice'].includes(node.text)
        : ts.isPropertyAccessExpression(node) && ['t', 'choice'].includes(node.name.text);
    // Return values are display copy only in formatting/presentation helpers. Ordinary
    // protocol factories, enum selectors and class-name helpers return technical strings.
    function presentationReturn(node) {
        for (let parent = node.parent; parent; parent = parent.parent) {
            if (ts.isFunctionLike(parent)) {
                const name = nameOf(parent.name) ?? (ts.isVariableDeclaration(parent.parent) ? nameOf(parent.parent.name) : undefined);
                return !!name && /^(?:format|render|display|describe|humanize|caption|title|message|label)(?:[A-Z_]|$)/.test(name);
            }
        }
        return false;
    }
    function translationParameters(node, visited = new Set()) {
        if (!node) return;
        if (ts.isObjectLiteralExpression(node)) {
            for (const property of node.properties) {
                if (ts.isPropertyAssignment(property)) display(property.initializer);
                else if (ts.isShorthandPropertyAssignment(property)) display(property.name);
            }
        } else if (ts.isIdentifier(node) && constants.has(node.text) && !assigned.has(node.text) && !visited.has(node.text)) {
            translationParameters(constants.get(node.text), new Set([...visited, node.text]));
        }
    }
    function visit(node) {
        if (ts.isJsxText(node)) add(node, node.getText(source));
        else if (ts.isJsxAttribute(node) && displayProps.has(node.name.text)) {
            const value = node.initializer;
            display(value && ts.isJsxExpression(value) ? value.expression : value);
        } else if (ts.isJsxExpression(node) && node.parent && !ts.isJsxAttribute(node.parent)) display(node.expression);
        else if (ts.isBindingElement(node) && displayProps.has(nameOf(node.propertyName) ?? nameOf(node.name))) display(node.initializer);
        else if (ts.isParameter(node) && displayProps.has(nameOf(node.name))) display(node.initializer);
        else if (ts.isPropertyAssignment(node) && isDisplayProperty(node)) display(node.initializer);
        else if (ts.isShorthandPropertyAssignment(node) && displayProps.has(node.name.text)) {
            display(node.name); display(node.objectAssignmentInitializer);
        }
        else if (ts.isReturnStatement(node) && presentationReturn(node)) display(node.expression);
        else if (ts.isArrowFunction(node) && !ts.isBlock(node.body) && presentationReturn(node.body)) display(node.body);
        else if (ts.isBinaryExpression(node) && node.operatorToken.kind === ts.SyntaxKind.EqualsToken
            && ts.isPropertyAccessExpression(node.left)
            && (displayProps.has(node.left.name.text) || ['textContent', 'innerText'].includes(node.left.name.text))) display(node.right);
        else if (ts.isCallExpression(node) && isMessageCall(node.expression)) {
            for (const argument of node.arguments.slice(1)) translationParameters(argument);
        }
        else if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression)
            && node.expression.name.text === 'setAttribute'
            && node.arguments[0] && ts.isStringLiteral(node.arguments[0])
            && displayProps.has(node.arguments[0].text)) display(node.arguments[1]);
        else if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression)
            && ['confirm', 'alert', 'prompt'].includes(node.expression.name.text)
            && node.expression.expression.getText(source) === 'window') display(node.arguments[0]);
        ts.forEachChild(node, visit);
    }
    visit(source);
    return [...findings.values()].sort((a, b) => a.line - b.line);
}

export function scanConfig(configPath) {
    const at = resolve(configPath), root = dirname(at);
    const config = JSON.parse(readFileSync(at, 'utf8'));
    if (config.version !== 1 || typeof config.baseline !== 'string' || !config.packages || Array.isArray(config.packages) || typeof config.packages !== 'object' || !Object.keys(config.packages).length) throw new Error('Invalid ratchet config v1');
    const baseline = resolve(root, config.baseline);
    if (relative(root, baseline).startsWith('..') || relative(root, baseline) === '') throw new Error('Baseline must be a file within the config directory');
    const counts = {}, findings = {};
    for (const [name, roots] of Object.entries(config.packages)) {
        if (!name || !Array.isArray(roots) || !roots.length || roots.some(value => typeof value !== 'string')) throw new Error('Invalid source roots: ' + name);
        const files = new Set();
        function walk(path) {
            for (const entry of readdirSync(path, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
                const full = resolve(path, entry.name);
                if (excluded.test(relative(root, full).replaceAll('\\', '/')) || entry.isSymbolicLink()) continue;
                if (entry.isDirectory()) walk(full);
                else if (entry.isFile() && sourceExtensions.has(extname(full))) files.add(full);
            }
        }
        for (const path of roots) {
            const full = resolve(root, path);
            if (excluded.test(relative(root, full).replaceAll('\\', '/'))) throw new Error('Excluded source root: ' + full);
            if (!existsSync(full) || !statSync(full).isDirectory()) throw new Error('Missing source root: ' + full);
            walk(full);
        }
        findings[name] = [...files].sort().flatMap(file => scanDisplayStrings(file)).map(item => ({ ...item, file: relative(root, item.file).replaceAll('\\', '/') }));
        counts[name] = findings[name].length;
    }
    return { baseline, counts, findings };
}

export function runRatchet(args) {
    let config; let write = false;
    for (let i = 0; i < args.length; i++) {
        if (args[i] === '--config' && !config && args[i + 1] && !args[i + 1].startsWith('--')) config = args[++i];
        else if (args[i] === '--write' && !write) write = true;
        else throw new Error('usage: schemastud-message-ratchet --config <path> [--write]');
    }
    if (!config) throw new Error('Required --config <path>');
    const result = scanConfig(config);
    const previous = existsSync(result.baseline) ? JSON.parse(readFileSync(result.baseline, 'utf8')) : null;
    if (previous && (previous.version !== 1 || !previous.counts || typeof previous.counts !== 'object' || Array.isArray(previous.counts)
        || Object.values(previous.counts).some(value => !Number.isSafeInteger(value) || value < 0)
        || JSON.stringify(Object.keys(previous.counts).sort()) !== JSON.stringify(Object.keys(result.counts).sort()))) throw new Error('Invalid baseline or package set differs');
    const increases = previous ? Object.keys(result.counts).filter(name => result.counts[name] > previous.counts[name]) : [];
    const decreases = previous ? Object.keys(result.counts).filter(name => result.counts[name] < previous.counts[name]) : [];
    if (previous && !write && decreases.length && !increases.length) {
        console.error(JSON.stringify({ error: 'stale baseline: run --write to lower counts', decreases, ...result }, null, 2));
        return 1;
    }
    if ((!previous && !write) || increases.length) {
        console.error(JSON.stringify({ error: previous ? 'display copy increased' : 'missing baseline', increases, ...result }, null, 2));
        return 1;
    }
    if (write) writeFileSync(result.baseline, JSON.stringify({ version: 1, counts: result.counts }, null, 2) + '\n');
    console.log(JSON.stringify({ status: 'PASS', baseline: result.baseline, counts: result.counts, wrote: write, findings: result.findings }, null, 2));
    return 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
    try { process.exitCode = runRatchet(process.argv.slice(2)); }
    catch (error) { console.error(error.message); process.exitCode = 1; }
}
