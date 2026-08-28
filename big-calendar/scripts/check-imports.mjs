#!/usr/bin/env node
/**
 * Static boundary gate (rehome-ui §8b — the deny-list enforcer).
 *
 * The foundation surface is "portable" only if it reaches for NOTHING app-local: no
 * `@/…` path, no direct toast lib (feedback is injected), no transport lib (the client
 * is injected), no named-route resolver, no Inertia, and — because this is the
 * SOURCE-BLIND foundation — no `@splicewire/*` (that would leak product vocabulary into
 * the commodity view engine). Deliberately dependency-free (plain Node, no eslint).
 * Twin of the gate in @splicewire/beam-workflows.
 *
 * ## Why this checks IDENTIFIERS as well as imports
 *
 * ⚠️ For its whole life this gate scanned only `import` lines, and it PASSED — while
 * `types.ts` declared `compositionId: string` as a required top-level field on
 * `FoundationCalendarEvent` and `createRelease()` on `CalendarClient`, in a package whose
 * own header says it "never learns that 'calendar'/'composition'/'channel' exist".
 *
 * Vocabulary does not need an import to leak. It leaks through the type surface, which is
 * the only part of a foundation package a consumer is actually forced to speak. A gate that
 * inspects imports and calls that "source-blind" reports success by not measuring the thing
 * it exists to measure — so it is extended here to the identifiers too.
 *
 * The tell that the field names were already wrong: the satellite's adapter had to write
 * `compositionId: owningCalendarId` and park the real composition in `meta`, with a docblock
 * explaining the discrepancy. A name that needs an apology is the wrong name.
 *
 * PROSE IS EXEMPT. A comment may say "a composition" while explaining what a consumer maps
 * in — that is documentation of the seam, not a crossing of it. Only code lines are scanned
 * for vocabulary, which is why the two deny-lists are separate and applied differently.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const SRC = join(dirname(fileURLToPath(import.meta.url)), '..', 'src');

const FORBIDDEN = [
    { re: /from\s+['"]@\//, why: "app-local '@/…' import" },
    { re: /import\s+['"]@\//, why: "app-local '@/…' side-effect import" },
    { re: /from\s+['"]@splicewire\//, why: 'product vocabulary in the source-blind foundation' },
    { re: /from\s+['"]sonner['"]/, why: 'direct toast lib (feedback is injected, not imported)' },
    { re: /from\s+['"]axios['"]/, why: 'transport lib (the client is injected, not imported)' },
    { re: /from\s+['"]ziggy-js['"]/, why: 'named-route resolution has no place in a portable component' },
    { re: /from\s+['"]@inertiajs\//, why: 'Inertia coupling' },
];

function* walk(dir) {
    for (const name of readdirSync(dir)) {
        const path = join(dir, name);
        if (statSync(path).isDirectory()) yield* walk(path);
        else if (/\.tsx?$/.test(path)) yield path;
    }
}

const violations = [];
/**
 * Product vocabulary that must not appear in the foundation's CODE. These are the nouns of the
 * consumer's domain; the foundation's equivalents are `sourceId`, `laneId`, `event`, `occurrence`.
 *
 * `resource` is deliberately NOT here — react-big-calendar's own lane API is literally called
 * `resources`, so banning it would fail on the vendor's vocabulary rather than on ours.
 */
const FORBIDDEN_VOCAB = [
    { re: /\bcompositionId\b/, why: "product vocabulary 'compositionId' — the foundation's owner axis is `sourceId`" },
    { re: /\bcreateRelease\b/, why: "product vocabulary 'createRelease' — the foundation creates an `event`, not a Release" },
    { re: /\bRelease\b/, why: "product vocabulary 'Release' — the foundation has events and occurrences" },
    { re: /\bcomposition/i, why: 'product vocabulary "composition" in the source-blind foundation' },
    { re: /\bchannelId\b/, why: "product vocabulary 'channelId' — the foundation's lane axis is `laneId`" },
];

/**
 * Strip comments and string literals so the vocabulary scan sees CODE only.
 *
 * Without this the gate would fail on its own explanatory docblocks — and the pressure to make
 * it pass would be to delete the explanation, which is the opposite of what should happen.
 */
function codeOnly(line) {
    const withoutBlockComment = line.replace(/^\s*(\/\*|\*|\/\/).*$/, '');

    return withoutBlockComment
        .replace(/\/\/.*$/, '')
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/'[^']*'/g, "''")
        .replace(/"[^"]*"/g, '""');
}

for (const file of walk(SRC)) {
    const lines = readFileSync(file, 'utf8').split('\n');
    lines.forEach((line, i) => {
        for (const { re, why } of FORBIDDEN) {
            if (re.test(line)) {
                violations.push(`  ${file}:${i + 1} — ${why}\n    ${line.trim()}`);
            }
        }

        const code = codeOnly(line);
        for (const { re, why } of FORBIDDEN_VOCAB) {
            if (re.test(code)) {
                violations.push(`  ${file}:${i + 1} — ${why}\n    ${line.trim()}`);
            }
        }
    });
}

if (violations.length) {
    console.error('✗ boundary check FAILED — @schemastud/big-calendar must stay source-blind + host-agnostic:\n');
    console.error(violations.join('\n'));
    process.exit(1);
}
console.log('✓ boundary check passed — no forbidden imports or product vocabulary in src/.');
