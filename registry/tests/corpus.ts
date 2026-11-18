import { readFileSync } from 'node:fs';
import { vendoredCorpusPath } from '../scripts/corpus-source.mjs';

// The vendored conformance corpus, read from the JSON file. Cases are never transcribed into a
// test file: the PHP kernel's suite runs the same file, and a second reading is where two runtimes
// start to differ.

export interface GrammarCase {
    input: string;
    segments: string[] | null;
    why?: string;
}

export interface EqualityCase {
    a: string;
    b: string;
    equal: boolean;
    why?: string;
}

export interface HierarchyCase {
    key: string;
    parent?: string | null;
    under?: string;
    isUnder?: boolean;
    why?: string;
}

interface Corpus {
    grammar: GrammarCase[];
    equality: EqualityCase[];
    hierarchy: HierarchyCase[];
}

const corpus = JSON.parse(readFileSync(vendoredCorpusPath, 'utf8')) as Corpus;

/** One section's cases. Throws on a missing or empty section, so a renamed section cannot pass as zero cases. */
export function section<S extends keyof Corpus>(name: S): Corpus[S] {
    const cases = corpus[name];

    if (!Array.isArray(cases) || cases.length === 0) {
        throw new Error(`The corpus has no \`${name}\` cases.`);
    }

    return cases;
}

/** The message a failed expectation carries: the case as written, and the corpus's reason for it. */
export function because(testCase: { why?: string }): string {
    const { why, ...rest } = testCase;

    return `${JSON.stringify(rest)}: ${why ?? 'the corpus gives no reason for this case'}`;
}
