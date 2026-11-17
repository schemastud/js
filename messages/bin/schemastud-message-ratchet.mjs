#!/usr/bin/env node
import { readFileSync, readdirSync, statSync, existsSync, writeFileSync } from 'node:fs';
import { resolve, dirname, relative, extname } from 'node:path';
import { pathToFileURL } from 'node:url';
import ts from 'typescript';

const displayProps = new Set(['title', 'label', 'placeholder', 'description', 'aria-label', 'aria-description', 'alt', 'emptyText', 'emptyMessage', 'loadingText', 'submitText', 'message', 'helperText', 'tooltip', 'header', 'triggerLabel', 'saveLabel', 'savingLabel', 'cancelLabel', 'confirmLabel', 'children', 'heading', 'subtitle', 'text', 'content', 'caption', 'hint', 'emptyState', 'aria-valuetext', 'aria-roledescription', 'aria-placeholder']);
const excluded = /(^|\/)(?:tests?|testing|__tests__|__fixtures__|fixtures|stories|generated|node_modules|vendor|dist|build|coverage|\.git)(\/|$)|\.(?:test|spec|stories|story|d)\.[cm]?[jt]sx?$|(?:story-harness|fixtures)\.[jt]sx?$/;
const sourceExtensions = new Set(['.ts', '.tsx', '.js', '.jsx', '.mts', '.cts', '.mjs', '.cjs']);
const hasCopy = text => /\p{L}/u.test(text);
/**
 * A ProseMirror content expression ('inline*', '(paragraph | heading)+', 'block+ inline*'): lowercase-initial node/group
 * names, spaces, `|`, `()`, `{n,m}` and at least one `*+?` quantifier. Technical in a `content` sink only; a sentence
 * ('Read more?') keeps its capital and still counts.
 */
const contentExpression = text => /[*+?]/.test(text) && /^\s*(?:[a-z_][\w-]*[*+?]?|\(|\)[*+?]?|\||\{\d+(?:,\d*)?\}|\s)+$/.test(text)
    && /^(?:[^*+?]*?(?:[\w)}])[*+?])+[^*+?]*$/.test(text.replace(/\s+/g, ''));

/**
 * The census's version. A baseline records the scanner that measured it; a count rise under a different scanner is a
 * widening to re-measure, never "display copy increased". 2 adds notifier calls, helpers called in a sink, constant
 * lookups, mapped literals and opt-in error classes.
 */
export const SCANNER = 2;
/** Notifier callees whose first argument (and an object argument's `description`) is display copy. `x.*` is any method of x. */
export const DEFAULT_NOTIFIERS = ['toast', 'toast.success', 'toast.error', 'toast.info', 'toast.warning', 'toast.message', 'toast.loading', 'notify', 'notifier.*'];
/** Shapes that reach the screen but this census does not follow. Printed on every PASS and FAIL; mirrored in the README. */
export const UNSCANNED = [
    'a field of an object returned by a helper that is not itself a sink (for example `deploySource().name`)',
    'thrown Error text shown through `error.message`, unless its class is listed in the config\'s `errorClasses`',
    'strings passed to another component\'s non-display prop that the component renders',
    'cross-package imports, and calls more than one hop from the sink',
];

const unwrap = node => {
    while (node && (ts.isParenthesizedExpression(node) || ts.isAsExpression(node) || ts.isSatisfiesExpression(node) || ts.isNonNullExpression(node) || (ts.isTypeAssertionExpression?.(node)))) node = node.expression;
    return node;
};
const nameOf = node => node && (ts.isIdentifier(node) || ts.isStringLiteral(node) || ts.isNumericLiteral(node)) ? node.text : undefined;
const calleeText = (callee, source) => callee.getText(source).replace(/\?\./g, '.').replace(/\s+/g, '');
const matchesCallee = (text, patterns) => patterns.some(pattern => pattern.endsWith('.*') ? text.startsWith(pattern.slice(0, -1)) && text.length > pattern.length - 1 : text === pattern);

/**
 * Static AST census of one file: JSX/display props and defaults, translation parameters, DOM text, dialogs, notifier
 * calls, helpers and constant lookups that feed a sink, mapped literals, and opted-in error classes. `external` lists
 * sink calls to functions imported by relative path (the package scan resolves them one hop).
 */
function scanFile(filename, contents, { notifiers = DEFAULT_NOTIFIERS, errorClasses = [], helpers = new Map() } = {}) {
    const source = ts.createSourceFile(filename, contents, ts.ScriptTarget.Latest, true,
        /\.[jt]sx$/.test(filename) ? ts.ScriptKind.TSX : /\.[cm]?js$/.test(filename) ? ts.ScriptKind.JS : ts.ScriptKind.TS);
    if (source.parseDiagnostics.length) throw new Error('Cannot parse source: ' + filename);
    const findings = new Map();
    const constants = new Map();
    const constDeclared = new Set();
    const assigned = new Set();
    const functions = new Map();
    const imports = new Map();
    const mapCallbacks = new Map();
    const displayedFunctions = new Map();
    const external = [];
    const errorClassSet = new Set(errorClasses);
    let following = true;
    /** The display-prop name of the sink being evaluated; 'content' admits ProseMirror content expressions as technical. */
    let sinkProp = null;
    const inSink = (prop, node) => { const outer = sinkProp; sinkProp = prop; try { display(node); } finally { sinkProp = outer; } };
    function discover(node) {
        if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.initializer) {
            if (constants.has(node.name.text)) assigned.add(node.name.text);
            else {
                constants.set(node.name.text, node.initializer);
                if (ts.isVariableDeclarationList(node.parent) && (node.parent.flags & ts.NodeFlags.Const)) constDeclared.add(node.name.text);
            }
            const init = unwrap(node.initializer);
            if (ts.isArrowFunction(init) || ts.isFunctionExpression(init)) functions.set(node.name.text, init);
        }
        if (ts.isBinaryExpression(node) && node.operatorToken.kind === ts.SyntaxKind.EqualsToken && ts.isIdentifier(node.left)) assigned.add(node.left.text);
        if (ts.isFunctionDeclaration(node) && node.body) {
            if (node.name) functions.set(node.name.text, node);
            if (node.modifiers?.some(m => m.kind === ts.SyntaxKind.DefaultKeyword)) functions.set('default', node);
        }
        if (ts.isImportDeclaration(node) && ts.isStringLiteral(node.moduleSpecifier) && node.moduleSpecifier.text.startsWith('.') && node.importClause && !node.importClause.isTypeOnly) {
            const specifier = node.moduleSpecifier.text;
            if (node.importClause.name) imports.set(node.importClause.name.text, { specifier, name: 'default' });
            const bindings = node.importClause.namedBindings;
            if (bindings && ts.isNamedImports(bindings)) for (const element of bindings.elements) {
                if (!element.isTypeOnly) imports.set(element.name.text, { specifier, name: (element.propertyName ?? element.name).text });
            }
        }
        ts.forEachChild(node, discover);
    }
    discover(source);
    // `ARR.map(cb)` where ARR resolves to a const array literal: the callback's first parameter is bound to its elements.
    function discoverMaps(node) {
        if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression) && node.expression.name.text === 'map') {
            const arrays = valuesOf(node.expression.expression).filter(value => ts.isArrayLiteralExpression(value));
            const callback = unwrap(node.arguments[0]);
            if (arrays.length && callback && (ts.isArrowFunction(callback) || ts.isFunctionExpression(callback))) mapCallbacks.set(callback, arrays);
        }
        ts.forEachChild(node, discoverMaps);
    }
    function add(node, text) {
        if (!hasCopy(text)) return;
        if (sinkProp === 'content' && contentExpression(text)) return;
        const start = node.getStart(source);
        findings.set(start, { file: filename, start, end: node.end, kind: ts.SyntaxKind[node.kind], line: source.getLineAndCharacterOfPosition(start).line + 1, text: text.trim() });
    }
    const isConstLiteral = name => constants.has(name) && constDeclared.has(name) && !assigned.has(name);
    /** The literal nodes an identifier, constant lookup or map-bound parameter can evaluate to; [] when it can't be traced. */
    function valuesOf(node, visited = new Set()) {
        node = unwrap(node);
        if (!node) return [];
        if (ts.isIdentifier(node)) {
            const bound = boundValues(node);
            if (bound) return bound;
            if (isConstLiteral(node.text) && !visited.has(node.text)) {
                const init = unwrap(constants.get(node.text));
                if (ts.isObjectLiteralExpression(init) || ts.isArrayLiteralExpression(init)) return [init];
                if (ts.isIdentifier(init) || ts.isElementAccessExpression(init) || ts.isPropertyAccessExpression(init)) return valuesOf(init, new Set([...visited, node.text]));
            }
            return [];
        }
        if (ts.isElementAccessExpression(node)) {
            return valuesOf(node.expression, visited).flatMap(value => {
                value = unwrap(value);
                if (ts.isArrayLiteralExpression(value)) return value.elements.map(unwrap);
                if (ts.isObjectLiteralExpression(value)) return value.properties.filter(ts.isPropertyAssignment).map(property => unwrap(property.initializer));
                return [];
            });
        }
        if (ts.isPropertyAccessExpression(node)) {
            const name = node.name.text;
            return valuesOf(node.expression, visited).flatMap(value => {
                value = unwrap(value);
                if (!ts.isObjectLiteralExpression(value)) return [];
                const property = value.properties.find(item => ts.isPropertyAssignment(item) && nameOf(item.name) === name);
                return property ? [unwrap(property.initializer)] : [];
            });
        }
        return [];
    }
    /** A map callback's parameter (or a name destructured from it): the matching values of the mapped array's elements. */
    function boundValues(identifier) {
        for (let parent = identifier.parent; parent; parent = parent.parent) {
            if (!ts.isFunctionLike(parent)) continue;
            const declares = parent.parameters?.some(parameter => declaresName(parameter.name, identifier.text));
            if (!declares) continue;
            const arrays = mapCallbacks.get(parent);
            const parameter = parent.parameters?.[0];
            if (!arrays || !parameter || !declaresName(parameter.name, identifier.text)) return undefined;
            const elements = arrays.flatMap(array => array.elements.map(unwrap));
            if (ts.isIdentifier(parameter.name)) return elements;
            if (ts.isObjectBindingPattern(parameter.name)) {
                const element = parameter.name.elements.find(item => ts.isIdentifier(item.name) && item.name.text === identifier.text);
                const key = element && nameOf(element.propertyName ?? element.name);
                return key === undefined ? [] : elements.flatMap(value => {
                    if (!ts.isObjectLiteralExpression(value)) return [];
                    const property = value.properties.find(item => ts.isPropertyAssignment(item) && nameOf(item.name) === key);
                    return property ? [unwrap(property.initializer)] : [];
                });
            }
            if (ts.isArrayBindingPattern(parameter.name)) {
                const index = parameter.name.elements.findIndex(item => ts.isBindingElement(item) && ts.isIdentifier(item.name) && item.name.text === identifier.text);
                return index < 0 ? [] : elements.flatMap(value => ts.isArrayLiteralExpression(value) && value.elements[index] ? [unwrap(value.elements[index])] : []);
            }
            return [];
        }
        return undefined;
    }
    function declaresName(binding, name) {
        if (ts.isIdentifier(binding)) return binding.text === name;
        if (ts.isObjectBindingPattern(binding) || ts.isArrayBindingPattern(binding)) return binding.elements.some(element => ts.isBindingElement(element) && declaresName(element.name, name));
        return false;
    }
    /** Every string in a literal (values, not keys): an untraceable `ARR.map(cb)` counts all of ARR. */
    function displayAll(node) {
        node = unwrap(node);
        if (!node) return;
        if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node) || ts.isTemplateExpression(node)) display(node);
        else if (ts.isArrayLiteralExpression(node)) node.elements.forEach(displayAll);
        else if (ts.isObjectLiteralExpression(node)) node.properties.forEach(property => { if (ts.isPropertyAssignment(property)) displayAll(property.initializer); });
    }
    function display(node, visited = new Set()) {
        if (!node) return;
        if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) add(node, node.text);
        else if (ts.isTemplateExpression(node)) {
            add(node, [node.head.text, ...node.templateSpans.map(span => span.literal.text)].join('…'));
            for (const span of node.templateSpans) display(span.expression, visited);
        }
        else if (ts.isIdentifier(node)) {
            const bound = boundValues(node);
            if (bound) bound.forEach(value => display(value, visited));
            else if (constants.has(node.text) && !assigned.has(node.text) && !visited.has(node.text)) display(constants.get(node.text), new Set([...visited, node.text]));
        } else if (ts.isConditionalExpression(node)) { display(node.whenTrue, visited); display(node.whenFalse, visited); }
        // && renders only its right operand; the left is a condition (often an ID).
        else if (ts.isBinaryExpression(node) && node.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken) display(node.right, visited);
        else if (ts.isBinaryExpression(node) && [ts.SyntaxKind.QuestionQuestionToken, ts.SyntaxKind.BarBarToken, ts.SyntaxKind.PlusToken].includes(node.operatorToken.kind)) {
            display(node.left, visited); display(node.right, visited);
        } else if (ts.isArrayLiteralExpression(node)) { for (const element of node.elements) display(element, visited); }
        else if (ts.isObjectLiteralExpression(node)) {
            for (const property of node.properties) {
                if (ts.isPropertyAssignment(property) && isDisplayProperty(property)) { const outer = sinkProp; sinkProp = nameOf(property.name); try { display(property.initializer, visited); } finally { sinkProp = outer; } }
                else if (ts.isShorthandPropertyAssignment(property) && displayProps.has(property.name.text)) display(property.name, visited);
            }
        }
        // 3. constant lookups: CONST[expr] / CONST.prop (and map-bound parameters) evaluate to their literal values.
        else if (ts.isElementAccessExpression(node) || ts.isPropertyAccessExpression(node)) valuesOf(node).forEach(value => display(value, visited));
        else if (ts.isCallExpression(node) && following) sinkCall(node);
        else if (ts.isParenthesizedExpression(node) || ts.isAsExpression(node) || ts.isSatisfiesExpression(node) || ts.isNonNullExpression(node)) display(node.expression, visited);
    }
    /** A call used as a sink value: a local helper's returns count (2), an imported helper resolves one hop, `ARR.map` (4). */
    function sinkCall(node) {
        const callee = unwrap(node.expression);
        if (ts.isIdentifier(callee)) {
            if (functions.has(callee.text)) (displayedFunctions.get(callee.text) ?? displayedFunctions.set(callee.text, new Set()).get(callee.text)).add(sinkProp);
            else if (imports.has(callee.text)) external.push({ ...imports.get(callee.text), sinkProp });
            return;
        }
        if (ts.isPropertyAccessExpression(callee) && callee.name.text === 'map') {
            const arrays = valuesOf(callee.expression).filter(value => ts.isArrayLiteralExpression(value));
            if (!arrays.length) return;
            const callback = unwrap(node.arguments[0]);
            if (callback && (ts.isArrowFunction(callback) || ts.isFunctionExpression(callback))) {
                if (!ts.isBlock(callback.body)) display(callback.body);
                else forEachReturn(callback, statement => display(statement.expression));
            } else arrays.forEach(displayAll);
        }
    }
    function forEachReturn(fn, callback) {
        (function walk(node) {
            if (node !== fn && ts.isFunctionLike(node)) return;
            if (ts.isReturnStatement(node) && node.expression) callback(node);
            ts.forEachChild(node, walk);
        })(fn);
    }
    function isDisplayProperty(property) {
        const name = nameOf(property.name);
        if (!displayProps.has(name)) return false;
        const object = property.parent;
        if (object && ts.isObjectLiteralExpression(object) && ts.isCallExpression(object.parent)
            && isMessageCall(object.parent.expression) && object.parent.arguments.slice(1).includes(object)
            && richParameterMarker(property.initializer)) return false;
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
    // Rich parameters use a NUL-bounded identifier as a split marker. It is
    // technical only inside a translation argument, never in a JSX/display sink.
    function richParameterMarker(node, visited = new Set()) {
        if (!node) return false;
        if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) return /^\u0000[A-Za-z_][A-Za-z0-9_]*\u0000$/.test(node.text);
        if (ts.isIdentifier(node) && constants.has(node.text) && !assigned.has(node.text) && !visited.has(node.text)) return richParameterMarker(constants.get(node.text), new Set([...visited, node.text]));
        if (ts.isParenthesizedExpression(node) || ts.isAsExpression(node) || ts.isSatisfiesExpression(node) || ts.isNonNullExpression(node)) return richParameterMarker(node.expression, visited);
        return false;
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
                if (ts.isPropertyAssignment(property) && !richParameterMarker(property.initializer)) display(property.initializer);
                else if (ts.isShorthandPropertyAssignment(property) && !richParameterMarker(property.name)) display(property.name);
            }
        } else if (ts.isIdentifier(node) && constants.has(node.text) && !assigned.has(node.text) && !visited.has(node.text)) {
            translationParameters(constants.get(node.text), new Set([...visited, node.text]));
        }
    }
    function visit(node) {
        if (ts.isJsxText(node)) add(node, node.getText(source));
        else if (ts.isJsxAttribute(node) && displayProps.has(node.name.text)) {
            const value = node.initializer;
            inSink(node.name.text, value && ts.isJsxExpression(value) ? value.expression : value);
        } else if (ts.isJsxExpression(node) && node.parent && !ts.isJsxAttribute(node.parent)) display(node.expression);
        else if (ts.isBindingElement(node) && displayProps.has(nameOf(node.propertyName) ?? nameOf(node.name))) display(node.initializer);
        else if (ts.isParameter(node) && displayProps.has(nameOf(node.name))) display(node.initializer);
        else if (ts.isPropertyAssignment(node) && isDisplayProperty(node)) inSink(nameOf(node.name), node.initializer);
        else if (ts.isShorthandPropertyAssignment(node) && displayProps.has(node.name.text)) {
            display(node.name); display(node.objectAssignmentInitializer);
        }
        else if (ts.isReturnStatement(node) && presentationReturn(node)) display(node.expression);
        else if (ts.isArrowFunction(node) && !ts.isBlock(node.body) && presentationReturn(node.body)) display(node.body);
        else if (ts.isBinaryExpression(node) && node.operatorToken.kind === ts.SyntaxKind.EqualsToken
            && ts.isPropertyAccessExpression(node.left)
            && (displayProps.has(node.left.name.text) || ['textContent', 'innerText'].includes(node.left.name.text))) inSink(node.left.name.text, node.right);
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
        // 1. notifier calls: the first argument, and an object argument's string `description`.
        else if (ts.isCallExpression(node) && matchesCallee(calleeText(node.expression, source), notifiers)) {
            display(node.arguments[0]);
            for (const argument of node.arguments.slice(1)) {
                const object = unwrap(argument);
                if (!object || !ts.isObjectLiteralExpression(object)) continue;
                const description = object.properties.find(item => ts.isPropertyAssignment(item) && nameOf(item.name) === 'description');
                if (description) display(description.initializer);
            }
        }
        // 5. opted-in error classes: the constructor's first argument is display copy.
        else if (ts.isNewExpression(node) && ts.isIdentifier(node.expression) && errorClassSet.has(node.expression.text)) display(node.arguments?.[0]);
        ts.forEachChild(node, visit);
    }
    discoverMaps(source);
    visit(source);
    // 2. helpers called in a sink (or by a sink in another file of the package): their returns count, one hop only.
    following = false;
    const called = new Map(displayedFunctions);
    for (const [name, props] of helpers) for (const prop of props) (called.get(name) ?? called.set(name, new Set()).get(name)).add(prop);
    for (const [name, props] of called) {
        const fn = functions.get(name);
        if (!fn) continue;
        const prop = props.size === 1 && props.has('content') ? 'content' : null;
        if (fn.body && !ts.isBlock(fn.body)) inSink(prop, fn.body);
        else forEachReturn(fn, statement => inSink(prop, statement.expression));
    }
    return { findings: [...findings.values()].sort((a, b) => a.line - b.line), external };
}

/** One file's findings (sinks 1–5; an imported helper's returns are counted by the package scan, in its own file). */
export function scanDisplayStrings(filename, contents = readFileSync(filename, 'utf8'), options = {}) {
    return scanFile(filename, contents, options).findings;
}

function resolveImport(from, specifier, files) {
    const base = resolve(dirname(from), specifier);
    const candidates = [base, ...[...sourceExtensions].map(ext => base + ext), ...[...sourceExtensions].map(ext => resolve(base, 'index' + ext))];
    // TS sources import './x.js' for './x.ts'.
    if (/\.[cm]?js$/.test(base)) candidates.push(...['.ts', '.tsx', '.mts', '.cts'].map(ext => base.replace(/\.[cm]?js$/, ext)));
    return candidates.find(candidate => files.has(candidate));
}

export function scanConfig(configPath) {
    const at = resolve(configPath), root = dirname(at);
    const config = JSON.parse(readFileSync(at, 'utf8'));
    if (config.version !== 1 || typeof config.baseline !== 'string' || !config.packages || Array.isArray(config.packages) || typeof config.packages !== 'object' || !Object.keys(config.packages).length) throw new Error('Invalid ratchet config v1');
    for (const key of ['notifiers', 'errorClasses']) {
        if (config[key] !== undefined && (!Array.isArray(config[key]) || config[key].some(value => typeof value !== 'string' || !value))) throw new Error(`Invalid ratchet config v1: ${key} must be a list of names`);
    }
    if (config.notifiers !== undefined && !config.notifiers.length) throw new Error('Invalid ratchet config v1: notifiers must name at least one callee (sink 1 has no off switch)');
    const options = { notifiers: config.notifiers ?? DEFAULT_NOTIFIERS, errorClasses: config.errorClasses ?? [] };
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
        const sorted = [...files].sort();
        // Pass 1 finds sink calls to helpers imported by relative path from this package; pass 2 counts their returns.
        const first = new Map(sorted.map(file => [file, scanFile(file, readFileSync(file, 'utf8'), options)]));
        const helpers = new Map();
        for (const [file, result] of first) for (const call of result.external) {
            const target = resolveImport(file, call.specifier, files);
            if (!target) continue;
            const names = helpers.get(target) ?? helpers.set(target, new Map()).get(target);
            (names.get(call.name) ?? names.set(call.name, new Set()).get(call.name)).add(call.sinkProp);
        }
        findings[name] = sorted.flatMap(file => (helpers.has(file) ? scanFile(file, readFileSync(file, 'utf8'), { ...options, helpers: helpers.get(file) }) : first.get(file)).findings)
            .map(item => ({ ...item, file: relative(root, item.file).replaceAll('\\', '/') }));
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
        || (previous.scanner !== undefined && (!Number.isSafeInteger(previous.scanner) || previous.scanner < 1))
        || Object.values(previous.counts).some(value => !Number.isSafeInteger(value) || value < 0)
        || JSON.stringify(Object.keys(previous.counts).sort()) !== JSON.stringify(Object.keys(result.counts).sort()))) throw new Error('Invalid baseline or package set differs');
    // A baseline without `scanner` was measured by scanner 1.
    const widened = !!previous && (previous.scanner ?? 1) !== SCANNER;
    const increases = previous ? Object.keys(result.counts).filter(name => result.counts[name] > previous.counts[name]) : [];
    const decreases = previous ? Object.keys(result.counts).filter(name => result.counts[name] < previous.counts[name]) : [];
    const report = { ...result, unscanned: UNSCANNED };
    if (widened && !write) {
        console.error(JSON.stringify({ error: `scanner widened: re-measure with --write (baseline scanner ${previous.scanner ?? 1}, scanner ${SCANNER})`, increases, decreases, ...report }, null, 2));
        return 1;
    }
    if (previous && !write && decreases.length && !increases.length) {
        console.error(JSON.stringify({ error: 'stale baseline: run --write to lower counts', decreases, ...report }, null, 2));
        return 1;
    }
    // --write lowers counts, initializes a missing baseline, or re-measures under a widened scanner; it never absorbs new copy.
    if ((!previous && !write) || (increases.length && !widened)) {
        console.error(JSON.stringify({ error: previous ? 'display copy increased' : 'missing baseline', increases, ...report }, null, 2));
        return 1;
    }
    if (write) writeFileSync(result.baseline, JSON.stringify({ version: 1, scanner: SCANNER, counts: result.counts }, null, 2) + '\n');
    console.log(JSON.stringify({ status: 'PASS', baseline: result.baseline, scanner: SCANNER, counts: result.counts, wrote: write, ...(widened && write ? { remeasured: Object.fromEntries(Object.keys(result.counts).map(name => [name, { from: previous.counts[name], to: result.counts[name] }])) } : {}), findings: result.findings, unscanned: UNSCANNED }, null, 2));
    return 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
    try { process.exitCode = runRatchet(process.argv.slice(2)); }
    catch (error) { console.error(error.message); process.exitCode = 1; }
}
