// Where the conformance corpus lives, for the sync command and the currency test. Both import this
// file so they cannot disagree about which two files are being compared.

import { existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/** The environment variable that names the PHP package's corpus file when it is not at the default path. */
export const SOURCE_ENV = 'SCHEMASTUD_REGISTRY_CORPUS_SOURCE';

/** The copy this package tests against. */
export const vendoredCorpusPath = resolve(dirname(fileURLToPath(import.meta.url)), '../corpus/registry-key.json');

const defaultSourcePath = join(
    homedir(),
    'Workspaces/php/packages/rushing/php-popcorn/tests/Fixtures/conformance/registry-key.json',
);

/**
 * The PHP package's corpus file and whether it is on disk. `named` is true when the path came from
 * the environment variable: a named path that does not exist is a mistake, while a missing default
 * path only means this checkout is not beside the PHP package.
 *
 * @param {Record<string, string | undefined>} [env]
 * @returns {{ path: string, named: boolean, reachable: boolean }}
 */
export function locateCorpusSource(env = process.env) {
    const fromEnv = env[SOURCE_ENV];
    const named = fromEnv !== undefined && fromEnv !== '';
    const path = named ? resolve(fromEnv) : defaultSourcePath;

    return { path, named, reachable: existsSync(path) };
}
