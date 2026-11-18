// Copies the PHP registry kernel's conformance corpus over the vendored copy, byte for byte.
// Run it with `npm run corpus:sync`. This is the only thing that writes the vendored copy: the
// currency test (tests/corpus-currency.test.ts) compares and never writes.

import { copyFileSync, readFileSync } from 'node:fs';
import { SOURCE_ENV, locateCorpusSource, vendoredCorpusPath } from './corpus-source.mjs';

const source = locateCorpusSource();

if (!source.reachable) {
    console.error(`The corpus source is not on disk: ${source.path}`);
    console.error(`Set ${SOURCE_ENV} to the PHP package's tests/Fixtures/conformance/registry-key.json.`);
    process.exit(1);
}

const incoming = readFileSync(source.path);

// Refuse a source that is not JSON, so a bad path cannot replace the corpus with something else.
JSON.parse(incoming.toString('utf8'));

if (incoming.equals(readFileSync(vendoredCorpusPath))) {
    console.log(`Already current with ${source.path}`);
} else {
    copyFileSync(source.path, vendoredCorpusPath);
    console.log(`Synced ${vendoredCorpusPath} from ${source.path}. Run the tests, then commit the copy.`);
}
