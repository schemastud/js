#!/usr/bin/env node
// frame-foundation 66 fix-forward guard (postbuild): the published declarations must be exactly index.d.ts and
// react.d.ts. A module shared by both entries (for example /react importing a type from a root module other than
// ./index) makes the declaration bundler split a hashed chunk that consumers' inferred types cannot name: TS2742 in
// seam and every package built on it.
import { readdirSync } from 'node:fs';

const expected = ['index.d.ts', 'react.d.ts'];
const found = readdirSync(new URL('../dist/', import.meta.url)).filter(name => name.endsWith('.d.ts')).sort();
if (found.join() !== expected.join()) {
    console.error(`messages declarations split: expected ${expected.join(' + ')}, found ${found.join(', ')}. `
        + 'A module shared by the root and /react entries? Keep /react importing types only from ./index.');
    process.exit(1);
}
console.log('messages declarations: ' + found.join(' + '));
