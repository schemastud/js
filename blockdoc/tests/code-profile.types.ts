import type { BlockdocManifest } from '../src/core/types';

// The PHP profile's code capability crosses the wire unchanged.
const hosted: BlockdocManifest = { profile: 'hosted', version: 1, nodes: [], 'x-admits-code': false };
const central: BlockdocManifest = { profile: 'central', version: 1, nodes: [], 'x-admits-code': true };
const legacy: BlockdocManifest = { profile: 'legacy', version: 1, nodes: [] };
// @ts-expect-error A string must never enable code by truthiness.
const invalid: BlockdocManifest = { profile: 'invalid', version: 1, nodes: [], 'x-admits-code': 'false' };
void [hosted, central, legacy, invalid];
