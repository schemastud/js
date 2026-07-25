#!/usr/bin/env node
/**
 * Satellite-conformance token lint (component-seams ticket 33, strand 3).
 *
 * The static half of the ticket-32 conformance gate
 * (.scratch/component-seams/satellite-re-treatment.md §"The conformance gate").
 * Satellite re-treatment is a deployment-root CASCADE: color overrides ride the
 * tier-token vars (`--stud-`/`--beam-`/`--splice-`), structure rides
 * `[data-canvas]`/`[data-density]`. A component that hardcodes color (raw hex) or
 * reaches for the wrong tier's — or a vestigial — var prefix is UN-RE-TREATABLE:
 * the deployment-root cascade can never reach it. This lint fails on presence of
 * such a violation over the package's shipped `src/**`. Its behavioural twin (the
 * var exists but nothing reads it) is the VR bar — this catches only *presence*.
 *
 * Config lives beside this script as `token-lint.config.json`:
 *   { "tier": "stud" | "beam" | "splice",
 *     "deniedVarPrefixes": ["swc", "rbc-hue", ...],   // beyond wrong-tier (auto)
 *     "exclude": ["glob", ...] }                      // added to the defaults
 *
 * Runnable gate, not wired into `build-storybook` (which stays green): while the
 * tokenize/structure strands (33 strands 1/2) are still open every repo is RED by
 * design — that is the point of landing the gate first. Flip it to a hard blocker
 * as the closing act once strands 1/2 land. Exit 1 on any violation, 0 when clean.
 *
 * Usage: node scripts/lint-tokens.mjs [--json]
 * Suppress a known-intentional line with a trailing `token-lint-ignore` comment.
 */
import { fileURLToPath } from 'node:url';
import { dirname, join, relative, sep } from 'node:path';
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = dirname(here);
const jsonOut = process.argv.includes('--json');

const configPath = join(here, 'token-lint.config.json');
if (!existsSync(configPath)) {
    console.error(`token-lint: missing config at ${relative(repoRoot, configPath)}`);
    process.exit(2);
}
const config = JSON.parse(readFileSync(configPath, 'utf8'));

const TIERS = ['stud', 'beam', 'splice'];
const ownTier = config.tier;
if (!TIERS.includes(ownTier)) {
    console.error(`token-lint: config.tier must be one of ${TIERS.join('/')}, got "${ownTier}"`);
    process.exit(2);
}

// Wrong-tier = every vendor tier that isn't ours. Plus the config's explicit
// denials (`swc` is always wrong — vestigial; repo extras like `rbc-hue` name a
// foreign palette that ticket 32 rules as debt migrating to the own tier).
const wrongTiers = TIERS.filter((t) => t !== ownTier);
const deniedPrefixes = [...new Set(['swc', ...wrongTiers, ...(config.deniedVarPrefixes ?? [])])];

const DEFAULT_EXCLUDE = [
    '**/node_modules/**',
    '**/dist/**',
    '**/*.stories.*',
    '**/story-harness*',
    '**/story-fixtures*',
];
const excludeGlobs = [...DEFAULT_EXCLUDE, ...(config.exclude ?? [])];
const excludeRe = excludeGlobs.map(globToRe);

// --- rules -----------------------------------------------------------------
// Longest-first so `#rrggbbaa` wins over `#rrggbb`; `\b` keeps `#123` from
// matching inside `#1234567`.
const HEX_RE = /#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{4}|[0-9a-fA-F]{3})\b/g;
// Any CSS custom-property whose prefix segment we can classify.
const VAR_RE = /--([a-z][a-z0-9]*(?:-[a-z0-9]+)*)-/gi;

function classifyVar(name) {
    // name is the full identifier after `--`, e.g. "swc-ink-45", "rbc-hue-sky".
    for (const p of deniedPrefixes) {
        if (name === p || name.startsWith(p + '-')) {
            if (p === 'swc') return { rule: 'vestigial-prefix', detail: `--${p}-* is retired; migrate to --${ownTier}-*` };
            if (TIERS.includes(p)) return { rule: 'wrong-tier-prefix', detail: `--${p}-* is the ${p} tier; this package is ${ownTier} (own-key indirection — read your own tier)` };
            return { rule: 'foreign-palette', detail: `--${p}-* is un-re-treatable debt; migrate to a --${ownTier}-* token set` };
        }
    }
    return null;
}

const isComment = (line) => {
    const t = line.trimStart();
    return t.startsWith('//') || t.startsWith('*') || t.startsWith('/*') || t.startsWith('<!--');
};

function lintFile(absPath, findings) {
    const rel = relative(repoRoot, absPath);
    const text = readFileSync(absPath, 'utf8');
    const lines = text.split('\n');
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (line.includes('token-lint-ignore')) continue;
        // Raw hex — skip prose/JSDoc lines so `see #0118` etc. don't trip it.
        if (!isComment(line)) {
            for (const m of line.matchAll(HEX_RE)) {
                findings.push({ file: rel, line: i + 1, rule: 'raw-hex', match: m[0], detail: `raw hex is not cascade-reachable; migrate to a --${ownTier}-* token` });
            }
        }
        // Denied var prefixes — anywhere, including inside var() fallbacks.
        for (const m of line.matchAll(VAR_RE)) {
            const hit = classifyVar(m[1]);
            if (hit) findings.push({ file: rel, line: i + 1, rule: hit.rule, match: `--${m[1]}-`, detail: hit.detail });
        }
    }
}

// --- file discovery: every `src/` under the repo (workspace pkgs + single-pkg) --
function srcRoots() {
    const roots = [];
    if (existsSync(join(repoRoot, 'src'))) roots.push(join(repoRoot, 'src'));
    for (const entry of readdirSync(repoRoot, { withFileTypes: true })) {
        if (!entry.isDirectory() || entry.name.startsWith('.') || entry.name === 'node_modules') continue;
        const candidate = join(repoRoot, entry.name, 'src');
        if (existsSync(candidate)) roots.push(candidate);
    }
    return roots;
}

const LINT_EXT = /\.(?:ts|tsx|css)$/;
function walk(dir, out) {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const abs = join(dir, entry.name);
        const relPosix = relative(repoRoot, abs).split(sep).join('/');
        if (excludeRe.some((re) => re.test(relPosix))) continue;
        if (entry.isDirectory()) walk(abs, out);
        else if (entry.isFile() && LINT_EXT.test(entry.name)) out.push(abs);
    }
}

const files = [];
for (const root of srcRoots()) walk(root, files);
files.sort();

const findings = [];
for (const f of files) lintFile(f, findings);

// --- report ----------------------------------------------------------------
if (jsonOut) {
    console.log(JSON.stringify({ tier: ownTier, deniedPrefixes, filesScanned: files.length, findings }, null, 2));
    process.exit(findings.length ? 1 : 0);
}

const byRule = {};
for (const f of findings) byRule[f.rule] = (byRule[f.rule] ?? 0) + 1;

if (findings.length === 0) {
    console.log(`token-lint (${ownTier}): ${files.length} files clean — cascade-reachable ✔`);
    process.exit(0);
}

const byFile = new Map();
for (const f of findings) {
    if (!byFile.has(f.file)) byFile.set(f.file, []);
    byFile.get(f.file).push(f);
}
for (const [file, fs] of byFile) {
    console.log(`\n  ${file}`);
    for (const f of fs) console.log(`    ${f.line}:  [${f.rule}] ${f.match}  — ${f.detail}`);
}
console.log(`\ntoken-lint (${ownTier}): ${findings.length} violations in ${byFile.size}/${files.length} files`);
for (const [rule, n] of Object.entries(byRule).sort((a, b) => b[1] - a[1])) console.log(`  ${rule}: ${n}`);
console.log(`\nEach is un-re-treatable by the deployment-root cascade. Migrate to --${ownTier}-* tokens / data-attributes (ticket 33 strands 1–2), then this gate goes green.`);
process.exit(1);

// --- tiny glob → regexp (supports ** / * / literal) -------------------------
function globToRe(glob) {
    let re = '^';
    for (let i = 0; i < glob.length; i++) {
        const c = glob[i];
        if (c === '*') {
            if (glob[i + 1] === '*') { re += '.*'; i++; if (glob[i + 1] === '/') i++; }
            else re += '[^/]*';
        } else if ('/.+^${}()|[]\\'.includes(c)) re += '\\' + c;
        else re += c;
    }
    return new RegExp(re + '$');
}
