import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';
import { SOURCE_ENV, locateCorpusSource, vendoredCorpusPath } from '../scripts/corpus-source.mjs';

// Compares the vendored corpus with the PHP package's file. It never writes: there is no flag or
// environment variable that makes this test update the copy. `npm run corpus:sync` does that.
// (SOURCE_ENV only says where the PHP file is.)

it('the vendored corpus is the PHP kernel\'s corpus, byte for byte', (context) => {
    const source = locateCorpusSource();

    if (!source.reachable) {
        // A path someone named and got wrong is a failure, not a reason to skip.
        expect(source.named, `${SOURCE_ENV} names a file that does not exist: ${source.path}`).toBe(false);

        context.skip(
            `NOT CHECKED: the PHP package's corpus is not on disk at ${source.path}, so the vendored copy may be stale. ` +
                `Set ${SOURCE_ENV} to its tests/Fixtures/conformance/registry-key.json to check.`,
        );
    }

    const vendored = readFileSync(vendoredCorpusPath);
    const upstream = readFileSync(source.path);

    expect(
        vendored.equals(upstream),
        `corpus/registry-key.json differs from ${source.path}. Run \`npm run corpus:sync -w @schemastud/registry\`, ` +
            'make the cases pass, and commit the copy with the change that makes them pass.',
    ).toBe(true);
});
